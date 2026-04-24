import { supabase } from './supabase';

export const SYNC_KEYS = [
  'simpl_edital', 
  'simpl_ciclo', 
  'simpl_horas_estudadas', 
  'simpl_weeks',
  'simpl_ciclo_history',
  'simpl_cycle_instances',
  'simpl_grid_progress'
];

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
 * Pushes local data to Supabase.
 * @param {string} key 
 * @param {any} data 
 * @param {object} authenticatedUser - Pass user to avoid an extra getSession() call.
 */
export const pushData = async (key, data, authenticatedUser = null) => {
  try {
    console.log(`[DataSync] Pushing key: ${key}`, { dataType: typeof data });
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'start' } }));
    
    let user = authenticatedUser;
    if (!user) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(), 5000, 'getSession()'
      );
      user = session?.user;
    }

    if (!user) {
      console.warn(`[DataSync] No user session for: ${key}`);
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'error' } }));
      return;
    }

    if (data === null) {
      console.log(`[DataSync] Deleting key (null data): ${key}`);
      const { error } = await withTimeout(
        supabase.from('user_data').delete().eq('user_id', user.id).eq('key', key),
        10000,
        `delete(${key})`
      );
      if (error) throw error;
    } else {
      const { error } = await withTimeout(
        supabase
          .from('user_data')
          .upsert(
            { user_id: user.id, key, data, updated_at: new Date().toISOString() },
            { onConflict: ['user_id', 'key'] } // Using array for columns
          ),
        10000,
        `upsert(${key})`
      );
      if (error) throw error;
    }
    
    console.log(`[DataSync] Push OK: ${key}`);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'success' } }));
  } catch (err) {
    console.error(`[DataSync] Push failed for ${key}:`, err.message || err);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'error' } }));
  }
};

/**
 * Pulls all data from Supabase for a given user.
 * @param {object} authenticatedUser - The logged in user object. Pass this to AVOID hanging getSession() calls.
 */
export const pullAllData = async (authenticatedUser = null) => {
  try {
    console.log('[DataSync] Starting pullAllData...');
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'start' } }));

    let user = authenticatedUser;
    if (!user) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(), 5000, 'getSession() in pull'
      );
      user = session?.user;
    }

    if (!user) {
      console.warn('[DataSync] No user for pull.');
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'error' } }));
      return null;
    }

    console.log(`[DataSync] Pulling data for user: ${user.id}`);
    const { data, error } = await withTimeout(
      supabase.from('user_data').select('key, data').eq('user_id', user.id),
      15000,
      'select user_data'
    );

    if (error) {
      console.error('[DataSync] Pull select error:', error);
      throw error;
    }
    if (data) {
      console.log(`[DataSync] Successfully pulled ${data.length} keys.`);
      data.forEach(item => {
        if (SYNC_KEYS.includes(item.key)) {
          // Store strings as-is, stringify objects/others
          const val = typeof item.data === 'string' ? item.data : JSON.stringify(item.data);
          localStorage.setItem(item.key, val);
        }
      });
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
    }
    return data;
  } catch (err) {
    console.error('[DataSync] pullAllData error:', err.message || err);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'error' } }));
  }
  return null;
};

/**
 * Pushes all local localStorage keys to Supabase.
 */
export const pushAllLocalData = async (authenticatedUser = null) => {
  let user = authenticatedUser;
  try {
    if (!user) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(), 5000, 'getSession() in pushAll'
      );
      user = session?.user;
    }
    if (!user) {
      console.warn('[DataSync] No user for pushAll.');
      return;
    }

    console.log('[DataSync] Starting pushAllLocalData...');
    
    for (const key of SYNC_KEYS) {
      const localData = localStorage.getItem(key);
      if (localData !== null) {
        let parsed;
        try {
          parsed = JSON.parse(localData);
        } catch (e) {
          // If it's not JSON, send it as a raw string
          parsed = localData;
        }
        await pushData(key, parsed, user);
      }
    }
    console.log('[DataSync] pushAllLocalData finished.');
  } catch (e) {
    console.error('[DataSync] pushAllLocalData critical error:', e);
  }
};
