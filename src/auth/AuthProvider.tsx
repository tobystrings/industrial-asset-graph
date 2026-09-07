import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../facility/supabaseAuth';

type AuthState = { user: User | null; ready: boolean; recovery: boolean; error: string; finishRecovery(): void; signOut(): Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
const recoveryKey = 'iag-password-recovery';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(() => new URLSearchParams(location.search).get('auth') === 'reset' || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery' || sessionStorage.getItem(recoveryKey) === 'true');
  const generation = useRef(0);
  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let alive = true;
    let verifiedId: string | null = null;
    const validate = async () => {
      const version = ++generation.current;
      try {
        const { data: sessionData, error: sessionError } = await supabase!.auth.getSession();
        if (sessionError) throw sessionError;
        // A routine refresh for the same account must not unmount unfinished forms.
        // A different account must pass server verification before its workspace mounts.
        if (alive && version === generation.current && sessionData.session?.user.id !== verifiedId) { setReady(false); setUser(null); }
        const result = sessionData.session ? await supabase!.auth.getUser() : null;
        if (alive && version === generation.current) {
          const verifiedUser = result?.error ? null : result?.data.user ?? null;
          verifiedId = verifiedUser?.id ?? null;
          setUser(verifiedUser);
          setError(result?.error ? 'Your session could not be verified. Please sign in again.' : '');
        }
      } catch { if (alive && version === generation.current) { verifiedId = null; setUser(null); setError('Unable to verify your session. Check your connection and try again.'); } }
      finally { if (alive && version === generation.current) setReady(true); }
    };
    // Never await another Auth method inside this callback: it holds the SDK lock.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (!alive) return;
      if (event === 'PASSWORD_RECOVERY') { sessionStorage.setItem(recoveryKey, 'true'); setRecovery(true); }
      if (event === 'SIGNED_OUT') { ++generation.current; verifiedId = null; setUser(null); setReady(true); return; }
      if (event !== 'INITIAL_SESSION') window.setTimeout(() => { if (alive) void validate(); }, 0);
    });
    void validate();
    return () => { alive = false; ++generation.current; data.subscription.unsubscribe(); };
  }, []);
  const finishRecovery = () => {
    sessionStorage.removeItem(recoveryKey); setRecovery(false);
    const target = new URL(location.href); target.searchParams.delete('auth'); target.hash = '';
    history.replaceState(null, '', target.pathname + target.search);
  };
  return <AuthContext.Provider value={{ user, ready, recovery, error, finishRecovery, async signOut() {
    if (supabase) { const { error: logoutError } = await supabase.auth.signOut({ scope: 'local' }); if (logoutError) throw logoutError; }
    ++generation.current; setUser(null); setError(''); finishRecovery();
    localStorage.removeItem('iag-change-control-user');
  } }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Authentication provider is required.');
  return context;
}
