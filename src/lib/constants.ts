export const PLATFORM_NAME = 'Hypertian';
export const USDC_SOLANA_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const DEFAULT_AD_PRICE_SOL = 0.001;
export const DEFAULT_AD_PRICE_USDC = 25;
export const DEFAULT_AD_DURATION_HOURS = 4;
export const DEFAULT_AD_DURATION_MINUTES = 5;
export const PUMPFUN_COMMISSION_BPS = 1_000;
export const STREAM_HEARTBEAT_INTERVAL_MS = 15_000;
export const STREAM_HEARTBEAT_STALE_MS = 30_000;

export const STREAM_PLATFORM_NAMES = {
  x: 'X',
  pump: 'PumpFun',
} as const;

export const STREAM_PLATFORM_PRIORITY = {
  x: 0,
  pump: 1,
} as const;
