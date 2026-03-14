export type PricingTier = 'BASE' | 'PRIORITY';
export type IntentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'EXPIRED';
export type LeaseStatus = 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'PREEMPTED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'FORWARDED' | 'FAILED';

export interface EventMetadata {
  [key: string]: boolean | number | string | null;
}

export interface StreamRecord {
  streamId: string;
  slug: string;
  deployerWallet: string;
  streamerCoinMint: string;
  streamerCoinName: string;
  streamerCoinSymbol: string;
  defaultDexscreenerUrl: string;
  createdAt: Date;
  updatedAt: Date;
  overlay: {
    overlayKeyHash: string;
    stateNonce: number;
    lastHeartbeatAt: Date | null;
    lastOverlaySessionId: string | null;
    verifiedAt: Date | null;
    lastVerifiedOverlaySessionId: string | null;
    verifyNonce: string | null;
    verifyNonceRequestedAt: Date | null;
    verifyNonceExpiresAt: Date | null;
  };
  liveStatus: {
    isLive: boolean;
    viewers: number;
    lastSeenAt: Date | null;
    lastIndexedAt: Date | null;
  };
  kernel: {
    defaultMint: string;
    currentMint: string;
    currentDexscreenerUrl: string;
    currentLeaseId: string | null;
    currentLeaseTier: PricingTier | null;
    currentLeaseStartedAt: Date | null;
    currentLeaseEndsAt: Date | null;
    preemptCooldownUntil: Date | null;
  };
}

export interface PumpCoinMetadata {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  isCurrentlyLive?: boolean;
}

export interface PumpLiveEntry {
  mint: string;
  creatorAddress: string;
  viewerCount: number;
  linkUrl: string;
  symbol: string;
  title: string;
  isLive: boolean;
}

export interface LiveIndexRecord {
  indexedAt: Date;
  refreshIntervalMs: number;
  streams: PumpLiveEntry[];
}

export interface StreamEventRecord {
  eventId: string;
  type: string;
  message: string;
  createdAt: Date;
  metadata: EventMetadata | null;
}

export interface IntentRecord {
  intentId: string;
  streamId: string;
  slug: string;
  tier: PricingTier;
  buyerMint: string;
  sponsoredDexscreenerUrl: string;
  depositAddress: string;
  depositSecretCiphertext: string;
  amountLamports: number;
  amountSol: number;
  pricingResolvedAt: string;
  displaySeconds: number;
  status: IntentStatus;
  payoutStatus: PayoutStatus;
  leaseId: string | null;
  paymentConfirmedAt: Date | null;
  paidAt: Date | null;
  expiresAt: Date;
  depositObservedLamports: number;
  depositObservedSignature: string | null;
  streamerPayoutLamports: number;
  treasuryPayoutLamports: number;
  feeLamports: number;
  forwardTxSignature: string | null;
  payoutFailureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseRecord {
  leaseId: string;
  streamId: string;
  intentId: string;
  tier: PricingTier;
  buyerMint: string;
  sponsoredDexscreenerUrl: string;
  durationSeconds: number;
  status: LeaseStatus;
  queuePosition: number;
  queuedAt: Date;
  activatedAt: Date | null;
  completedAt: Date | null;
  endsAt: Date | null;
  preemptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
