import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import { pullAllData, smartSync, SYNC_KEYS } from '../utils/dataSync';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isMentor, setIsMentor] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const realtimeChannelRef = useRef(null);
  const menteeRealtimeChannelRef = useRef(null);
  const initializedRef = useRef(false);

  // Busca o perfil completo (incluindo nome e concurso)
  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) setProfile(data);
      return data?.role === 'mentor';
    } catch (e) {
      return localStorage.getItem('is_mentor_dev') === 'true';
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const setupRealtime = (userId) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
    
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
    
    if (currUser) {
      // Evita reinicializações duplicadas para o mesmo usuário
      if (user?.id === currUser.id && initializedRef.current && profile) return;

      // Define o usuário e a sessão imediatamente
      setUser(currUser);
      setSession(currSession);
      
      try {
        const isMentorRole = await fetchProfile(currUser.id);
        setIsMentor(isMentorRole);
        setupRealtime(currUser.id);
        
        // LIBERA A TELA AQUI: O usuário entra no app
        setLoading(false);
        
        // Sincronização pesada em background (não bloqueia a UI)
        pullAllData(currUser).catch(err => console.error("Sync background error:", err));
      } catch (e) {
        console.error("Initialization error:", e);
        setLoading(false);
      }
    } else {
      setUser(null);
      setSession(null);
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
      if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
      if (menteeRealtimeChannelRef.current) supabase.removeChannel(menteeRealtimeChannelRef.current);
    };
  }, []);

  useEffect(() => {
    if (menteeRealtimeChannelRef.current) {
      supabase.removeChannel(menteeRealtimeChannelRef.current);
      menteeRealtimeChannelRef.current = null;
    }

    if (selectedMentee?.id) {
      menteeRealtimeChannelRef.current = supabase
        .channel(`user_data_mentee_${selectedMentee.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${selectedMentee.id}` }, 
        (payload) => {
          if (payload.new && payload.new.key) {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success', isMentee: true } }));
          }
        })
        .subscribe();
    }

    return () => {
      if (menteeRealtimeChannelRef.current) {
        supabase.removeChannel(menteeRealtimeChannelRef.current);
      }
    };
  }, [selectedMentee]);

  const logout = async () => {
    try {
      if (user) await smartSync(user);
      
      // Limpa estados localmente para feedback instantâneo no UI
      setUser(null);
      setSession(null);
      setIsMentor(false);
      setSelectedMentee(null);
      
      await supabase.auth.signOut();
      
      // Limpa dados sensíveis do localStorage
      SYNC_KEYS.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('is_mentor_dev');
      
      // Recarrega para garantir que nenhum cache de memória persista
      window.location.replace('/hbc');
    } catch (e) {
      console.error("Erro ao deslogar:", e);
      window.location.replace('/hbc');
    }
  };

  const value = {
    user,
    session,
    loading,
    isMentor,
    profile,
    refreshProfile,
    setIsMentor: (val) => {
      localStorage.setItem('is_mentor_dev', val);
      setIsMentor(val);
    },
    selectedMentee,
    setSelectedMentee,
    signUp: (email, password) => supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    }),
    login: async (email, password) => {
      const resp = await supabase.auth.signInWithPassword({ email, password });
      if (resp.data?.session) {
        // Inicializa manualmente para não depender apenas do listener
        await initializeUser(resp.data.session);
      }
      return resp;
    },
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
