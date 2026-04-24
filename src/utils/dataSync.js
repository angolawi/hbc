import { supabase } from './supabase';

const SYNC_KEYS = ['simpl_edital', 'simpl_ciclo', 'simpl_horas_estudadas', 'simpl_weeks'];

/**
 * Pushes local data to Supabase
 * @param {string} key 
 * @param {any} data 
 */
export const pushData = async (key, data) => {
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

  if (error) console.error(`Error pushing ${key}:`, error);
};

/**
 * Pulls all relevant study data from Supabase and populates localStorage
 */
export const pullAllData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('user_data')
    .select('key, data')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error pulling data:', error);
    return;
  }

  if (data) {
    data.forEach(item => {
      if (SYNC_KEYS.includes(item.key)) {
        localStorage.setItem(item.key, JSON.stringify(item.data));
      }
    });
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
