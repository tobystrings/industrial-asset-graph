import { describe, expect, it } from 'vitest';
import { isWriteAuthorized } from './auth';

describe('development write authorization boundary', () => {
  it('allows local development when no token is configured', () => expect(isWriteAuthorized({}, null)).toBe(true));
  it('requires the exact bearer token when configured', () => {
    expect(isWriteAuthorized({ authorization: 'Bearer secret' }, 'secret')).toBe(true);
    expect(isWriteAuthorized({ authorization: 'Bearer wrong' }, 'secret')).toBe(false);
    expect(isWriteAuthorized({}, 'secret')).toBe(false);
  });
});
