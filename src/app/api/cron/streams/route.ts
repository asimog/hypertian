import { fail, ok } from '@/lib/http';
import { STREAM_LIVE_CLEANUP_THRESHOLD_MS } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return fail('Unauthorized.', 401);
    }

    const supabase = createAdminClient();
    const staleBefore = new Date(Date.now() - STREAM_LIVE_CLEANUP_THRESHOLD_MS).toISOString();

    // Reset is_live to false for streams that haven't heartbeat in a while
    const { data: updatedStreams, error } = await supabase
      .from('streams')
      .update({ is_live: false })
      .lt('last_heartbeat', staleBefore)
      .eq('is_live', true)
      .select('id');

    if (error) {
      throw error;
    }

    return ok({
      status: 'ok',
      streamsReset: updatedStreams?.length ?? 0,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to clean up streams.', 500);
  }
}