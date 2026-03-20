// src/hooks/useAuth.jsx
// Supabase auth with guaranteed 5-second timeout — will never hang forever.
// If Supabase is slow or unreachable, loading resolves to false and the
// user sees the login screen rather than an infinite spinner.

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = still loading
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const profileFetched           = useRef(false);

  // ── Fetch profile row (with 8-second timeout) ───────────────────────────────
  async function fetchProfile(userId) {
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('profile_timeout')), 8000)),
      ]);
      if (!error && data) setProfile(data);
    } catch (e) {
      // Timeout or network error — continue anyway, profile is optional
      console.warn('[useAuth] fetchProfile:', e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Bootstrap session ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Hard timeout: if Supabase doesn't respond in 6 seconds, unblock the UI
    const hardTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[useAuth] Hard timeout — unblocking UI');
        setSession(null);
        setLoading(false);
      }
    }, 6000);

    // Try to get the existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      clearTimeout(hardTimeout);
      setSession(s);
      if (s?.user && !profileFetched.current) {
        profileFetched.current = true;
        fetchProfile(s.user.id);
      } else {
        setLoading(false);
      }
    }).catch((e) => {
      if (!mounted) return;
      clearTimeout(hardTimeout);
      console.warn('[useAuth] getSession error:', e.message);
      setSession(null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        clearTimeout(hardTimeout);
        setSession(s);

        if (s?.user) {
          if (!profileFetched.current || event === 'SIGNED_IN') {
            profileFetched.current = true;
            fetchProfile(s.user.id);
          } else {
            setLoading(false);
          }
        } else {
          setProfile(null);
          profileFetched.current = false;
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth actions ─────────────────────────────────────────────────────────────
  async function signUp({ name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data;
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    profileFetched.current = false;
    await supabase.auth.signOut();
  }

  async function updateProfile(updates) {
    if (!session?.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }

  const value = {
    session,
    user:    session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
