import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { createStream, getUserByPrivyId } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  platform: z.enum(['x', 'youtube', 'twitch', 'pump']),
});

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const body = schema.parse(await request.json());
    const user = await getUserByPrivyId(claims.user_id);
    if (!user) {
      return fail('User must be synced before creating a stream.', 403);
    }

    const stream = await createStream({
      userId: user.id,
      platform: body.platform,
    });

    return ok({ stream });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create stream.', 400);
  }
}
