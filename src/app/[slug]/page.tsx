import { notFound } from 'next/navigation';
import { StreamPageClient } from '@/components/stream-page-client';
import { TopNav } from '@/components/top-nav';
import { getPurchaseGateStatus } from '@/lib/gating';
import { maybeRefreshLiveIndex } from '@/lib/live-index';
import { getPricing } from '@/lib/pricing';
import { getRecentStreamEvents, getStreamBySlug } from '@/lib/streams';

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await maybeRefreshLiveIndex().catch(() => null);
  const stream = await getStreamBySlug(slug);

  if (!stream) {
    notFound();
  }

  const gate = getPurchaseGateStatus(stream);
  const pricing = getPricing();
  const events = await getRecentStreamEvents(stream.streamId, 20);

  return (
    <main className="shell">
      <TopNav />
      <StreamPageClient
        defaultDexscreenerUrl={stream.defaultDexscreenerUrl}
        deployerWallet={stream.deployerWallet}
        events={events.map((event) => ({
          eventId: event.eventId,
          type: event.type,
          message: event.message,
          createdAt: event.createdAt.toISOString(),
        }))}
        heartbeatFresh={gate.heartbeatFresh}
        lastHeartbeatAt={stream.overlay.lastHeartbeatAt?.toISOString() ?? null}
        liveFresh={gate.liveFresh}
        liveViewers={stream.liveStatus.viewers}
        pricing={{
          base: {
            amountSol: pricing.base.amountSol,
            displaySeconds: pricing.base.displaySeconds,
          },
          priority: {
            amountSol: pricing.priority.amountSol,
            displaySeconds: pricing.priority.displaySeconds,
          },
        }}
        purchaseReasons={gate.reasons}
        slug={stream.slug}
        streamId={stream.streamId}
        streamerCoinMint={stream.streamerCoinMint}
        verificationFresh={gate.verificationFresh}
        verifiedAt={stream.overlay.verifiedAt?.toISOString() ?? null}
      />
    </main>
  );
}
