import { supabase } from './supabase';

export const SYNC_KEYS = [
  'simpl_edital',
  'simpl_ciclo',
  'simpl_horas_estudadas',
  'simpl_weeks',
  'simpl_ciclo_history',
  'simpl_cycle_instances',
  'simpl_grid_progress',
  'simpl_messages',
  'simpl_hard_mode',
  'simpl_daily_goal',
  'simpl_daily_study_time',
  'simpl_show_arena',
  'simpl_global_stats'
];

/**
 * Keys that are allowed to be empty (e.g. [], {}) in the cloud.
 * This allows intentional clearing of these specific data sets.
 */
const ALLOW_EMPTY_KEYS = [
  'simpl_messages',
  'simpl_ciclo',
  'simpl_ciclo_history',
  'simpl_weeks',
  'simpl_grid_progress',
  'simpl_cycle_instances'
];

const SYNC_HISTORY_KEY = 'simpl_sync_history';

/*
 * Robust logging with configurable retention and deterministic ULID IDs.
 */
const SYNC_HISTORY_MAX = 100; // configurable max entries

// Simple ULID generator (based on timestamp + random chars)
const generateULID = () => {
  const timestamp = Date.now().toString(36).padStart(10, '0');
  const randomness = Math.random().toString(36).substr(2, 12);
  return `${timestamp}${randomness}`;
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('[DataSync] localStorage quota exceeded, falling back to IndexedDB (not implemented).');
      // TODO: implement IndexedDB fallback if needed.
    } else {
      throw e;
    }
  }
};

let logQueue = Promise.resolve();

const logSyncEvent = (type, status, details = '') => {
  // Use a promise queue to prevent race conditions in localStorage reads/writes
  logQueue = logQueue.then(() => {
    try {
      const history = JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || '[]');
      const newEvent = {
        id: generateULID(),
        timestamp: new Date().toISOString(),
        type,
        status,
        details
      };
      const updated = [newEvent, ...history].slice(0, SYNC_HISTORY_MAX);
      safeSetItem(SYNC_HISTORY_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('sync-history-updated'));
    } catch (e) {
      console.error('[DataSync] Failed to log sync event:', e);
    }
  });
  return logQueue;
};

export const getSyncHistory = () => {
  return JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || '[]');
};

/*
 * Helper: Execute a promise with a timeout.
 * Returns the result if it resolves before the timeout, otherwise throws.
 */
const withTimeout = async (task, ms, label) => {
  let timeoutId;
  const timeout = new Promise((_, reject) =>
    timeoutId = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
  );
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/*
 * Helper: Retry a task with exponential backoff.
 * `task` should be a function returning a promise.
 */
const retryWithBackoff = async (task, attempts = 3, baseDelay = 500, label = 'operation') => {
  let attempt = 0;
  while (attempt < attempts) {
    try {
      return await task();
    } catch (e) {
      attempt++;
      if (attempt >= attempts) throw e;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[DataSync] Retry ${attempt}/${attempts} for ${label} after ${delay}ms:`, e.message || e);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

/**
 * Internal helper to update local timestamp for a key
 */
const updateLocalTimestamp = (key, timestamp) => {
  localStorage.setItem(`${key}_timestamp`, timestamp || new Date().toISOString());
};

/**
 * Helper: determines if a value is "empty" (no meaningful user data)
 * Handles scalars (false, 0 are VALID), arrays, objects, and null/undefined
 */
const isValueEmpty = (val) => {
  if (val === null || val === undefined) return true;
  if (typeof val === 'boolean' || typeof val === 'number') return false; // false, 0 are valid
  if (typeof val === 'string' && val.trim() === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && Object.keys(val).length === 0) return true;
  return false;
};

/**
 * Helper: Basic data validation to ensure it's JSON serializable
 */
const validateData = (key, data) => {
  if (data === undefined) return false;
  try {
    JSON.stringify(data);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Helper: Checks if a localStorage value is conceptually empty
 */
const isLocalStorageEmpty = (raw) => {
  if (raw === null || raw === undefined) return true;
  if (raw === '' || raw === '[]' || raw === '{}' || raw === 'null' || raw === '""') return true;
  // Try parsing to check structured emptiness (e.g. '[]', '{}')
  try {
    const parsed = JSON.parse(raw);
    return isValueEmpty(parsed);
  } catch (e) {
    return false; // unparseable but non-null string = has data
  }
};

/**
 * Pushes local data to Supabase.
 * @param {string} key
 * @param {any} data
 * @param {object} authenticatedUser - The acting user session
 * @param {string} targetUserId - Optional ID of a student if acting as mentor
 */
export const pushData = async (key, data, authenticatedUser = null, targetUserId = null) => {
  try {
    const now = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'start' } }));

    let user = authenticatedUser;
    if (!user) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(), 5000, 'getSession()'
      );
      user = session?.user;
    }

    if (!user) {
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'error' } }));
      return;
    }

    // Determine whose data we are modifying
    const userIdToUpdate = targetUserId || user.id;

    // Guard: forbid overwriting with empty data unless it's a deletion (data === null)
    // or a key that is explicitly allowed to be empty (intentional clearing)
    if (data !== null && isValueEmpty(data) && !ALLOW_EMPTY_KEYS.includes(key)) {
      console.warn(`[DataSync] Blocked push of empty data for key: ${key}. Use pushData(key, null) for deletion if intentional.`);
      return;
    }

    if (data === null) {
      const { error } = await withTimeout(
        supabase.from('user_data').delete().eq('user_id', userIdToUpdate).eq('key', key),
        10000,
        `delete(${key})`
      );
      if (error) throw error;
      if (!targetUserId) localStorage.removeItem(`${key}_timestamp`);
    } else {
      const { error } = await withTimeout(
        supabase
          .from('user_data')
          .upsert(
            { user_id: userIdToUpdate, key, data, updated_at: now },
            { onConflict: ['user_id', 'key'] }
          ),
        10000,
        `upsert(${key})`
      );
      if (error) throw error;
      if (!targetUserId) updateLocalTimestamp(key, now);
    }

    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'success' } }));
    logSyncEvent('Individual Push', 'success', `Key: ${key}${targetUserId ? ' (Mentor Mode)' : ''}`);
  } catch (err) {
    console.error(`[DataSync] Push failed for ${key}:`, err.message || err);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'error' } }));
    logSyncEvent('Individual Push', 'error', `${key}: ${err.message || 'Unknown error'}`);
  }
};

/*
 * Concurrency guard: a map of ongoing sync promises per userId.
 * This prevents overlapping syncs for the same user.
 */
const syncLocks = {};

/**
 * Performs a smart merge between local and cloud data
 */
export const smartSync = async (authenticatedUser = null, targetUserId = null) => {
  let user = authenticatedUser;
  if (!user) {
    try {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(), 5000, 'getSession() in smartSync'
      );
      user = session?.user;
    } catch (e) {
      console.error(e);
    }
  }

  if (!user) {
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'error' } }));
    return;
  }

  const userIdToFetch = targetUserId || user.id;

  if (syncLocks[userIdToFetch]) {
    // Return the existing promise to share its result.
    return syncLocks[userIdToFetch];
  }

  syncLocks[userIdToFetch] = (async () => {
    try {
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'start' } }));

      const { data: cloudData, error } = await withTimeout(
        supabase.from('user_data').select('key, data, updated_at').eq('user_id', userIdToFetch),
        15000,
        'select user_data'
      );

      if (error) throw error;

      const cloudMap = new Map(cloudData.map(item => [item.key, item]));

      const syncPromises = SYNC_KEYS.map(async (key) => {
        if (targetUserId) return;

        const localVal = localStorage.getItem(key);
        const localTs = localStorage.getItem(`${key}_timestamp`);
        const cloudItem = cloudMap.get(key);

        if (cloudItem) {
          const cloudTs = cloudItem.updated_at;
          const cloudVal = typeof cloudItem.data === 'string' ? cloudItem.data : JSON.stringify(cloudItem.data);
          
          const cloudIsEmpty = isValueEmpty(cloudItem.data);
          const localIsEmpty = isLocalStorageEmpty(localVal);

          if (cloudIsEmpty && !localIsEmpty) {
            // Cloud is empty, local has data → push local to cloud
            let parsed;
            try { parsed = JSON.parse(localVal); } catch (e) { parsed = localVal; }
            if (validateData(key, parsed)) {
              await pushData(key, parsed, user);
            }
          } else if (!cloudIsEmpty && localIsEmpty) {
            // Local is empty but cloud has data → PROTECT against accidental wipe
            // Unless the key is in ALLOW_EMPTY_KEYS and we have a local timestamp (meaning it was once not empty)
            if (ALLOW_EMPTY_KEYS.includes(key) && localTs) {
               // If local is intentionally empty and newer than cloud, we could push,
               // but for simplicity we prefer cloud if we're not sure.
               // Currently, we'll restore from cloud to be safe.
               localStorage.setItem(key, cloudVal);
               updateLocalTimestamp(key, cloudTs);
            } else {
               localStorage.setItem(key, cloudVal);
               updateLocalTimestamp(key, cloudTs);
            }
          } else if (cloudIsEmpty && localIsEmpty) {
            // Both empty → no-op
          } else if (!localTs || new Date(cloudTs) > new Date(localTs)) {
            // Cloud is newer → download
            localStorage.setItem(key, cloudVal);
            updateLocalTimestamp(key, cloudTs);
          } else if (new Date(localTs) > new Date(cloudTs)) {
            // Local is newer → push
            if (!localIsEmpty || ALLOW_EMPTY_KEYS.includes(key)) {
              let parsed;
              try { parsed = JSON.parse(localVal); } catch (e) { parsed = localVal; }
              if (validateData(key, parsed)) {
                await pushData(key, parsed, user);
              }
            } else {
              // Local empty but newer timestamp – prefer cloud to avoid accidental wipe of protected keys
              localStorage.setItem(key, cloudVal);
              updateLocalTimestamp(key, cloudTs);
            }
          }
        } else if (localVal !== null && !isLocalStorageEmpty(localVal)) {
          // No cloud record, local has non-empty data → push
          let parsed;
          try { parsed = JSON.parse(localVal); } catch (e) { parsed = localVal; }
          if (validateData(key, parsed) && !isValueEmpty(parsed)) {
            await pushData(key, parsed, user);
          }
        }
      });

      await Promise.allSettled(syncPromises);

      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
      logSyncEvent('Automatic Sync', 'success', `${cloudData.length} items checked${targetUserId ? ' (Mentor Mode)' : ''}`);
      return cloudData;
    } catch (err) {
      console.error('[DataSync] Smart Sync failed:', err.message || err);
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'error' } }));
      logSyncEvent('Automatic Sync', 'error', err.message || 'Unknown error');
      throw err;
    } finally {
      delete syncLocks[userIdToFetch];
    }
  })();

  return syncLocks[userIdToFetch];
};

/**
 * Legacy/Compatibility aliases
 */
export const pushAllLocalData = async (user, targetUserId = null) => smartSync(user, targetUserId);
export const pullAllData = async (user, targetUserId = null) => smartSync(user, targetUserId);
