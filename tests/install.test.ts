import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isIOSUserAgent, shouldOfferInstall } from '../src/lib/install';

const base = { standalone: false, dismissed: false, day: 1, canPrompt: true, ios: false };

describe('add to home screen', () => {
  it('offers after the first day, only when it can help', () => {
    expect(shouldOfferInstall(base)).toBe(true);
    expect(shouldOfferInstall({ ...base, day: 0 })).toBe(false);
    expect(shouldOfferInstall({ ...base, standalone: true })).toBe(false);
    expect(shouldOfferInstall({ ...base, dismissed: true })).toBe(false);
    expect(shouldOfferInstall({ ...base, canPrompt: false })).toBe(false);
    expect(shouldOfferInstall({ ...base, canPrompt: false, ios: true })).toBe(true);
  });

  it('spots iPhones and iPads', () => {
    expect(isIOSUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe(true);
    expect(isIOSUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Mobile/15E148 Safari')).toBe(true);
    expect(isIOSUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126 Mobile')).toBe(false);
  });

  it('ships a network-first service worker', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(sw).toMatch(/fetch\(req\)[\s\S]*\.catch\(/);
    expect(sw).toContain("addEventListener('fetch'");
  });
});