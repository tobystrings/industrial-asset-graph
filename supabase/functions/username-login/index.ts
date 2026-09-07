// This endpoint does not require a session: it creates one after Auth verifies a password.
// Service credentials stay in the Edge Function. Never return the resolved email alone.
const project = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const origins = new Set((Deno.env.get('IAG_AUTH_ORIGINS') || 'https://tobystrings.github.io').split(',').map(x => x.trim()));
const encoder = new TextEncoder();
async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(serviceKey + ':' + value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function rpc(name: string, body: object) {
  const response = await fetch(`${project}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('Authentication service unavailable');
  return response.json();
}
Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Origin': origins.has(origin) ? origin : '', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
  if (!origins.has(origin)) return reply(403, { error: 'Origin not permitted' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not permitted' });
  const invalid = () => reply(400, { error: 'Unable to sign in. Check your credentials.' });
  try {
    if (Number(request.headers.get('content-length') || 0) > 8192) return invalid();
    const raw = await request.text(); if (raw.length > 8192) return invalid();
    const { username, password } = JSON.parse(raw);
    if (typeof username !== 'string' || !/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username) || typeof password !== 'string' || !password || password.length > 1024) return invalid();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const [accountBucket, ipBucket] = await Promise.all([digest('user:' + username), digest('ip:' + ip)]);
    const [accountAllowed, ipAllowed] = await Promise.all([
      rpc('iag_allow_login', { login_bucket: accountBucket, max_attempts: 10 }),
      rpc('iag_allow_login', { login_bucket: ipBucket, max_attempts: 40 }),
    ]);
    if (!accountAllowed || !ipAllowed) return reply(429, { error: 'Too many attempts. Try again later.' });
    const email = await rpc('iag_resolve_username', { login_username: username });
    // Submit an indistinguishable invalid login for unknown aliases; never enumerate email mappings.
    const response = await fetch(`${project}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email || `${crypto.randomUUID()}@invalid.example`, password }) });
    if (!response.ok || !email) return invalid();
    const result = await response.json();
    return reply(200, { access_token: result.access_token, refresh_token: result.refresh_token });
  } catch { return reply(503, { error: 'Sign-in is temporarily unavailable. Please try your email.' }); }
});
