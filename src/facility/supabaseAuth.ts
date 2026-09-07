import { createClient, type User } from '@supabase/supabase-js';
import type { IagUser } from './changeControl';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL?.trim() ?? '';
const key = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, experimental: { passkey: true } } }) : null;

export function authReturnUrl(origin: string, base: string, recovery = false): string {
  const target = new URL(base, origin);
  if (recovery) target.searchParams.set('auth', 'reset');
  return target.href;
}

export const usernamePattern = /^[a-z0-9][a-z0-9_.-]{2,31}$/;

export async function signInWithIdentifier(identifier: string, password: string) {
  if (!supabase) throw new Error('Sign-in is not configured yet. Contact your administrator.');
  const value = identifier.trim().toLowerCase();
  if (value.includes('@')) return supabase.auth.signInWithPassword({ email: value, password });
  if (!usernamePattern.test(value)) throw new Error('Enter your email or a username of 3–32 letters, numbers, dots, hyphens or underscores.');
  // Resolve aliases on the server; never expose an anonymous username-to-email directory.
  const { data, error } = await supabase.functions.invoke('username-login', { body: { username: value, password } });
  if (error || !data?.access_token || !data?.refresh_token) throw new Error('Unable to sign in. Check your username and password, or try your email.');
  return supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
}

export function iagUserFromSupabase(user: User): IagUser {
  const role = user.app_metadata?.iag_role === 'admin' ? 'admin' : 'technician';
  return { id: user.id, name: user.user_metadata?.full_name || user.email || user.id, role };
}
