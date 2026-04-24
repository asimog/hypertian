import { SponsorDashboard } from '@/components/sponsor-dashboard';
import { listPublicStreams } from '@/lib/supabase/queries';

export default async function StreamsPage() {
  const streams = await listPublicStreams();
  return <SponsorDashboard ads={[]} streams={streams} />;
}
