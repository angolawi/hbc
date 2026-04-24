import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import { pullAllData, SYNC_KEYS } from '../utils/dataSync';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const realtimeChannelRef = useRef(null);
  const pullInProgressRef = useRef(false);

  const setupRealtimeChannel = (currentUser) => {
    // Teardown any existing channel before creating a new one
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    if (!currentUser) return;

    const channel = supabase
      .channel(`db-changes-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_data',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.key) {
            localStorage.setItem(payload.new.key, JSON.stringify(payload.new.data));
            window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[AuthContext] Realtime channel status:', status);
      });

    realtimeChannelRef.current = channel;
  };

  const triggerPull = async (currentUser) => {
    if (pullInProgressRef.current) return;
    pullInProgressRef.current = true;
    try {
      await pullAllData(currentUser);
    } finally {
      pullInProgressRef.current = false;
    }
  };

  useEffect(() => {
    // 5-second safety timeout to ensure app always unblocks
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setupRealtimeChannel(currentUser);
          triggerPull(currentUser);
        }
        clearTimeout(safetyTimer);
        setLoading(false);
      })
      .catch(err => {
        console.error("Initial session fetch failed:", err);
        clearTimeout(safetyTimer);
        setLoading(false);
      });

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth event:', event);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === 'SIGNED_IN' && currentUser) {
        setupRealtimeChannel(currentUser);
        triggerPull(currentUser);
      }

      if (event === 'SIGNED_OUT') {
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const logout = async () => {
    await supabase.auth.signOut();
    SYNC_KEYS.forEach(key => localStorage.removeItem(key));
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
