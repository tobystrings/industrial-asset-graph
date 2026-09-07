import { beforeEach, describe, expect, it, vi } from 'vitest';
let handler: (request: Request) => Promise<Response>;
const fetchMock = vi.fn();
beforeEach(async () => {
  vi.resetModules(); fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('Deno', { env: { get: (name: string) => ({ SUPABASE_URL: 'https://synthetic.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', SUPABASE_ANON_KEY: 'synthetic-public' })[name] }, serve: (callback: typeof handler) => { handler = callback; } });
  await import('./index');
});
const request = (body: object, origin = 'https://tobystrings.github.io') => new Request('https://synthetic.supabase.co/functions/v1/username-login', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
describe('private username login endpoint', () => {
  it('rejects disallowed origins and malformed aliases before any lookup', async () => {
    expect((await handler(request({ username: 'valid', password: 'pw' }, 'https://untrusted.example'))).status).toBe(403);
    expect((await handler(request({ username: '../admin', password: 'pw' }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('fails closed when the attempt limit is exhausted', async () => {
    fetchMock.mockResolvedValueOnce(response(false)).mockResolvedValueOnce(response(true));
    expect((await handler(request({ username: 'valid', password: 'pw' }))).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('returns only session tokens after password verification', async () => {
    fetchMock.mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response('person@example.test')).mockResolvedValueOnce(response({ access_token: 'access', refresh_token: 'refresh', user: { email: 'person@example.test' } }));
    const result = await handler(request({ username: 'valid', password: 'private-password' }));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ access_token: 'access', refresh_token: 'refresh' });
    const [url, options] = fetchMock.mock.calls[3];
    expect(url).toContain('/auth/v1/token?grant_type=password');
    expect(JSON.parse(options.body)).toEqual({ email: 'person@example.test', password: 'private-password' });
    expect(options.headers.apikey).toBe('synthetic-public');
  });
  it('does not establish a session for an unknown alias even if the dummy request succeeds', async () => {
    fetchMock.mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response({ access_token: 'access', refresh_token: 'refresh' }));
    const result = await handler(request({ username: 'unknown', password: 'pw' }));
    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ error: 'Unable to sign in. Check your credentials.' });
  });
  it('never returns service failures or resolved addresses to unauthenticated clients', async () => {
    fetchMock.mockRejectedValue(new Error('database credential failure'));
    const result = await handler(request({ username: 'valid', password: 'pw' }));
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('credential');
  });
});
