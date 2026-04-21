import { fail, ok } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const adId = String(formData.get('adId') || '');
    const sponsorWallet = String(formData.get('sponsorWallet') || '');
    const mediaType = String(formData.get('mediaType') || 'image');
    const file = formData.get('file');

    if (!adId || !(file instanceof File)) {
      return fail('Missing adId or file.');
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
        sponsor_wallet: sponsorWallet || null,
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
