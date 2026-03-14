import { z } from 'zod';
import { createId } from '@/lib/ids';
import { getLeaseById, processStreamKernel } from '@/lib/kernel';
import { resolveDexscreenerUrl } from '@/lib/dexscreener';
import {
  createDepositWallet,
  forwardDepositToRecipients,
  INTENT_TTL_MS,
  observeDepositPayment,
} from '@/lib/payments';
import { getDb } from '@/lib/firestore';
import { getPricing, getPricingTier } from '@/lib/pricing';
import { maybeRefreshLiveIndex } from '@/lib/live-index';
import { getStreamById } from '@/lib/streams';
import { assertPurchaseAllowed } from '@/lib/gating';
import { EventMetadata, IntentRecord, PricingTier } from '@/lib/types';

const createIntentSchema = z.object({
  streamId: z.string().trim().min(1),
  tier: z.enum(['BASE', 'PRIORITY']),
  buyerMint: z.string().trim().min(32),
});

function toDateOrNull(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const candidate = value as { toDate: () => Date };
    return candidate.toDate();
  }

  return null;
}

export function hydrateIntentRecord(intentId: string, raw: Record<string, unknown>): IntentRecord {
  return {
    intentId,
    streamId: String(raw.streamId || ''),
    slug: String(raw.slug || ''),
    tier: (raw.tier as PricingTier) || 'BASE',
    buyerMint: String(raw.buyerMint || ''),
    sponsoredDexscreenerUrl: String(raw.sponsoredDexscreenerUrl || ''),
    depositAddress: String(raw.depositAddress || ''),
    depositSecretCiphertext: String(raw.depositSecretCiphertext || ''),
    amountLamports: Number(raw.amountLamports || 0),
    amountSol: Number(raw.amountSol || 0),
    pricingResolvedAt: String(raw.pricingResolvedAt || ''),
    displaySeconds: Number(raw.displaySeconds || 0),
    status: (raw.status as IntentRecord['status']) || 'PENDING_PAYMENT',
    payoutStatus: (raw.payoutStatus as IntentRecord['payoutStatus']) || 'PENDING',
    leaseId: raw.leaseId ? String(raw.leaseId) : null,
    paymentConfirmedAt: toDateOrNull(raw.paymentConfirmedAt),
    paidAt: toDateOrNull(raw.paidAt),
    expiresAt: toDateOrNull(raw.expiresAt) || new Date(0),
    depositObservedLamports: Number(raw.depositObservedLamports || 0),
    depositObservedSignature: raw.depositObservedSignature ? String(raw.depositObservedSignature) : null,
    streamerPayoutLamports: Number(raw.streamerPayoutLamports || 0),
    treasuryPayoutLamports: Number(raw.treasuryPayoutLamports || 0),
    feeLamports: Number(raw.feeLamports || 0),
    forwardTxSignature: raw.forwardTxSignature ? String(raw.forwardTxSignature) : null,
    payoutFailureReason: raw.payoutFailureReason ? String(raw.payoutFailureReason) : null,
    createdAt: toDateOrNull(raw.createdAt) || new Date(0),
    updatedAt: toDateOrNull(raw.updatedAt) || new Date(0),
  };
}

export async function getIntentById(intentId: string) {
  const snapshot = await getDb().collection('intents').doc(intentId).get();
  if (!snapshot.exists) {
    return null;
  }

  return hydrateIntentRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function createIntent(input: z.infer<typeof createIntentSchema>) {
  const parsed = createIntentSchema.parse(input);
  const now = new Date();

  const stream = await getStreamById(parsed.streamId);
  if (!stream) {
    throw new Error('Stream not found.');
  }

  await maybeRefreshLiveIndex();
  const refreshedStream = await getStreamById(parsed.streamId);
  if (!refreshedStream) {
    throw new Error('Stream not found.');
  }

  assertPurchaseAllowed(refreshedStream, now.getTime());

  const pricingSnapshot = getPricing(now);
  const pricing = getPricingTier(parsed.tier, now);
  const sponsoredDexscreenerUrl = await resolveDexscreenerUrl(parsed.buyerMint);
  if (!sponsoredDexscreenerUrl) {
    throw new Error('Dexscreener could not resolve that buyer mint.');
  }

  const intentId = createId('intent');
  const expiresAt = new Date(now.getTime() + INTENT_TTL_MS);
  const deposit = createDepositWallet();

  await getDb()
    .collection('intents')
    .doc(intentId)
    .set({
      intentId,
      streamId: refreshedStream.streamId,
      slug: refreshedStream.slug,
      tier: parsed.tier,
      buyerMint: parsed.buyerMint,
      sponsoredDexscreenerUrl,
      depositAddress: deposit.depositAddress,
      depositSecretCiphertext: deposit.depositSecretCiphertext,
      amountLamports: pricing.amountLamports,
      amountSol: pricing.amountSol,
      pricingResolvedAt: pricingSnapshot.resolvedAt,
      displaySeconds: pricing.displaySeconds,
      status: 'PENDING_PAYMENT',
      payoutStatus: 'PENDING',
      leaseId: null,
      paymentConfirmedAt: null,
      paidAt: null,
      expiresAt,
      depositObservedLamports: 0,
      depositObservedSignature: null,
      streamerPayoutLamports: 0,
      treasuryPayoutLamports: 0,
      feeLamports: 0,
      forwardTxSignature: null,
      payoutFailureReason: null,
      createdAt: now,
      updatedAt: now,
    });

  await getDb()
    .collection('streams')
    .doc(refreshedStream.streamId)
    .collection('events')
    .doc(`intent_${intentId}_created`)
    .set({
      type: 'purchase_started',
      message: `${parsed.tier} purchase started for mint ${parsed.buyerMint}.`,
      metadata: {
        buyerMint: parsed.buyerMint,
        intentId,
        tier: parsed.tier,
      } satisfies EventMetadata,
      createdAt: now,
    });

  return {
    intentId,
    streamId: refreshedStream.streamId,
    slug: refreshedStream.slug,
    tier: parsed.tier,
    amountSol: pricing.amountSol,
    amountLamports: pricing.amountLamports,
    displaySeconds: pricing.displaySeconds,
    depositAddress: deposit.depositAddress,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function expireIntent(intentId: string, now = new Date()) {
  const db = getDb();
  let intent: IntentRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const intentRef = db.collection('intents').doc(intentId);
    const snapshot = await transaction.get(intentRef);
    if (!snapshot.exists) {
      return;
    }

    const currentIntent = hydrateIntentRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
    intent = currentIntent;

    if (currentIntent.status !== 'PENDING_PAYMENT' || currentIntent.expiresAt.getTime() > now.getTime()) {
      return;
    }

    transaction.set(
      intentRef,
      {
        status: 'EXPIRED',
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      db.collection('streams').doc(currentIntent.streamId).collection('events').doc(`intent_${intentId}_expired`),
      {
        type: 'purchase_expired',
        message: 'A purchase intent expired before payment arrived.',
        metadata: {
          intentId,
        } satisfies EventMetadata,
        createdAt: now,
      },
    );

    intent = {
      ...currentIntent,
      status: 'EXPIRED',
      updatedAt: now,
    };
  });

  return intent;
}

export async function confirmIntentPayment(
  intentId: string,
  observedLamports: number,
  signature: string | null,
  now = new Date(),
) {
  const db = getDb();
  let intent: IntentRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const intentRef = db.collection('intents').doc(intentId);
    const snapshot = await transaction.get(intentRef);
    if (!snapshot.exists) {
      return;
    }

    const currentIntent = hydrateIntentRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
    intent = currentIntent;

    if (currentIntent.status !== 'PENDING_PAYMENT') {
      return;
    }

    const leaseId = currentIntent.leaseId || createId('lease');
    const leaseRef = db.collection('leases').doc(leaseId);
    const queuePosition = now.getTime();

    transaction.set(
      intentRef,
      {
        status: 'CONFIRMED',
        leaseId,
        paymentConfirmedAt: now,
        paidAt: now,
        depositObservedLamports: observedLamports,
        depositObservedSignature: signature,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      leaseRef,
      {
        leaseId,
        streamId: currentIntent.streamId,
        intentId,
        tier: currentIntent.tier,
        buyerMint: currentIntent.buyerMint,
        sponsoredDexscreenerUrl: currentIntent.sponsoredDexscreenerUrl,
        durationSeconds: currentIntent.displaySeconds,
        status: 'QUEUED',
        queuePosition,
        queuedAt: now,
        activatedAt: null,
        completedAt: null,
        endsAt: null,
        preemptedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      db.collection('streams').doc(currentIntent.streamId).collection('events').doc(`intent_${intentId}_confirmed`),
      {
        type: 'purchase_confirmed',
        message: `${currentIntent.tier} payment confirmed for mint ${currentIntent.buyerMint}.`,
        metadata: {
          intentId,
          leaseId,
          observedLamports,
          tier: currentIntent.tier,
        } satisfies EventMetadata,
        createdAt: now,
      },
    );

    transaction.set(
      db.collection('streams').doc(currentIntent.streamId).collection('events').doc(`lease_${leaseId}_queued`),
      {
        type: 'lease_queued',
        message: `${currentIntent.tier} lease queued for the overlay.`,
        metadata: {
          intentId,
          leaseId,
          tier: currentIntent.tier,
        } satisfies EventMetadata,
        createdAt: now,
      },
    );

    intent = {
      ...currentIntent,
      status: 'CONFIRMED',
      leaseId,
      paymentConfirmedAt: now,
      paidAt: now,
      depositObservedLamports: observedLamports,
      depositObservedSignature: signature,
      updatedAt: now,
    };
  });

  const confirmedIntent = await getIntentById(intentId);
  if (!confirmedIntent) {
    return null;
  }

  await processStreamKernel(confirmedIntent.streamId, now);
  return getIntentById(intentId);
}

export async function pollIntentStatus(intentId: string) {
  let intent = await getIntentById(intentId);
  if (!intent) {
    return null;
  }

  if (intent.status === 'PENDING_PAYMENT' && intent.expiresAt.getTime() <= Date.now()) {
    intent = await expireIntent(intentId);
  }

  if (intent && intent.status === 'PENDING_PAYMENT') {
    const observation = await observeDepositPayment(intent.depositAddress, intent.amountLamports);
    if (observation.paid) {
      intent = await confirmIntentPayment(intentId, observation.observedLamports, observation.signature);
    }
  }

  if (intent && intent.status === 'CONFIRMED' && intent.payoutStatus !== 'FORWARDED') {
    intent = await ensureIntentPayoutForwarded(intentId);
  }

  if (!intent) {
    intent = await getIntentById(intentId);
  }

  if (!intent) {
    return null;
  }

  const lease = intent.leaseId ? await getLeaseById(intent.leaseId) : null;
  if (
    lease &&
    (lease.status === 'QUEUED' || (lease.status === 'ACTIVE' && lease.endsAt && lease.endsAt.getTime() <= Date.now()))
  ) {
    await processStreamKernel(intent.streamId);
    const refreshedIntent = (await getIntentById(intentId)) || intent;
    const refreshedLease = refreshedIntent.leaseId ? await getLeaseById(refreshedIntent.leaseId) : null;

    return {
      intent: refreshedIntent,
      lease: refreshedLease,
    };
  }

  return {
    intent,
    lease,
  };
}

export async function ensureIntentPayoutForwarded(intentId: string) {
  const db = getDb();
  const intentRef = db.collection('intents').doc(intentId);

  const claimed = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(intentRef);
    if (!snapshot.exists) {
      return null;
    }

    const intent = hydrateIntentRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
    if (intent.status !== 'CONFIRMED') {
      return intent;
    }

    if (intent.payoutStatus === 'FORWARDED' || intent.payoutStatus === 'PROCESSING') {
      return intent;
    }

    transaction.set(
      intentRef,
      {
        payoutStatus: 'PROCESSING',
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return {
      ...intent,
      payoutStatus: 'PROCESSING' as const,
    };
  });

  if (!claimed) {
    return null;
  }

  if (claimed.status !== 'CONFIRMED' || claimed.payoutStatus === 'FORWARDED') {
    return claimed;
  }

  const stream = await getStreamById(claimed.streamId);
  if (!stream) {
    throw new Error('Stream not found for payout forwarding.');
  }

  try {
    const payout = await forwardDepositToRecipients({
      depositSecretCiphertext: claimed.depositSecretCiphertext,
      grossLamports: claimed.depositObservedLamports || claimed.amountLamports,
      streamerWallet: stream.deployerWallet,
    });

    await intentRef.set(
      {
        payoutStatus: 'FORWARDED',
        forwardTxSignature: payout.forwardTxSignature,
        streamerPayoutLamports: payout.streamerPayoutLamports,
        treasuryPayoutLamports: payout.treasuryPayoutLamports,
        feeLamports: payout.feeLamports,
        payoutFailureReason: null,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    await getDb()
      .collection('streams')
      .doc(claimed.streamId)
      .collection('events')
      .doc(`intent_${intentId}_forwarded`)
      .set({
        type: 'payout_forwarded',
        message: 'Payment was auto-forwarded to the streamer wallet and treasury.',
        metadata: {
          intentId,
          forwardTxSignature: payout.forwardTxSignature,
          streamerPayoutLamports: payout.streamerPayoutLamports,
          treasuryPayoutLamports: payout.treasuryPayoutLamports,
          feeLamports: payout.feeLamports,
        } satisfies EventMetadata,
        createdAt: new Date(),
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payout forwarding failed.';

    await intentRef.set(
      {
        payoutStatus: 'FAILED',
        payoutFailureReason: message,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    await getDb()
      .collection('streams')
      .doc(claimed.streamId)
      .collection('events')
      .doc(`intent_${intentId}_forward_failed`)
      .set({
        type: 'payout_failed',
        message: 'Auto-forwarding failed and needs a retry.',
        metadata: {
          intentId,
          error: message,
        } satisfies EventMetadata,
        createdAt: new Date(),
      });
  }

  return getIntentById(intentId);
}
