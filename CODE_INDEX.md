# CODE_INDEX

## Core Pages

| File | Purpose |
| --- | --- |
| `src/app/page.tsx` | Hypertian landing page and lane entrypoints. |
| `src/app/x-overlay/page.tsx` | Highest-priority X OBS overlay route. |
| `src/app/youtube-overlay/page.tsx` | YouTube overlay route. |
| `src/app/twitch-overlay/page.tsx` | Twitch overlay route. |
| `src/app/pump-overlay/page.tsx` | Pump overlay route. |
| `src/app/pump/page.tsx` | Pump Ads lane entry page. |
| `src/app/dashboard/streamer/page.tsx` | Creator dashboard route. |
| `src/app/dashboard/sponsor/page.tsx` | Sponsor dashboard route. |

## Shared Overlay Components

| File | Purpose |
| --- | --- |
| `src/components/OverlaySurface.tsx` | Shared overlay renderer for all platform lanes. |
| `src/components/DexChart.tsx` | Lightweight Charts wrapper for live token chart rendering. |
| `src/components/MediaBanner.tsx` | Approved media banner renderer for image/GIF/video. |
| `src/components/OverlayDisclosure.tsx` | Fixed disclosure bar that remains visible on all overlays. |
| `src/hooks/useDexScreener.ts` | REST + WebSocket DexScreener data hook with reconnect behavior. |

## Auth + Data

| File | Purpose |
| --- | --- |
| `src/components/providers.tsx` | Supabase provider shell with optional Privy wrapping. |
| `src/components/auth-gate.tsx` | Privy gate that transparently no-ops when Privy is disabled. |
| `src/lib/supabase/browser.ts` | Client-side Supabase browser client. |
| `src/lib/supabase/server.ts` | Server-side Supabase SSR client. |
| `src/lib/supabase/admin.ts` | Service-role Supabase client. |
| `src/lib/supabase/queries.ts` | Shared data helpers for users, streams, ads, and payments. |
| `src/lib/privy.ts` | Privy token verification helpers for creator-only flows. |
| `src/lib/solana.ts` | Solana RPC helpers for generated payment deposit addresses and detection. |

## API Routes

| File | Purpose |
| --- | --- |
| `src/app/api/auth/sync/route.ts` | Syncs Privy identity into Supabase `users`. |
| `src/app/api/streams/route.ts` | Creates stream records. |
| `src/app/api/streams/heartbeat/route.ts` | Records OBS/overlay heartbeat. |
| `src/app/api/ads/route.ts` | Creates ad + generated deposit-address payment records. |
| `src/app/api/payments/verify/route.ts` | Polls Solana payment status and activates ads automatically. |
| `src/app/api/dex/search/route.ts` | DexScreener search proxy. |
| `src/app/api/dex/pair/route.ts` | DexScreener pair lookup proxy. |
