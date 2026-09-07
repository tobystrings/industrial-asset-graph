import { createClient, type User } from '@supabase/supabase-js';
import type { IagUser } from './changeControl';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL?.trim() ?? '';
const key = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

export function iagUserFromSupabase(user: User): IagUser {
  const role = user.app_metadata?.iag_role === 'admin' ? 'admin' : 'technician';
  return { id: user.id, name: user.user_metadata?.full_name || user.email || user.id, role };
}
