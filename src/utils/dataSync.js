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

/**
 * Pushes local data to Supabase
 * @param {string} key 
 * @param {any} data 
 * @param {object} authenticatedUser - Optional user to avoid getUser call
 */
export const pushData = async (key, data, authenticatedUser = null) => {
  try {
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'start' } }));
    
    let user = authenticatedUser;
    if (!user) {
      const { data: { user: fetchedUser } } = await supabase.auth.getUser();
      user = fetchedUser;
    }

    if (!user) {
      console.warn(`[DataSync] No user found, skipping push for ${key}`);
      return;
    }

    const { error } = await supabase
      .from('user_data')
      .upsert({ 
        user_id: user.id, 
        key: key, 
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'key'] });

    if (error) {
      console.error(`[DataSync] Supabase Error pushing ${key}:`, error);
      throw error;
    }
    
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'success' } }));
  } catch (err) {
    console.error(`[DataSync] Unexpected Error pushing ${key}:`, err);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'push', status: 'error' } }));
  }
};

/**
 * Pulls all relevant study data from Supabase and populates localStorage
 */
export const pullAllData = async () => {
  try {
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'start' } }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_data')
      .select('key, data')
      .eq('user_id', user.id);

    if (error) throw error;

    if (data && data.length > 0) {
      data.forEach(item => {
        if (SYNC_KEYS.includes(item.key)) {
          // Robustly handle data types
          const value = typeof item.data === 'string' ? item.data : JSON.stringify(item.data);
          localStorage.setItem(item.key, value);
        }
      });
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
      return true; // Data was pulled
    }
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
    return false;
  } catch (e) {
    console.error("[DataSync] Pull All Data failed:", e);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'error' } }));
    return false;
  }
};

/**
 * Helper to push multiple keys at once
 */
export const pushAllLocalData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const key of SYNC_KEYS) {
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        await pushData(key, JSON.parse(localData), user);
      } catch (e) {
        console.error(`[DataSync] Failed to push ${key} during pushAll:`, e);
      }
    }
  }
};
