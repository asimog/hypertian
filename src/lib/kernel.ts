import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firestore';
import { LeaseRecord, PricingTier, StreamRecord } from '@/lib/types';

export const MINIMUM_GUARANTEED_DISPLAY_MS = 120_000;
export const PREEMPT_COOLDOWN_MS = 120_000;

interface KernelLeaseCandidate {
  leaseId: string;
  tier: PricingTier;
  buyerMint: string;
  sponsoredDexscreenerUrl: string;
  durationSeconds: number;
  status: LeaseRecord['status'];
  queuedAt: Date;
  activatedAt: Date | null;
  endsAt: Date | null;
}

export interface KernelResolution {
  changed: boolean;
  action: 'KEEP' | 'ACTIVATE' | 'REVERT';
  completedLeaseId: string | null;
  preemptedLeaseId: string | null;
  activatedLeaseId: string | null;
  nextMint: string;
  nextDexscreenerUrl: string;
  nextLeaseId: string | null;
  nextLeaseTier: PricingTier | null;
  nextLeaseStartedAt: Date | null;
  nextLeaseEndsAt: Date | null;
  nextPreemptCooldownUntil: Date | null;
}

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

export function hydrateLeaseRecord(leaseId: string, raw: Record<string, unknown>): LeaseRecord {
  return {
    leaseId,
    streamId: String(raw.streamId || ''),
    intentId: String(raw.intentId || ''),
    tier: (raw.tier as PricingTier) || 'BASE',
    buyerMint: String(raw.buyerMint || ''),
    sponsoredDexscreenerUrl: String(raw.sponsoredDexscreenerUrl || ''),
    durationSeconds: Number(raw.durationSeconds || 0),
    status: (raw.status as LeaseRecord['status']) || 'QUEUED',
    queuePosition: Number(raw.queuePosition || 0),
    queuedAt: toDateOrNull(raw.queuedAt) || new Date(0),
    activatedAt: toDateOrNull(raw.activatedAt),
    completedAt: toDateOrNull(raw.completedAt),
    endsAt: toDateOrNull(raw.endsAt),
    preemptedAt: toDateOrNull(raw.preemptedAt),
    createdAt: toDateOrNull(raw.createdAt) || new Date(0),
    updatedAt: toDateOrNull(raw.updatedAt) || new Date(0),
  };
}

export async function getLeaseById(leaseId: string) {
  const snapshot = await getDb().collection('leases').doc(leaseId).get();
  if (!snapshot.exists) {
    return null;
  }

  return hydrateLeaseRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
}

export async function listStreamLeases(streamId: string) {
  const snapshot = await getDb()
    .collection('leases')
    .where('streamId', '==', streamId)
    .get();

  return snapshot.docs
    .map((doc) => hydrateLeaseRecord(doc.id, doc.data() as Record<string, unknown>))
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

function getLeaseEndAt(lease: KernelLeaseCandidate): Date | null {
  if (lease.endsAt) {
    return lease.endsAt;
  }

  if (!lease.activatedAt) {
    return null;
  }

  return new Date(lease.activatedAt.getTime() + lease.durationSeconds * 1000);
}

export function evaluateLeaseQueue(input: {
  defaultMint: string;
  defaultDexscreenerUrl: string;
  preemptCooldownUntil: Date | null;
  leases: KernelLeaseCandidate[];
  now: Date;
}): KernelResolution {
  const nowMs = input.now.getTime();
  const queued = input.leases
    .filter((lease) => lease.status === 'QUEUED')
    .sort((left, right) => left.queuedAt.getTime() - right.queuedAt.getTime());
  const active = input.leases.find((lease) => lease.status === 'ACTIVE') || null;

  if (active) {
    const activeEndsAt = getLeaseEndAt(active);

    if (activeEndsAt && activeEndsAt.getTime() > nowMs) {
      const oldestQueuedPriority = queued.find((lease) => lease.tier === 'PRIORITY') || null;
      const activeStartedAt = active.activatedAt?.getTime() ?? active.queuedAt.getTime();
      const cooldownReady =
        !input.preemptCooldownUntil || input.preemptCooldownUntil.getTime() <= nowMs;

      if (
        active.tier === 'BASE' &&
        oldestQueuedPriority &&
        nowMs - activeStartedAt >= MINIMUM_GUARANTEED_DISPLAY_MS &&
        cooldownReady
      ) {
        return {
          changed: true,
          action: 'ACTIVATE',
          completedLeaseId: active.leaseId,
          preemptedLeaseId: active.leaseId,
          activatedLeaseId: oldestQueuedPriority.leaseId,
          nextMint: oldestQueuedPriority.buyerMint,
          nextDexscreenerUrl: oldestQueuedPriority.sponsoredDexscreenerUrl,
          nextLeaseId: oldestQueuedPriority.leaseId,
          nextLeaseTier: oldestQueuedPriority.tier,
          nextLeaseStartedAt: input.now,
          nextLeaseEndsAt: new Date(nowMs + oldestQueuedPriority.durationSeconds * 1000),
          nextPreemptCooldownUntil: new Date(nowMs + PREEMPT_COOLDOWN_MS),
        };
      }

      return {
        changed: false,
        action: 'KEEP',
        completedLeaseId: null,
        preemptedLeaseId: null,
        activatedLeaseId: active.leaseId,
        nextMint: active.buyerMint,
        nextDexscreenerUrl: active.sponsoredDexscreenerUrl,
        nextLeaseId: active.leaseId,
        nextLeaseTier: active.tier,
        nextLeaseStartedAt: active.activatedAt,
        nextLeaseEndsAt: activeEndsAt,
        nextPreemptCooldownUntil: input.preemptCooldownUntil,
      };
    }
  }

  const nextQueued = queued[0] || null;
  if (nextQueued) {
    return {
      changed: true,
      action: 'ACTIVATE',
      completedLeaseId: active?.leaseId || null,
      preemptedLeaseId: null,
      activatedLeaseId: nextQueued.leaseId,
      nextMint: nextQueued.buyerMint,
      nextDexscreenerUrl: nextQueued.sponsoredDexscreenerUrl,
      nextLeaseId: nextQueued.leaseId,
      nextLeaseTier: nextQueued.tier,
      nextLeaseStartedAt: input.now,
      nextLeaseEndsAt: new Date(nowMs + nextQueued.durationSeconds * 1000),
      nextPreemptCooldownUntil: input.preemptCooldownUntil,
    };
  }

  if (active) {
    return {
      changed: true,
      action: 'REVERT',
      completedLeaseId: active.leaseId,
      preemptedLeaseId: null,
      activatedLeaseId: null,
      nextMint: input.defaultMint,
      nextDexscreenerUrl: input.defaultDexscreenerUrl,
      nextLeaseId: null,
      nextLeaseTier: null,
      nextLeaseStartedAt: null,
      nextLeaseEndsAt: null,
      nextPreemptCooldownUntil: input.preemptCooldownUntil,
    };
  }

  return {
    changed: false,
    action: 'KEEP',
    completedLeaseId: null,
    preemptedLeaseId: null,
    activatedLeaseId: null,
    nextMint: input.defaultMint,
    nextDexscreenerUrl: input.defaultDexscreenerUrl,
    nextLeaseId: null,
    nextLeaseTier: null,
    nextLeaseStartedAt: null,
    nextLeaseEndsAt: null,
    nextPreemptCooldownUntil: input.preemptCooldownUntil,
  };
}

export function needsKernelTick(stream: Pick<StreamRecord, 'kernel'>, now = Date.now()) {
  return Boolean(
    stream.kernel.currentLeaseId &&
      stream.kernel.currentLeaseEndsAt &&
      stream.kernel.currentLeaseEndsAt.getTime() <= now,
  );
}

export async function processStreamKernel(streamId: string, now = new Date()) {
  const db = getDb();
  const streamRef = db.collection('streams').doc(streamId);
  let resolution: KernelResolution | null = null;

  await db.runTransaction(async (transaction) => {
    const streamSnapshot = await transaction.get(streamRef);
    if (!streamSnapshot.exists) {
      return;
    }

    const stream = streamSnapshot.data() as Record<string, unknown>;
    const kernel = (stream.kernel as Record<string, unknown>) || {};
    const overlay = (stream.overlay as Record<string, unknown>) || {};

    const leaseQuery = db.collection('leases').where('streamId', '==', streamId);
    const leaseSnapshot = await transaction.get(leaseQuery);
    const leases = leaseSnapshot.docs
      .map((doc) => hydrateLeaseRecord(doc.id, doc.data() as Record<string, unknown>))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

    resolution = evaluateLeaseQueue({
      defaultMint: String(kernel.defaultMint || ''),
      defaultDexscreenerUrl: String(stream.defaultDexscreenerUrl || kernel.currentDexscreenerUrl || ''),
      preemptCooldownUntil: toDateOrNull(kernel.preemptCooldownUntil),
      leases,
      now,
    });

    if (!resolution.changed) {
      return;
    }

    if (resolution.completedLeaseId) {
      const completedRef = db.collection('leases').doc(resolution.completedLeaseId);
      transaction.set(
        completedRef,
        resolution.preemptedLeaseId === resolution.completedLeaseId
          ? {
              status: 'PREEMPTED',
              completedAt: now,
              preemptedAt: now,
              updatedAt: now,
            }
          : {
              status: 'COMPLETED',
              completedAt: now,
              updatedAt: now,
            },
        { merge: true },
      );

      transaction.set(
        streamRef.collection('events').doc(
          resolution.preemptedLeaseId === resolution.completedLeaseId
            ? `lease_${resolution.completedLeaseId}_preempted`
            : `lease_${resolution.completedLeaseId}_completed`,
        ),
        {
          type:
            resolution.preemptedLeaseId === resolution.completedLeaseId ? 'lease_preempted' : 'lease_completed',
          message:
            resolution.preemptedLeaseId === resolution.completedLeaseId
              ? 'A BASE lease was preempted after its guaranteed display window.'
              : 'A lease finished and the overlay advanced.',
          metadata: {
            leaseId: resolution.completedLeaseId,
          },
          createdAt: now,
        },
      );
    }

    if (resolution.activatedLeaseId) {
      const activatedRef = db.collection('leases').doc(resolution.activatedLeaseId);
      transaction.set(
        activatedRef,
        {
          status: 'ACTIVE',
          activatedAt: resolution.nextLeaseStartedAt,
          endsAt: resolution.nextLeaseEndsAt,
          updatedAt: now,
        },
        { merge: true },
      );

      transaction.set(
        streamRef.collection('events').doc(`lease_${resolution.activatedLeaseId}_activated`),
        {
          type: 'lease_activated',
          message: `Activated ${resolution.nextLeaseTier || 'BASE'} lease on the overlay.`,
          metadata: {
            leaseId: resolution.activatedLeaseId,
            tier: resolution.nextLeaseTier,
          },
          createdAt: now,
        },
      );
    }

    transaction.set(
      streamRef,
      {
        kernel: {
          defaultMint: String(kernel.defaultMint || ''),
          currentMint: resolution.nextMint,
          currentDexscreenerUrl: resolution.nextDexscreenerUrl,
          currentLeaseId: resolution.nextLeaseId,
          currentLeaseTier: resolution.nextLeaseTier,
          currentLeaseStartedAt: resolution.nextLeaseStartedAt,
          currentLeaseEndsAt: resolution.nextLeaseEndsAt,
          preemptCooldownUntil: resolution.nextPreemptCooldownUntil,
        },
        overlay: {
          ...overlay,
          stateNonce: Number(overlay.stateNonce || 0) + 1,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return resolution;
}
