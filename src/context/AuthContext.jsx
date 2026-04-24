import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { pullAllData } from '../utils/dataSync';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 5-second safety timeout to ensure app always unblocks
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        clearTimeout(safetyTimer);
        setLoading(false);
      })
      .catch(err => {
        console.error("Initial session fetch failed:", err);
        clearTimeout(safetyTimer);
        setLoading(false);
      });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Sync data specifically on login
          await pullAllData();

          // Real-time Auto-Sync Subscription
          const channel = supabase
            .channel('db-changes')
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
                  // Signal status for the UI indicator
                  window.dispatchEvent(new CustomEvent('sync-status', { detail: { type: 'pull', status: 'success' } }));
                }
              }
            )
            .subscribe();

          return () => {
             supabase.removeChannel(channel);
          }
        }
      } catch (e) {
        console.error("[AuthContext] Error during auth state change:", e);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = (email, password) => supabase.auth.signUp({ email, password });
  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const logout = () => supabase.auth.signOut();

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
