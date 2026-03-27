import { pollIntentStatus } from '@/lib/intents';
import { getStreamById } from '@/lib/streams';
import { PricingTier } from '@/lib/types';

export interface IntentStatusSnapshot {
  intentId: string;
  streamId: string;
  slug: string;
  tier: PricingTier;
  amountSol: number;
  amountLamports: number;
  buyerMint: string;
  depositAddress: string;
  sponsoredDexscreenerUrl: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'EXPIRED';
  payoutStatus: 'PENDING' | 'PROCESSING' | 'FORWARDED' | 'FAILED';
  expiresAt: string;
  paidAt: string | null;
  paymentConfirmedAt: string | null;
  leaseId: string | null;
  leaseStatus: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'PREEMPTED' | null;
  leaseQueuedAt: string | null;
  leaseActivatedAt: string | null;
  leaseEndsAt: string | null;
  forwardTxSignature: string | null;
  payoutFailureReason: string | null;
  currentChartUrl: string | null;
  currentMint: string | null;
  currentLeaseId: string | null;
  isDisplayingIntent: boolean;
  streamerCoinMint: string | null;
  streamerCoinSymbol: string | null;
  streamerCoinName: string | null;
}

export async function getIntentStatusSnapshot(intentId: string): Promise<IntentStatusSnapshot | null> {
  const status = await pollIntentStatus(intentId);
  if (!status) {
    return null;
  }

  const stream = await getStreamById(status.intent.streamId);

  return {
    intentId: status.intent.intentId,
    streamId: status.intent.streamId,
    slug: status.intent.slug,
    tier: status.intent.tier,
    amountSol: status.intent.amountSol,
    amountLamports: status.intent.amountLamports,
    buyerMint: status.intent.buyerMint,
    depositAddress: status.intent.depositAddress,
    sponsoredDexscreenerUrl: status.intent.sponsoredDexscreenerUrl,
    status: status.intent.status,
    payoutStatus: status.intent.payoutStatus,
    expiresAt: status.intent.expiresAt.toISOString(),
    paidAt: status.intent.paidAt?.toISOString() ?? null,
    paymentConfirmedAt: status.intent.paymentConfirmedAt?.toISOString() ?? null,
    leaseId: status.intent.leaseId,
    leaseStatus: status.lease?.status ?? null,
    leaseQueuedAt: status.lease?.queuedAt?.toISOString() ?? null,
    leaseActivatedAt: status.lease?.activatedAt?.toISOString() ?? null,
    leaseEndsAt: status.lease?.endsAt?.toISOString() ?? null,
    forwardTxSignature: status.intent.forwardTxSignature,
    payoutFailureReason: status.intent.payoutFailureReason,
    currentChartUrl: stream?.kernel.currentDexscreenerUrl ?? null,
    currentMint: stream?.kernel.currentMint ?? null,
    currentLeaseId: stream?.kernel.currentLeaseId ?? null,
    isDisplayingIntent: Boolean(status.intent.leaseId && stream?.kernel.currentLeaseId === status.intent.leaseId),
    streamerCoinMint: stream?.streamerCoinMint ?? null,
    streamerCoinSymbol: stream?.streamerCoinSymbol ?? null,
    streamerCoinName: stream?.streamerCoinName ?? null,
  };
}
