import { supabase } from './supabase';

const SYNC_KEYS = [
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
 */
export const pushData = async (key, data) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_data')
      .upsert({ 
        user_id: user.id, 
        key: key, 
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, key' });

    if (error) throw error;
  } catch (err) {
    console.error(`[DataSync] Error pushing ${key}:`, err);
  }
};

/**
 * Pulls all relevant study data from Supabase and populates localStorage
 */
export const pullAllData = async () => {
  try {
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
      return true; // Data was pulled
    }
    return false;
  } catch (e) {
    console.error("[DataSync] Pull All Data failed:", e);
    return false;
  }
};

/**
 * Helper to push multiple keys at once
 */
export const pushAllLocalData = async () => {
  for (const key of SYNC_KEYS) {
    const localData = localStorage.getItem(key);
    if (localData) {
      await pushData(key, JSON.parse(localData));
    }
  }
};
