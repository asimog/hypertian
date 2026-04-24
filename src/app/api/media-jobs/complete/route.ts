import { fail } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  return fail('Media uploads are disabled. Submit an HTTPS banner URL instead.', 410);
}
