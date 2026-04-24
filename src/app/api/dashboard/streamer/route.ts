import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserByPrivyId, listAdsForStreamer, sortStreamsByBookingPriority } from '@/lib/supabase/queries';
import { StreamRecord } from '@/lib/types';

export async function GET() {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);

    if (!user) {
      return fail('User must be synced before loading dashboard data.', 403);
    }

    const supabase = createAdminClient();
    const [streamsRes, ads] = await Promise.all([
      supabase.from('streams').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      listAdsForStreamer(user.id),
    ]);

    if (streamsRes.error) {
      throw streamsRes.error;
    }

    return ok({
      streams: sortStreamsByBookingPriority((streamsRes.data ?? []) as StreamRecord[]),
      ads,
      mediaJobs: [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load streamer dashboard.', 400);
  }
}
