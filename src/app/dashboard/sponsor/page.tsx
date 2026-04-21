import { SponsorDashboard } from '@/components/sponsor-dashboard';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function SponsorDashboardPage() {
  const supabase = createAdminClient();
  const [{ data: streams }, { data: ads }] = await Promise.all([
    supabase.from('streams').select('*').order('created_at', { ascending: false }),
    supabase.from('ads').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  return <SponsorDashboard ads={ads || []} streams={streams || []} />;
}
