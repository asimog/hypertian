import { StreamerDashboard } from '@/components/streamer-dashboard';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function StreamerDashboardPage() {
  const supabase = createAdminClient();
  const [{ data: streams }, { data: ads }, { data: mediaJobs }] = await Promise.all([
    supabase.from('streams').select('*').order('created_at', { ascending: false }),
    supabase.from('ads').select('*').order('created_at', { ascending: false }),
    supabase.from('media_jobs').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  return <StreamerDashboard initialAds={ads || []} initialMediaJobs={mediaJobs || []} initialStreams={streams || []} />;
}
