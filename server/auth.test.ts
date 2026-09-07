import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { authenticateRequest, isWriteAuthorized, principalFromClaims } from './auth';

describe('development write authorization boundary', () => {
  it('allows local development when no token is configured', () => expect(isWriteAuthorized({}, null)).toBe(true));
  it('requires the exact bearer token when configured', () => {
    expect(isWriteAuthorized({ authorization: 'Bearer secret' }, 'secret')).toBe(true);
    expect(isWriteAuthorized({ authorization: 'Bearer wrong' }, 'secret')).toBe(false);
    expect(isWriteAuthorized({}, 'secret')).toBe(false);
  });
});

describe('Supabase claim mapping', () => {
  it('defaults authenticated users to technician', () => {
    expect(principalFromClaims({ sub: 'user-1', aud: 'authenticated', email: 'tech@example.com' })).toEqual({
      id: 'user-1', email: 'tech@example.com', role: 'technician',
    });
  });

  it('accepts admin only from server-controlled app metadata', () => {
    expect(principalFromClaims({ sub: 'user-2', aud: 'authenticated', app_metadata: { iag_role: 'admin' } })).toEqual({
      id: 'user-2', role: 'admin',
    });
  });

  it('rejects claims without the authenticated audience or subject', () => {
    expect(principalFromClaims({ sub: 'user-3', aud: 'anon' })).toBeNull();
    expect(principalFromClaims({ aud: 'authenticated' })).toBeNull();
  });
});

describe('Supabase JWT verification', () => {
  const secret = 'test-only-supabase-jwt-secret-that-is-long-enough';
  const projectUrl = 'https://example.supabase.co';

  it('authenticates a correctly signed HS256 session token', async () => {
    const token = await new SignJWT({ email: 'tech@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${projectUrl}/auth/v1`)
      .setAudience('authenticated')
      .setSubject('user-4')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret));
    await expect(authenticateRequest({ authorization: `Bearer ${token}` }, null, secret, projectUrl)).resolves.toEqual({
      id: 'user-4', email: 'tech@example.com', role: 'technician',
    });
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(`${projectUrl}/auth/v1`)
      .setAudience('authenticated')
      .setSubject('user-5')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('wrong-secret-that-is-also-long-enough'));
    await expect(authenticateRequest({ authorization: `Bearer ${token}` }, null, secret, projectUrl)).resolves.toBeNull();
  });
});
