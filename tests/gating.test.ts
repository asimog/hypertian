import { describe, expect, it } from 'vitest';
import { getPurchaseGateStatus } from '../src/lib/gating';
import { sha256Hex } from '../src/lib/crypto';
import type { StreamRecord } from '../src/lib/types';

function makeStream(overrides: Partial<StreamRecord> = {}): StreamRecord {
  const now = new Date('2026-03-13T12:00:00.000Z');

  return {
    streamId: 'stream_test',
    slug: 'test',
    deployerWallet: 'wallet',
    streamerCoinMint: 'mint',
    streamerCoinName: 'Test Coin',
    streamerCoinSymbol: 'TEST',
    defaultDexscreenerUrl: 'https://dexscreener.com/solana/mint',
    createdAt: now,
    updatedAt: now,
    overlay: {
      overlayKeyHash: sha256Hex('overlay-key'),
      stateNonce: 1,
      lastHeartbeatAt: now,
      lastOverlaySessionId: 'session',
      verifiedAt: now,
      lastVerifiedOverlaySessionId: 'session',
      verifyNonce: null,
      verifyNonceRequestedAt: null,
      verifyNonceExpiresAt: null,
      ...(overrides.overlay || {}),
    },
    liveStatus: {
      isLive: true,
      viewers: 123,
      lastSeenAt: now,
      lastIndexedAt: now,
      ...(overrides.liveStatus || {}),
    },
    kernel: {
      defaultMint: 'mint',
      currentMint: 'mint',
      currentDexscreenerUrl: 'https://dexscreener.com/solana/mint',
      currentLeaseId: null,
      currentLeaseTier: null,
      currentLeaseStartedAt: null,
      currentLeaseEndsAt: null,
      preemptCooldownUntil: null,
      ...(overrides.kernel || {}),
    },
    ...overrides,
  };
}

describe('purchase gating', () => {
  it('allows purchases when live, heartbeat fresh, and verification fresh', () => {
    const stream = makeStream();
    const gate = getPurchaseGateStatus(stream, new Date('2026-03-13T12:00:10.000Z').getTime());

    expect(gate.canPurchase).toBe(true);
    expect(gate.reasons).toEqual([]);
  });

  it('fails closed when the stream is not live enough', () => {
    const stream = makeStream({
      liveStatus: {
        isLive: true,
        viewers: 99,
        lastSeenAt: new Date('2026-03-13T11:58:00.000Z'),
        lastIndexedAt: new Date('2026-03-13T12:00:00.000Z'),
      },
    });

    const gate = getPurchaseGateStatus(stream, new Date('2026-03-13T12:00:10.000Z').getTime());

    expect(gate.canPurchase).toBe(false);
    expect(gate.liveFresh).toBe(false);
    expect(gate.reasons[0]).toContain('not live');
  });

  it('fails closed when heartbeat and verification are stale', () => {
    const stream = makeStream({
      overlay: {
        overlayKeyHash: sha256Hex('overlay-key'),
        stateNonce: 1,
        lastHeartbeatAt: new Date('2026-03-13T11:59:00.000Z'),
        lastOverlaySessionId: 'session',
        verifiedAt: new Date('2026-03-12T00:00:00.000Z'),
        lastVerifiedOverlaySessionId: 'session',
        verifyNonce: null,
        verifyNonceRequestedAt: null,
        verifyNonceExpiresAt: null,
      },
    });

    const gate = getPurchaseGateStatus(stream, new Date('2026-03-13T12:00:10.000Z').getTime());

    expect(gate.canPurchase).toBe(false);
    expect(gate.heartbeatFresh).toBe(false);
    expect(gate.verificationFresh).toBe(false);
    expect(gate.reasons).toHaveLength(2);
  });
});
