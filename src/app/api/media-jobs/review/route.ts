import { fail } from '@/lib/http';

export async function POST() {
  return fail('Media upload review is disabled. Banner URL approval lives at /api/ads/review.', 410);
}
