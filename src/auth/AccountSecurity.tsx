import { useEffect, useState, type FormEvent } from 'react';
import { authReturnUrl, iagUserFromSupabase, supabase, usernamePattern } from '../facility/supabaseAuth';
import { useAuth } from './AuthProvider';

type Passkey = { id: string; friendly_name?: string; created_at: string };
export default function AccountSecurity() {
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const loadPasskeys = async () => {
    if (!supabase) return;
    const { data, error: listError } = await supabase.auth.passkey.list();
    if (!listError) setPasskeys(data ?? []);
  };
  useEffect(() => {
    void loadPasskeys();
    if (supabase) void supabase.rpc('get_my_username').then(({ data }) => { if (typeof data === 'string') setUsername(data); });
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy) return; setBusy(true); setMessage(''); setError('');
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'This action could not be completed. Please try again.'); }
    finally { setBusy(false); }
  };
  const saveUsername = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!supabase) return;
      const normalized = username.trim().toLowerCase();
      if (!usernamePattern.test(normalized)) throw new Error('Use 3–32 letters, numbers, dots, hyphens or underscores.');
      const { error: saveError } = await supabase.rpc('set_my_username', { new_username: normalized });
      if (saveError) throw new Error('Username could not be saved. It may already be taken, or username sign-in may need administrator setup.');
      setUsername(normalized); setMessage('Username saved. You can now use it instead of your email to sign in.');
    });
  };
  return <section className="account-security" aria-label="Account security">
    <strong>Account security</strong><p>{auth.user?.email}</p>
    <p><strong>Application role: {auth.user && iagUserFromSupabase(auth.user).role === 'admin' ? 'Administrator' : 'Technician'}</strong></p>
    <p>{auth.user && iagUserFromSupabase(auth.user).role === 'admin' ? 'Your edits save directly. You can edit the map and approve proposed changes.' : 'Your edits are submitted for administrator review before they change the map.'}</p>
    <button type="button" disabled={busy} onClick={() => void run(async () => { const result = await supabase!.auth.refreshSession(); if (result.error) throw result.error; setMessage('Permissions refreshed from your account.'); })}>Refresh permissions</button>
    <form onSubmit={saveUsername}><label>Sign-in username<input required minLength={3} maxLength={32} autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={event => setUsername(event.target.value)}/></label><button type="submit" disabled={busy}>Save username</button></form>
    <p>Add a passkey to sign in using your device PIN, fingerprint or face recognition. Your device keeps the PIN.</p>
    <button type="button" disabled={busy || typeof PublicKeyCredential === 'undefined'} onClick={() => void run(async () => {
      const result = await supabase!.auth.registerPasskey();
      if (result.error) throw new Error('Passkey setup wasn’t completed. Check that passkeys are enabled for this site, then try again.');
      await loadPasskeys(); setMessage('Passkey added. You can use it on the sign-in page.');
    })}>Add a passkey</button>
    {passkeys.length > 0 && <ul aria-label="Your passkeys">{passkeys.map(key => <li key={key.id}><span>{key.friendly_name || 'Passkey'} · {new Date(key.created_at).toLocaleDateString()}</span><button type="button" disabled={busy} onClick={() => {
      if (!confirm('Remove this passkey? You will need your password or another passkey to sign in.')) return;
      void run(async () => { const { error: deleteError } = await supabase!.auth.passkey.delete({ passkeyId: key.id }); if (deleteError) throw deleteError; await loadPasskeys(); setMessage('Passkey removed.'); });
    }}>Remove passkey</button></li>)}</ul>}
    <button type="button" disabled={busy} onClick={() => void run(async () => {
      if (!auth.user?.email) return;
      const { error: resetError } = await supabase!.auth.resetPasswordForEmail(auth.user.email, { redirectTo: authReturnUrl(location.origin, import.meta.env.BASE_URL, true) });
      if (resetError) throw resetError; setMessage('Check your email for a password reset link.');
    })}>Email a password reset link</button>
    <button type="button" disabled={busy} onClick={() => void run(auth.signOut)}>Sign out</button>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
