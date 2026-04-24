import { describe, expect, it } from 'vitest';

const uploadRoute = await import('../src/app/api/media-jobs/upload/route');
const completeRoute = await import('../src/app/api/media-jobs/complete/route');
const reviewRoute = await import('../src/app/api/media-jobs/review/route');

describe('legacy media job APIs', () => {
  it('rejects media uploads because banners are URL-only', async () => {
    const response = await uploadRoute.POST();
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toContain('HTTPS banner URL');
  });

  it('rejects media upload finalization because files are not stored', async () => {
    const response = await completeRoute.POST();
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toContain('HTTPS banner URL');
  });

  it('rejects legacy media review in favor of banner URL approval', async () => {
    const response = await reviewRoute.POST();
    const json = await response.json();

    expect(response.status).toBe(410);
    expect(json.error).toContain('/api/ads/review');
  });
});
