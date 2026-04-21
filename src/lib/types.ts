export type UserRole = 'streamer' | 'sponsor';
export type AssetKind = 'SOL' | 'USDC';
export type PaymentStatus = 'pending' | 'submitted' | 'verified' | 'failed';
export type AdPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'full';
export type AdSize = 'small' | 'medium' | 'large';
export type OverlayTheme = 'dark' | 'light';
export type SupportedChain = 'solana' | 'ethereum' | 'base' | 'bsc' | 'arbitrum' | 'polygon';

export interface AppUser {
  id: string;
  privy_id: string;
  wallet_address: string | null;
  role: UserRole;
  created_at: string;
}

export interface StreamRecord {
  id: string;
  user_id: string;
  platform: 'x' | 'youtube' | 'twitch' | 'pump';
  is_live: boolean;
  last_heartbeat: string | null;
  created_at: string;
}

export interface AdRecord {
  id: string;
  stream_id: string;
  token_address: string;
  chain: string;
  position: string;
  size: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  ad_id: string;
  tx_hash: string | null;
  amount: number;
  currency: AssetKind;
  status: string;
  deposit_address: string | null;
  deposit_secret: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface MediaJobRecord {
  id: string;
  ad_id: string;
  sponsor_wallet: string | null;
  media_path: string;
  media_type: 'image' | 'gif' | 'video' | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  created_at: string;
}

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  priceUsd: string | null;
  priceNative: string | null;
  fdv?: number | null;
  marketCap?: number | null;
  liquidity?: {
    usd?: number | null;
    base?: number | null;
    quote?: number | null;
  } | null;
  boosts?: {
    active?: number | null;
  } | null;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
}

export interface DexSearchResult {
  pair: DexPair;
  sponsored: boolean;
}

export interface DexCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OverlayAdConfig {
  token: string;
  chain: SupportedChain;
  position: AdPosition;
  size: AdSize;
  theme: OverlayTheme;
  showSponsor: boolean;
  sponsorLabel?: string | null;
}
