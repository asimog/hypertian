import { fail, ok } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePrivyUser } from '@/lib/privy';
import { getUserByPrivyId } from '@/lib/supabase/queries';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'video/webm'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  try {
    const claims = await requirePrivyUser();
    const user = await getUserByPrivyId(claims.user_id);

    if (!user) {
      return fail('User must be synced before uploading media.', 403);
    }

    const formData = await request.formData();
    const adId = String(formData.get('adId') || '');
    const mediaType = String(formData.get('mediaType') || 'image');
    const file = formData.get('file');

    if (!adId || !(file instanceof File)) {
      return fail('Missing adId or file.');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return fail('Invalid file type. Allowed types: PNG, JPEG, GIF, MP4, WebM.');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return fail('File too large. Maximum size is 50MB.');
    }

    // Verify ad exists and belongs to sponsor
    const supabaseCheck = createAdminClient();
    const { data: ad, error: adError } = await supabaseCheck
      .from('ads')
      .select('id, sponsor_id, sponsor_wallet')
      .eq('id', adId)
      .single();

    if (adError || !ad) {
      return fail('Ad not found.');
    }

    if (ad.sponsor_id !== user.id) {
      return fail('You are not authorized to upload media for this ad.');
    }

    const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const filePath = `pending/${crypto.randomUUID()}.${extension}`;
    const bytes = await file.arrayBuffer();
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage
      .from('ad-media')
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data, error } = await supabase
      .from('media_jobs')
      .insert({
        ad_id: adId,
        sponsor_wallet: user.wallet_address,
        media_path: filePath,
        media_type: mediaType,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ok({ mediaJob: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to upload media job.');
  }
}
