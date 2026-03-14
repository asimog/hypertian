import { describe, expect, it } from 'vitest';
import { getVerificationStatus, isOverlayKeyValid } from '../src/lib/overlay';
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
      overlayKeyHash: sha256Hex('overlay-secret'),
      stateNonce: 1,
      lastHeartbeatAt: now,
      lastOverlaySessionId: 'session',
      verifiedAt: null,
      lastVerifiedOverlaySessionId: null,
      verifyNonce: null,
      verifyNonceRequestedAt: null,
      verifyNonceExpiresAt: null,
      ...(overrides.overlay || {}),
    },
    liveStatus: {
      isLive: true,
      viewers: 1,
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

describe('overlay verify handshake', () => {
  it('shows pending while the verify nonce is active', () => {
    const stream = makeStream({
      overlay: {
        overlayKeyHash: sha256Hex('overlay-secret'),
        stateNonce: 1,
        lastHeartbeatAt: new Date('2026-03-13T12:00:00.000Z'),
        lastOverlaySessionId: 'session',
        verifiedAt: null,
        lastVerifiedOverlaySessionId: null,
        verifyNonce: 'nonce',
        verifyNonceRequestedAt: new Date('2026-03-13T12:00:00.000Z'),
        verifyNonceExpiresAt: new Date('2026-03-13T12:00:20.000Z'),
      },
    });

    expect(getVerificationStatus(stream, new Date('2026-03-13T12:00:10.000Z').getTime())).toBe('pending');
  });

  it('shows success after the overlay completes the nonce handshake', () => {
    const stream = makeStream({
      overlay: {
        overlayKeyHash: sha256Hex('overlay-secret'),
        stateNonce: 1,
        lastHeartbeatAt: new Date('2026-03-13T12:00:10.000Z'),
        lastOverlaySessionId: 'session',
        verifiedAt: new Date('2026-03-13T12:00:11.000Z'),
        lastVerifiedOverlaySessionId: 'session',
        verifyNonce: null,
        verifyNonceRequestedAt: new Date('2026-03-13T12:00:00.000Z'),
        verifyNonceExpiresAt: new Date('2026-03-13T12:00:20.000Z'),
      },
    });

    expect(getVerificationStatus(stream, new Date('2026-03-13T12:00:12.000Z').getTime())).toBe('success');
  });

  it('shows failed after the request expires without a verification completion', () => {
    const stream = makeStream({
      overlay: {
        overlayKeyHash: sha256Hex('overlay-secret'),
        stateNonce: 1,
        lastHeartbeatAt: new Date('2026-03-13T12:00:00.000Z'),
        lastOverlaySessionId: 'session',
        verifiedAt: null,
        lastVerifiedOverlaySessionId: null,
        verifyNonce: null,
        verifyNonceRequestedAt: new Date('2026-03-13T12:00:00.000Z'),
        verifyNonceExpiresAt: new Date('2026-03-13T12:00:20.000Z'),
      },
    });

    expect(getVerificationStatus(stream, new Date('2026-03-13T12:00:30.000Z').getTime())).toBe('failed');
  });

  it('checks the overlay key hash without exposing the raw key', () => {
    const stream = makeStream();

    expect(isOverlayKeyValid(stream, 'overlay-secret')).toBe(true);
    expect(isOverlayKeyValid(stream, 'wrong-key')).toBe(false);
  });
});
