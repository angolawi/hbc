import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import { pullAllData, smartSync, SYNC_KEYS } from '../utils/dataSync';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const realtimeChannelRef = useRef(null);
  const initializedRef = useRef(false);

  // Busca o papel do mentor de forma isolada
  const fetchRole = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      return data?.role === 'mentor';
    } catch (e) {
      return localStorage.getItem('is_mentor_dev') === 'true';
    }
  };

  const setupRealtime = (userId) => {
    if (realtimeChannelRef.current) realtimeChannelRef.current.unsubscribe();
    
    realtimeChannelRef.current = supabase
      .channel(`user_data_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` }, 
      (payload) => {
        if (payload.new && payload.new.key) {
          localStorage.setItem(payload.new.key, JSON.stringify(payload.new.data));
          window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
        }
      })
      .subscribe();
  };

  const initializeUser = async (currSession) => {
    const currUser = currSession?.user ?? null;
    setUser(currUser);
    setSession(currSession);

    if (currUser) {
      try {
        const isMentorRole = await fetchRole(currUser.id);
        setIsMentor(isMentorRole);
        setupRealtime(currUser.id);
        await pullAllData(currUser);
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      initializeUser(s);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN') {
        initializeUser(s);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setIsMentor(false);
        setSelectedMentee(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannelRef.current) realtimeChannelRef.current.unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (user) await smartSync(user);
    await supabase.auth.signOut();
    SYNC_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('is_mentor_dev');
    window.location.href = '/'; // Garante limpeza total
  };

  const value = {
    user,
    session,
    loading,
    isMentor,
    setIsMentor: (val) => {
      localStorage.setItem('is_mentor_dev', val);
      setIsMentor(val);
    },
    selectedMentee,
    setSelectedMentee,
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
