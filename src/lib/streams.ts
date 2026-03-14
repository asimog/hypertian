import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { createId } from '@/lib/ids';
import { generateSecretToken, sha256Hex } from '@/lib/crypto';
import { resolveDexscreenerUrl } from '@/lib/dexscreener';
import { getDb } from '@/lib/firestore';
import { fetchPumpCoinMetadata } from '@/lib/pumpfun';
import { getAppUrl } from '@/lib/env';
import { StreamEventRecord, StreamRecord } from '@/lib/types';

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9-]+$/);

const registrationSchema = z.object({
  deployerWallet: z.string().trim().min(32),
  streamerCoinMint: z.string().trim().min(32),
  desiredSlug: slugSchema,
});

export interface RegisterStreamInput {
  deployerWallet: string;
  streamerCoinMint: string;
  desiredSlug: string;
}

export interface RegisterStreamResult {
  streamId: string;
  slug: string;
  overlayKey: string;
  streamerPageUrl: string;
  overlayUrl: string;
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

export function hydrateStreamRecord(streamId: string, raw: Record<string, unknown>): StreamRecord {
  const overlay = (raw.overlay as Record<string, unknown>) || {};
  const liveStatus = (raw.liveStatus as Record<string, unknown>) || {};
  const kernel = (raw.kernel as Record<string, unknown>) || {};

  return {
    streamId,
    slug: String(raw.slug || ''),
    deployerWallet: String(raw.deployerWallet || ''),
    streamerCoinMint: String(raw.streamerCoinMint || ''),
    streamerCoinName: String(raw.streamerCoinName || ''),
    streamerCoinSymbol: String(raw.streamerCoinSymbol || ''),
    defaultDexscreenerUrl: String(raw.defaultDexscreenerUrl || ''),
    createdAt: toDateOrNull(raw.createdAt) || new Date(0),
    updatedAt: toDateOrNull(raw.updatedAt) || new Date(0),
    overlay: {
      overlayKeyHash: String(overlay.overlayKeyHash || ''),
      stateNonce: Number(overlay.stateNonce || 0),
      lastHeartbeatAt: toDateOrNull(overlay.lastHeartbeatAt),
      lastOverlaySessionId: overlay.lastOverlaySessionId ? String(overlay.lastOverlaySessionId) : null,
      verifiedAt: toDateOrNull(overlay.verifiedAt),
      lastVerifiedOverlaySessionId: overlay.lastVerifiedOverlaySessionId
        ? String(overlay.lastVerifiedOverlaySessionId)
        : null,
      verifyNonce: overlay.verifyNonce ? String(overlay.verifyNonce) : null,
      verifyNonceRequestedAt: toDateOrNull(overlay.verifyNonceRequestedAt),
      verifyNonceExpiresAt: toDateOrNull(overlay.verifyNonceExpiresAt),
    },
    liveStatus: {
      isLive: Boolean(liveStatus.isLive),
      viewers: Number(liveStatus.viewers || 0),
      lastSeenAt: toDateOrNull(liveStatus.lastSeenAt),
      lastIndexedAt: toDateOrNull(liveStatus.lastIndexedAt),
    },
    kernel: {
      defaultMint: String(kernel.defaultMint || ''),
      currentMint: String(kernel.currentMint || ''),
      currentDexscreenerUrl: String(kernel.currentDexscreenerUrl || ''),
      currentLeaseId: kernel.currentLeaseId ? String(kernel.currentLeaseId) : null,
      currentLeaseTier: (kernel.currentLeaseTier as StreamRecord['kernel']['currentLeaseTier']) || null,
      currentLeaseStartedAt: toDateOrNull(kernel.currentLeaseStartedAt),
      currentLeaseEndsAt: toDateOrNull(kernel.currentLeaseEndsAt),
      preemptCooldownUntil: toDateOrNull(kernel.preemptCooldownUntil),
    },
  };
}

export function normalizeSlug(input: string): string {
  return slugSchema.parse(input.toLowerCase());
}

export async function registerStream(input: RegisterStreamInput): Promise<RegisterStreamResult> {
  const parsed = registrationSchema.parse({
    deployerWallet: input.deployerWallet,
    streamerCoinMint: input.streamerCoinMint,
    desiredSlug: normalizeSlug(input.desiredSlug),
  });

  const [pumpCoin, defaultDexscreenerUrl] = await Promise.all([
    fetchPumpCoinMetadata(parsed.streamerCoinMint),
    resolveDexscreenerUrl(parsed.streamerCoinMint),
  ]);

  if (!pumpCoin) {
    throw new Error('We could not load Pump.fun metadata for that coin mint.');
  }

  if (pumpCoin.mint !== parsed.streamerCoinMint) {
    throw new Error('Pump.fun metadata did not match the submitted mint.');
  }

  if (pumpCoin.creator !== parsed.deployerWallet) {
    throw new Error('The deployer wallet does not match the Pump.fun creator for that coin.');
  }

  if (!defaultDexscreenerUrl) {
    throw new Error('Dexscreener could not resolve that coin mint.');
  }

  const db = getDb();
  const now = Timestamp.now();
  const streamId = createId('stream');
  const overlayKey = generateSecretToken();
  const overlayKeyHash = sha256Hex(overlayKey);
  const slug = parsed.desiredSlug;

  const streamRef = db.collection('streams').doc(streamId);
  const slugRef = db.collection('slugs').doc(slug);

  await db.runTransaction(async (transaction) => {
    const existingSlug = await transaction.get(slugRef);
    if (existingSlug.exists) {
      throw new Error('That slug is already taken.');
    }

    const streamDoc: StreamRecord = {
      streamId,
      slug,
      deployerWallet: parsed.deployerWallet,
      streamerCoinMint: parsed.streamerCoinMint,
      streamerCoinName: pumpCoin.name,
      streamerCoinSymbol: pumpCoin.symbol,
      defaultDexscreenerUrl,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      overlay: {
        overlayKeyHash,
        stateNonce: 1,
        lastHeartbeatAt: null,
        lastOverlaySessionId: null,
        verifiedAt: null,
        lastVerifiedOverlaySessionId: null,
        verifyNonce: null,
        verifyNonceRequestedAt: null,
        verifyNonceExpiresAt: null,
      },
      liveStatus: {
        isLive: false,
        viewers: 0,
        lastSeenAt: null,
        lastIndexedAt: null,
      },
      kernel: {
        defaultMint: parsed.streamerCoinMint,
        currentMint: parsed.streamerCoinMint,
        currentDexscreenerUrl: defaultDexscreenerUrl,
        currentLeaseId: null,
        currentLeaseTier: null,
        currentLeaseStartedAt: null,
        currentLeaseEndsAt: null,
        preemptCooldownUntil: null,
      },
    };

    transaction.set(streamRef, {
      ...streamDoc,
      createdAt: now,
      updatedAt: now,
      'overlay.lastHeartbeatAt': null,
      'overlay.verifiedAt': null,
      'overlay.verifyNonceRequestedAt': null,
      'overlay.verifyNonceExpiresAt': null,
      'liveStatus.lastSeenAt': null,
      'liveStatus.lastIndexedAt': null,
      'kernel.currentLeaseStartedAt': null,
      'kernel.currentLeaseEndsAt': null,
      'kernel.preemptCooldownUntil': null,
    });
    transaction.set(slugRef, {
      slug,
      streamId,
      createdAt: now,
    });
    transaction.set(streamRef.collection('events').doc(createId('evt')), {
      type: 'stream_registered',
      createdAt: now,
      message: `Registered ${pumpCoin.symbol} for ${slug}`,
    });
  });

  const appUrl = getAppUrl();

  return {
    streamId,
    slug,
    overlayKey,
    streamerPageUrl: `${appUrl}/${slug}`,
    overlayUrl: `${appUrl}/o/${streamId}?k=${overlayKey}`,
  };
}

export async function getStreamBySlug(slug: string) {
  const db = getDb();
  const slugDoc = await db.collection('slugs').doc(normalizeSlug(slug)).get();
  if (!slugDoc.exists) {
    return null;
  }

  const streamId = slugDoc.data()?.streamId as string | undefined;
  if (!streamId) {
    return null;
  }

  const streamDoc = await db.collection('streams').doc(streamId).get();
  if (!streamDoc.exists) {
    return null;
  }

  return hydrateStreamRecord(streamId, streamDoc.data() as Record<string, unknown>);
}

export async function getStreamById(streamId: string) {
  const streamDoc = await getDb().collection('streams').doc(streamId).get();
  if (!streamDoc.exists) {
    return null;
  }

  return hydrateStreamRecord(streamId, streamDoc.data() as Record<string, unknown>);
}

export async function getAllStreams() {
  const snapshot = await getDb().collection('streams').get();
  return snapshot.docs.map((doc) => hydrateStreamRecord(doc.id, doc.data() as Record<string, unknown>));
}

export async function getLiveStreams() {
  const streams = await getAllStreams();
  return streams
    .filter((stream) => stream.liveStatus.isLive)
    .sort((left, right) => right.liveStatus.viewers - left.liveStatus.viewers);
}

export async function getRecentStreamEvents(streamId: string, limitCount = 20): Promise<StreamEventRecord[]> {
  const snapshot = await getDb()
    .collection('streams')
    .doc(streamId)
    .collection('events')
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => {
    const raw = doc.data() as Record<string, unknown>;

    return {
      eventId: doc.id,
      type: String(raw.type || 'event'),
      message: String(raw.message || raw.type || doc.id),
      createdAt: toDateOrNull(raw.createdAt) || new Date(0),
      metadata: (raw.metadata as StreamEventRecord['metadata']) || null,
    };
  });
}

export async function touchStreamUpdatedAt(streamId: string) {
  await getDb().collection('streams').doc(streamId).set(
    {
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
