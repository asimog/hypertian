import { fail, ok } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { requirePrivyUser } from '@/lib/privy';
import { getUserByPrivyId } from '@/lib/supabase/queries';

const schema = z.object({
  mediaJobId: z.string().uuid().or(z.string().min(1)),
  decision: z.enum(['approved', 'rejected']),
});

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);

    if (!user) {
      return fail('User must be synced before reviewing media.', 403);
    }

    const body = schema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: mediaJob, error: fetchError } = await supabase
      .from('media_jobs')
      .select('*, ads!inner(stream_id, streams!inner(user_id))')
      .eq('id', body.mediaJobId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (mediaJob.ads?.streams?.user_id !== user.id) {
      return fail('You are not authorized to review this media job.', 403);
    }

    if (body.decision === 'approved' && typeof mediaJob.media_path === 'string' && mediaJob.media_path.startsWith('pending/')) {
      const approvedPath = mediaJob.media_path.replace(/^pending\//, 'approved/');
      await supabase.storage.from('ad-media').move(mediaJob.media_path, approvedPath);
      mediaJob.media_path = approvedPath;
    }

    const { data, error } = await supabase
      .from('media_jobs')
      .update({
        status: body.decision,
        media_path: mediaJob.media_path,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', body.mediaJobId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ok({ mediaJob: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to review media job.');
  }
}
