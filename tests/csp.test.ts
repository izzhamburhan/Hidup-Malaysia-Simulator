import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY as csp } from '../csp';

const directive = (name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

describe('content security policy', () => {
  it('never allows inline or eval scripts', () => {
    const script = directive('script-src');
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(directive('default-src')).toBe("default-src 'self'");
  });

  it('blocks plugins and base-tag tricks', () => {
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'self'");
  });

  it('allows the hosts the game uses: analytics, Firestore and Google sign-in', () => {
    expect(directive('script-src')).toContain('https://static.cloudflareinsights.com');
    expect(directive('script-src')).toContain('https://cloud.umami.is');
    expect(directive('connect-src')).toContain('https://gateway.umami.is');
    expect(directive('connect-src')).toContain('https://*.googleapis.com');
    expect(directive('connect-src')).toContain('https://cloudflareinsights.com');
    expect(directive('frame-src')).toContain('https://*.firebaseapp.com');
    expect(directive('img-src')).toContain('https://*.googleusercontent.com');
  });

  it('uses no wildcard source for scripts', () => {
    expect(directive('script-src')).not.toMatch(/ \*( |$)/);
  });
});
