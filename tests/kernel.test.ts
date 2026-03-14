import { describe, expect, it } from 'vitest';
import { evaluateLeaseQueue, MINIMUM_GUARANTEED_DISPLAY_MS, PREEMPT_COOLDOWN_MS } from '../src/lib/kernel';

const DEFAULT_INPUT = {
  defaultMint: 'streamer-mint',
  defaultDexscreenerUrl: 'https://dexscreener.com/solana/streamer-mint',
};

describe('lease kernel', () => {
  it('keeps an active BASE lease running before the guaranteed window is met', () => {
    const now = new Date('2026-03-13T12:01:00.000Z');
    const resolution = evaluateLeaseQueue({
      ...DEFAULT_INPUT,
      now,
      preemptCooldownUntil: null,
      leases: [
        {
          leaseId: 'lease_base',
          tier: 'BASE',
          buyerMint: 'buyer-one',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-one',
          durationSeconds: 300,
          status: 'ACTIVE',
          queuedAt: new Date('2026-03-13T12:00:00.000Z'),
          activatedAt: new Date(now.getTime() - MINIMUM_GUARANTEED_DISPLAY_MS + 30_000),
          endsAt: new Date('2026-03-13T12:05:00.000Z'),
        },
        {
          leaseId: 'lease_priority',
          tier: 'PRIORITY',
          buyerMint: 'buyer-two',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-two',
          durationSeconds: 600,
          status: 'QUEUED',
          queuedAt: new Date('2026-03-13T12:00:30.000Z'),
          activatedAt: null,
          endsAt: null,
        },
      ],
    });

    expect(resolution.action).toBe('KEEP');
    expect(resolution.changed).toBe(false);
    expect(resolution.nextLeaseId).toBe('lease_base');
  });

  it('lets a PRIORITY lease preempt BASE after 120 seconds and sets cooldown', () => {
    const now = new Date('2026-03-13T12:03:00.000Z');
    const resolution = evaluateLeaseQueue({
      ...DEFAULT_INPUT,
      now,
      preemptCooldownUntil: null,
      leases: [
        {
          leaseId: 'lease_base',
          tier: 'BASE',
          buyerMint: 'buyer-one',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-one',
          durationSeconds: 300,
          status: 'ACTIVE',
          queuedAt: new Date('2026-03-13T12:00:00.000Z'),
          activatedAt: new Date('2026-03-13T12:00:00.000Z'),
          endsAt: new Date('2026-03-13T12:05:00.000Z'),
        },
        {
          leaseId: 'lease_priority',
          tier: 'PRIORITY',
          buyerMint: 'buyer-two',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-two',
          durationSeconds: 600,
          status: 'QUEUED',
          queuedAt: new Date('2026-03-13T12:00:30.000Z'),
          activatedAt: null,
          endsAt: null,
        },
      ],
    });

    expect(resolution.action).toBe('ACTIVATE');
    expect(resolution.preemptedLeaseId).toBe('lease_base');
    expect(resolution.activatedLeaseId).toBe('lease_priority');
    expect(resolution.nextPreemptCooldownUntil?.getTime()).toBe(now.getTime() + PREEMPT_COOLDOWN_MS);
  });

  it('does not let PRIORITY preempt another PRIORITY lease', () => {
    const now = new Date('2026-03-13T12:03:00.000Z');
    const resolution = evaluateLeaseQueue({
      ...DEFAULT_INPUT,
      now,
      preemptCooldownUntil: null,
      leases: [
        {
          leaseId: 'lease_priority_active',
          tier: 'PRIORITY',
          buyerMint: 'buyer-one',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-one',
          durationSeconds: 600,
          status: 'ACTIVE',
          queuedAt: new Date('2026-03-13T12:00:00.000Z'),
          activatedAt: new Date('2026-03-13T12:00:00.000Z'),
          endsAt: new Date('2026-03-13T12:10:00.000Z'),
        },
        {
          leaseId: 'lease_priority_queued',
          tier: 'PRIORITY',
          buyerMint: 'buyer-two',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-two',
          durationSeconds: 600,
          status: 'QUEUED',
          queuedAt: new Date('2026-03-13T12:00:30.000Z'),
          activatedAt: null,
          endsAt: null,
        },
      ],
    });

    expect(resolution.action).toBe('KEEP');
    expect(resolution.nextLeaseId).toBe('lease_priority_active');
  });

  it('reverts to the streamer chart when the queue is empty and the active lease has expired', () => {
    const now = new Date('2026-03-13T12:05:01.000Z');
    const resolution = evaluateLeaseQueue({
      ...DEFAULT_INPUT,
      now,
      preemptCooldownUntil: null,
      leases: [
        {
          leaseId: 'lease_base',
          tier: 'BASE',
          buyerMint: 'buyer-one',
          sponsoredDexscreenerUrl: 'https://dexscreener.com/solana/buyer-one',
          durationSeconds: 120,
          status: 'ACTIVE',
          queuedAt: new Date('2026-03-13T12:00:00.000Z'),
          activatedAt: new Date('2026-03-13T12:03:00.000Z'),
          endsAt: new Date('2026-03-13T12:05:00.000Z'),
        },
      ],
    });

    expect(resolution.action).toBe('REVERT');
    expect(resolution.completedLeaseId).toBe('lease_base');
    expect(resolution.nextMint).toBe('streamer-mint');
  });
});
