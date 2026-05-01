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
  'simpl_show_arena'
];

const SYNC_HISTORY_KEY = 'simpl_sync_history';

const logSyncEvent = (type, status, details = '') => {
  try {
    const history = JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || '[]');
    const newEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      status,
      details
    };
    const updated = [newEvent, ...history].slice(0, 20);
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('sync-history-updated'));
  } catch (e) {
    console.error('[DataSync] Failed to log sync event:', e);
  }
};

export const getSyncHistory = () => {
  return JSON.parse(localStorage.getItem(SYNC_HISTORY_KEY) || '[]');
};

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

/**
 * Internal helper to update local timestamp for a key
 */
const updateLocalTimestamp = (key, timestamp) => {
  localStorage.setItem(`${key}_timestamp`, timestamp || new Date().toISOString());
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

const activeSyncPromises = {};

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

  if (activeSyncPromises[userIdToFetch]) {
    return activeSyncPromises[userIdToFetch];
  }

  activeSyncPromises[userIdToFetch] = (async () => {
    try {
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'start' } }));

      const { data: cloudData, error } = await withTimeout(
        supabase.from('user_data').select('key, data, updated_at').eq('user_id', userIdToFetch),
        15000,
        'select user_data'
      );

      if (error) throw error;

      const cloudMap = new Map(cloudData.map(item => [item.key, item]));
      
      for (const key of SYNC_KEYS) {
        if (targetUserId) continue; 

        const localVal = localStorage.getItem(key);
        const localTs = localStorage.getItem(`${key}_timestamp`);
        const cloudItem = cloudMap.get(key);

        if (cloudItem) {
          const cloudTs = cloudItem.updated_at;
          const cloudVal = typeof cloudItem.data === 'string' ? cloudItem.data : JSON.stringify(cloudItem.data);
          
          const cloudIsEmpty = !cloudItem.data || (Array.isArray(cloudItem.data) && cloudItem.data.length === 0) || (typeof cloudItem.data === 'object' && Object.keys(cloudItem.data).length === 0);
          const localIsEmpty = !localVal || localVal === '[]' || localVal === '{}' || localVal === 'null' || localVal === '""';

          if (cloudIsEmpty && !localIsEmpty) {
            let parsed;
            try { parsed = JSON.parse(localVal); } catch (e) { parsed = localVal; }
            await pushData(key, parsed, user);
          } else if (!localTs || new Date(cloudTs) > new Date(localTs)) {
            localStorage.setItem(key, cloudVal);
            updateLocalTimestamp(key, cloudTs);
          } else if (new Date(localTs) > new Date(cloudTs)) {
            let parsed;
            try { parsed = JSON.parse(localVal); } catch (e) { parsed = localVal; }
            await pushData(key, parsed, user);
          }
        } else if (localVal !== null) {
          let parsed;
          try { parsed = JSON.parse(localVal); } catch (e) { parsed = localVal; }
          await pushData(key, parsed, user);
        }
      }

      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
      logSyncEvent('Automatic Sync', 'success', `${cloudData.length} items checked${targetUserId ? ' (Mentor Mode)' : ''}`);
      return cloudData;
    } catch (err) {
      console.error('[DataSync] Smart Sync failed:', err.message || err);
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'error' } }));
      logSyncEvent('Automatic Sync', 'error', err.message || 'Unknown error');
      throw err;
    } finally {
      delete activeSyncPromises[userIdToFetch];
    }
  })();

  return activeSyncPromises[userIdToFetch];
};

/**
 * Legacy/Compatibility aliases
 */
export const pushAllLocalData = async (user, targetUserId = null) => smartSync(user, targetUserId);
export const pullAllData = async (user, targetUserId = null) => smartSync(user, targetUserId);
