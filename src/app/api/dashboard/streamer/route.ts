import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserByPrivyId } from '@/lib/supabase/queries';

export async function GET() {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);

    if (!user) {
      return fail('User must be synced before loading dashboard data.', 403);
    }

    const supabase = createAdminClient();
    const [streamsRes, adsRes, mediaJobsRes] = await Promise.all([
      supabase.from('streams').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase
        .from('ads')
        .select('*')
        .in(
          'stream_id',
          (
            await supabase.from('streams').select('id').eq('user_id', user.id)
          ).data?.map((stream) => stream.id) ?? [],
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('media_jobs')
        .select('*, ads!inner(stream_id, streams!inner(user_id))')
        .eq('ads.streams.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (streamsRes.error) {
      throw streamsRes.error;
    }
    if (adsRes.error) {
      throw adsRes.error;
    }
    if (mediaJobsRes.error) {
      throw mediaJobsRes.error;
    }

    return ok({
      streams: streamsRes.data ?? [],
      ads: adsRes.data ?? [],
      mediaJobs: (mediaJobsRes.data ?? []).map(({ ads, ...job }) => job),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load streamer dashboard.', 400);
  }
}
