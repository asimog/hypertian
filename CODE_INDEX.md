# CODE_INDEX

## App Routes

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | Landing page and route hub for the current Hypertian product surface. |
| `src/app/pump/page.tsx` | Pump lane landing page. |
| `src/app/x-overlay/page.tsx` | X overlay route wrapper around the shared overlay surface. |
| `src/app/youtube-overlay/page.tsx` | YouTube overlay route wrapper around the shared overlay surface. |
| `src/app/twitch-overlay/page.tsx` | Twitch overlay route wrapper around the shared overlay surface. |
| `src/app/pump-overlay/page.tsx` | Pump overlay route wrapper around the shared overlay surface. |
| `src/app/dashboard/streamer/page.tsx` | Server-loaded streamer dashboard page. |
| `src/app/dashboard/sponsor/page.tsx` | Server-loaded sponsor dashboard page. |

## UI Shell And Dashboards

| File | Purpose |
| --- | --- |
| `src/components/app-shell.tsx` | Shared app shell, navigation, auth CTA, and metric cards. |
| `src/components/streamer-dashboard.tsx` | Stream creation UI, overlay URL generation, and pending media listing. |
| `src/components/sponsor-dashboard.tsx` | Sponsor ad creation UI and payment polling flow. |
| `src/components/auth-gate.tsx` | Privy-based gate for streamer-only interactions. |
| `src/components/providers.tsx` | Root provider composition for Privy and Supabase. |
| `src/components/SupabaseProvider.tsx` | Client-side Supabase React context. |
| `src/components/sync-user.tsx` | One-shot Privy-to-Supabase user sync helper. |

## Overlay System

| File | Purpose |
| --- | --- |
| `src/components/OverlaySurface.tsx` | Shared overlay runtime: chart, media, disclosure, and stream heartbeat. |
| `src/components/DexChart.tsx` | Lightweight Charts wrapper for rendering token price candles. |
| `src/components/MediaBanner.tsx` | Media renderer for image, gif, and video creatives. |
| `src/components/OverlayDisclosure.tsx` | Persistent sponsorship/disclaimer footer for overlays. |
| `src/hooks/useDexScreener.ts` | Client hook for loading and refreshing token market data. |
| `src/lib/overlay.ts` | Query-param parsing utilities for single-slot and CSV-style multi-slot overlay configs. |

## API Routes

| File | Purpose |
| --- | --- |
| `src/app/api/auth/sync/route.ts` | Upserts a Privy-authenticated user in Supabase. |
| `src/app/api/streams/route.ts` | Creates streamer-owned stream records. |
| `src/app/api/streams/heartbeat/route.ts` | Marks streams live and refreshes heartbeat timestamps. |
| `src/app/api/ads/route.ts` | Validates a token, creates an ad record, and creates a pending payment. |
| `src/app/api/payments/verify/route.ts` | Verifies generated Solana deposit payments and activates ads. |
| `src/app/api/media-jobs/upload/route.ts` | Uploads sponsor media into Supabase Storage and creates media jobs. |
| `src/app/api/media-jobs/review/route.ts` | Approves or rejects media jobs and moves approved assets. |
| `src/app/api/dex/search/route.ts` | Search proxy for DexScreener results. |
| `src/app/api/dex/pair/route.ts` | Pair lookup proxy by pair address or token address. |

## Data, Auth, And Infrastructure

| File | Purpose |
| --- | --- |
| `src/lib/env.ts` | Runtime env parsing and optional-feature toggles. |
| `src/lib/constants.ts` | Platform-wide defaults such as price and duration. |
| `src/lib/types.ts` | Shared domain types for ads, streams, payments, Dex pairs, and overlays. |
| `src/lib/http.ts` | Small JSON response helpers for route handlers. |
| `src/lib/privy.ts` | Privy token verification helpers for server routes. |
| `src/lib/solana.ts` | Solana connection, deposit address generation, and payment-status inspection. |
| `src/lib/dexscreener.ts` | DexScreener fetchers plus synthetic candle helpers. |
| `src/lib/supabase/client.ts` | Browser Supabase client factory. |
| `src/lib/supabase/browser.ts` | Browser-only Supabase helper exports. |
| `src/lib/supabase/server.ts` | Server-side Supabase SSR client factory. |
| `src/lib/supabase/admin.ts` | Service-role Supabase client factory. |
| `src/lib/supabase/queries.ts` | Core data mutations and lookups for users, streams, ads, and payments. |

## Database

| File | Purpose |
| --- | --- |
| `supabase/migrations/001_initial.sql` | Initial schema for users, streams, ads, media jobs, and payments. |
| `supabase/migrations/002_payment_deposits.sql` | Additive deposit-address columns for existing `payments` tables. |

## Tests

| File | Purpose |
| --- | --- |
| `tests/dexscreener.test.ts` | Verifies synthetic OHLC candle generation from snapshot data. |
| `tests/overlay.test.ts` | Verifies CSV-style overlay query parsing and safe fallbacks. |

## Reference Docs

| File | Purpose |
| --- | --- |
| `README.md` | Current setup, architecture, and runtime documentation. |
| `docs/MIGRATION_NOTES.md` | Current migration status and repo direction notes. |
