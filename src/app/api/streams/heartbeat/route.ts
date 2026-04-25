import { fail, ok } from '@/lib/http';
import { verifyOverlayHeartbeatKey } from '@/lib/overlay-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const schema = z.object({
  streamId: z.string().uuid().or(z.string().min(8)),
  key: z.string().min(32),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (!verifyOverlayHeartbeatKey(body.streamId, body.key)) {
      return fail('Unauthorized.', 401);
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('streams')
      .update({
        is_live: true,
        last_heartbeat: new Date().toISOString(),
        overlay_verified_at: new Date().toISOString(),
      })
      .eq('id', body.streamId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ok({ stream: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to record heartbeat.', 400);
  }
}
