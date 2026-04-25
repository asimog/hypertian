import { describe, expect, it } from 'vitest';
import { assertHttpsUrl, isFreshHeartbeat, streamPlatformSchema } from '../src/lib/platform';

describe('platform helpers', () => {
  it('supports all v1 livestream platforms', () => {
    expect(['x', 'pump'].map((platform) => streamPlatformSchema.parse(platform))).toEqual([
      'x',
      'pump',
    ]);
    expect(() => streamPlatformSchema.parse('kick')).toThrow();
    expect(() => streamPlatformSchema.parse('twitch')).toThrow();
    expect(() => streamPlatformSchema.parse('youtube')).toThrow();
  });

  it('requires HTTPS banner and stream URLs', () => {
    expect(assertHttpsUrl('https://example.com/banner.png')).toBe('https://example.com/banner.png');
    expect(() => assertHttpsUrl('http://example.com/banner.png')).toThrow('https://');
    expect(() => assertHttpsUrl('not-a-url')).toThrow('valid URL');
  });

  it('treats 30 second heartbeats as fresh', () => {
    const now = Date.now();
    expect(isFreshHeartbeat(new Date(now - 29_000).toISOString(), now)).toBe(true);
    expect(isFreshHeartbeat(new Date(now - 31_000).toISOString(), now)).toBe(false);
  });
});
