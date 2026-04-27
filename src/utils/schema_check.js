import { supabase } from './supabase.js';
const check = async () => {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log(data);
};
check();
