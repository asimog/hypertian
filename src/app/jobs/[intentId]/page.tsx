import { notFound } from 'next/navigation';
import { JobPageClient } from '@/components/job-page-client';
import { TopNav } from '@/components/top-nav';
import { getIntentStatusSnapshot } from '@/lib/intent-status';

export default async function JobPage({ params }: { params: Promise<{ intentId: string }> }) {
  const { intentId } = await params;
  const status = await getIntentStatusSnapshot(intentId);

  if (!status) {
    notFound();
  }

  return (
    <main className="shell">
      <TopNav />
      <JobPageClient initialStatus={status} />
    </main>
  );
}
