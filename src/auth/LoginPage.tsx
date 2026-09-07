import { useState, type FormEvent, type ReactNode } from 'react';
import { authReturnUrl, signInWithIdentifier, supabase, supabaseEnabled } from '../facility/supabaseAuth';
import { useAuth } from './AuthProvider';
import './auth.css';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <main className="auth-loading" role="status">Checking your session…</main>;
  if (!auth.user || auth.recovery) return <LoginPage />;
  return children;
}

export default function LoginPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const reset = auth.recovery && Boolean(auth.user);
  const forgot = mode === 'forgot' || (auth.recovery && !auth.user);
  const passkeysSupported = typeof PublicKeyCredential !== 'undefined' && window.isSecureContext;
  const changeMode = (next: 'login' | 'forgot') => { setMode(next); setError(''); setMessage(''); setPassword(''); setConfirm(''); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (reset) {
        if (password !== confirm) throw new Error('The passwords do not match.');
        if (password.length < 12) throw new Error('Use at least 12 characters for your new password.');
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setPassword(''); setConfirm(''); auth.finishRecovery();
      } else if (forgot) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: authReturnUrl(location.origin, import.meta.env.BASE_URL, true) });
        if (resetError) throw resetError;
        setMessage('If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder.');
      } else {
        const { error: loginError } = await signInWithIdentifier(identifier, password);
        if (loginError) throw new Error('Unable to sign in. Check your username or email and password.');
        setPassword('');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };
  const passkey = async () => {
    if (!supabase || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: passkeyError } = await supabase.auth.signInWithPasskey();
      if (passkeyError) throw passkeyError;
    } catch { setError('Passkey sign-in wasn’t completed. Try again, or use your password. You can add a passkey in Account security after signing in.'); }
    finally { setBusy(false); }
  };
  return <main className="auth-page">
    <section className="auth-story" aria-label="Industrial Asset Graph">
      <a className="auth-brand" href={import.meta.env.BASE_URL}><span className="auth-brand-mark" aria-hidden="true">↗</span><span>INDUSTRIAL<br/>ASSET GRAPH</span></a>
      <div className="auth-story-copy"><span className="auth-eyebrow">KNOW YOUR EQUIPMENT</span><h1>Every asset.<br/>Every connection.<br/><em>One clear picture.</em></h1><p>Your equipment, documentation and field knowledge, connected in one workspace.</p></div>
      <div className="auth-network" aria-hidden="true"><span>ASSETS</span><i/><span>EVIDENCE</span><i/><span>KNOWLEDGE</span></div>
      <p className="auth-story-footer">Built for the people who keep things running.</p>
    </section>
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-card">
        <span className="auth-eyebrow">YOUR WORKSPACE STARTS HERE</span>
        <h2 id="auth-title">{reset ? 'Set a new password' : forgot ? 'Forgot your password?' : 'Welcome back'}</h2>
        <p className="auth-intro">{reset ? 'Choose a strong password you haven’t used here before.' : forgot ? 'Enter your account email and we’ll send you a reset link.' : 'Sign in to Industrial Asset Graph.'}</p>
        {!supabaseEnabled && <p className="auth-message auth-error" role="alert">Sign-in is being configured. Please contact your administrator to enable access.</p>}
        {auth.recovery && !auth.user && <p className="auth-message" role="status">Open a valid reset link from your email to choose a new password. You can request another link below.</p>}
        <form onSubmit={submit} aria-label={reset ? 'New password' : forgot ? 'Password recovery' : 'Sign in'}>
          {!reset && <label htmlFor="auth-identifier">{forgot ? 'Email address' : 'Username or email'}<input id="auth-identifier" type={forgot ? 'email' : 'text'} autoComplete={forgot ? 'email' : 'username webauthn'} autoCapitalize="none" spellCheck={false} required maxLength={254} value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder={forgot ? 'you@company.com' : 'Your username or email'} disabled={busy}/></label>}
          {!forgot && <><label htmlFor="auth-password">{reset ? 'New password' : 'Password'}<div className="auth-password"><input id="auth-password" aria-label={reset ? "New password" : "Password"} type={show ? 'text' : 'password'} autoComplete={reset ? 'new-password' : 'current-password'} minLength={reset ? 12 : undefined} maxLength={1024} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/><button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>{reset && <label htmlFor="auth-confirm">Confirm new password<input id="auth-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={12} maxLength={1024} value={confirm} onChange={event => setConfirm(event.target.value)} disabled={busy}/></label>}</>}
          {!reset && !forgot && <button type="button" className="auth-link auth-forgot" disabled={busy} onClick={() => changeMode('forgot')}>Forgot password?</button>}
          {(error || auth.error) && <p className="auth-message auth-error" role="alert">{error || auth.error}</p>}
          {message && <p className="auth-message auth-success" role="status">{message}</p>}
          <button className="auth-primary" type="submit" disabled={busy || !supabaseEnabled}>{busy ? 'Please wait…' : reset ? 'Save new password' : forgot ? 'Send reset link' : 'Sign in'}<span aria-hidden="true">→</span></button>
        </form>
        {!forgot && !reset && <><div className="auth-divider"><span>or</span></div><button className="auth-passkey" type="button" onClick={() => void passkey()} disabled={busy || !supabaseEnabled || !passkeysSupported}><span aria-hidden="true">◇</span> Use a passkey</button><p className="auth-hint">{passkeysSupported ? 'Use your device PIN, fingerprint or face recognition.' : 'Passkeys require a supported browser and a secure connection.'}</p><p className="auth-help">Need an account? Contact your administrator.</p></>}
        {(forgot || reset) && <button className="auth-link auth-back" type="button" disabled={busy} onClick={async () => { try { if (auth.recovery) await auth.signOut(); changeMode('login'); } catch { setError('Unable to sign out. Please try again.'); } }}>← Back to sign in</button>}
        <p className="auth-footer">Industrial Asset Graph · Equipment knowledge, connected.</p>
      </div>
    </section>
  </main>;
}
