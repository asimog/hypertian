import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA: z.string().min(32).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: z.string().url().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1).optional(),
  PRIVY_VERIFICATION_KEY: z.string().optional(),
  DEXSCREENER_WS_URL: z.string().url().optional(),
  HELIUS_RPC_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(1).optional(),
  FILEBASE_ACCESS_KEY_ID: z.string().min(1).optional(),
  FILEBASE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  FILEBASE_BUCKET: z.string().min(1).optional(),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA: process.env.NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_FILEBASE_PUBLIC_BASE_URL,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA: process.env.NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
    PRIVY_VERIFICATION_KEY: process.env.PRIVY_VERIFICATION_KEY,
    DEXSCREENER_WS_URL: process.env.DEXSCREENER_WS_URL,
    HELIUS_RPC_URL: process.env.HELIUS_RPC_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    FILEBASE_ACCESS_KEY_ID: process.env.FILEBASE_ACCESS_KEY_ID,
    FILEBASE_SECRET_ACCESS_KEY: process.env.FILEBASE_SECRET_ACCESS_KEY,
    FILEBASE_BUCKET: process.env.FILEBASE_BUCKET,
  });
}

export function getSolanaRpcUrl() {
  const env = getServerEnv();
  return env.HELIUS_RPC_URL || env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  );
}

export function isPrivyEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
}

export function getSupabasePublishableKey(env = getPublicEnv()) {
  return env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function isSupabaseEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function isSupabaseAdminEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function isFilebaseEnabled() {
  return Boolean(process.env.FILEBASE_ACCESS_KEY_ID && process.env.FILEBASE_SECRET_ACCESS_KEY && process.env.FILEBASE_BUCKET);
}
