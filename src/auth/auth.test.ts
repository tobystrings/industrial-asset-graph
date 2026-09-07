import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ password: vi.fn(), invoke: vi.fn(), setSession: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { signInWithPassword: mocks.password, setSession: mocks.setSession }, functions: { invoke: mocks.invoke } }) }));
vi.stubEnv('VITE_SUPABASE_URL', 'https://synthetic.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'synthetic-public-key');
const { authReturnUrl, iagUserFromSupabase, signInWithIdentifier } = await import('../facility/supabaseAuth');

describe('account authentication boundaries', () => {
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => vi.clearAllMocks());
  it('keeps reset callbacks on the project path without copying access tokens', () => {
    expect(authReturnUrl('https://tobystrings.github.io', '/industrial-asset-graph/', true)).toBe('https://tobystrings.github.io/industrial-asset-graph/?auth=reset');
    expect(authReturnUrl('http://localhost:5173', '/industrial-asset-graph/')).toBe('http://localhost:5173/industrial-asset-graph/');
  });
  it('does not promote a user based on editable profile metadata', () => {
    const user = { id: 'user', email: 'user@example.test', app_metadata: {}, user_metadata: { iag_role: 'admin', role: 'admin' } } as User;
    expect(iagUserFromSupabase(user).role).toBe('technician');
    expect(iagUserFromSupabase({ ...user, app_metadata: { iag_role: 'admin' } }).role).toBe('admin');
  });
  it('normalizes identifiers but preserves the password exactly', async () => {
    await signInWithIdentifier(' Person@Example.test ', ' Password with spaces ');
    expect(mocks.password).toHaveBeenCalledWith({ email: 'person@example.test', password: ' Password with spaces ' });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('accepts a username session only after the server returns both tokens', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { access_token: 'access', refresh_token: 'refresh' }, error: null });
    await signInWithIdentifier(' Plant.Tech ', 'password');
    expect(mocks.invoke).toHaveBeenCalledWith('username-login', { body: { username: 'plant.tech', password: 'password' } });
    expect(mocks.setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
  });
  it('does not establish sessions on failed or incomplete alias lookups', async () => {
    mocks.invoke.mockResolvedValue({ data: { access_token: 'partial' }, error: null });
    await expect(signInWithIdentifier('username', 'password')).rejects.toThrow('Unable to sign in');
    expect(mocks.setSession).not.toHaveBeenCalled();
  });
  it('rejects malformed usernames before contacting the server', async () => {
    await expect(signInWithIdentifier('../admin', 'password')).rejects.toThrow('Enter your email');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('fails closed when deployment authentication configuration is missing', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const unconfigured = await import('../facility/supabaseAuth');
    expect(unconfigured.supabaseEnabled).toBe(false);
    await expect(unconfigured.signInWithIdentifier('user@example.test', 'password')).rejects.toThrow('Sign-in is not configured');
    expect(mocks.password).not.toHaveBeenCalled();
  });
});
