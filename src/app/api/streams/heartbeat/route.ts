import { fail, ok } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { requirePrivyUser } from '@/lib/privy';
import { getUserByPrivyId } from '@/lib/supabase/queries';

const schema = z.object({
  streamId: z.string().uuid().or(z.string().min(8)),
});

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);
    if (!user) {
      return fail('User must be synced before updating stream status.', 403);
    }

    const body = schema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('streams')
      .update({
        is_live: true,
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', body.streamId)
      .eq('user_id', user.id)
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
