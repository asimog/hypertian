# Hypertian

## Legal Disclaimer
Hypertian is a self-hosted tool for personal livestream overlays.
You are responsible for complying with platform rules, paid partnership policies, and applicable law.

Always enable native sponsorship disclosure where required.
Use at your own risk.

Not affiliated with X, YouTube, Twitch, Pump.fun, DexScreener, Privy, Supabase, or Vercel.
No warranty.

## Overview

Hypertian is a Next.js App Router project for running a self-hosted crypto advertising lane on top of livestream overlays. The current repo combines:

- creator-facing overlay routes for X, YouTube, Twitch, and Pump.fun
- a streamer dashboard for generating stream records and OBS-ready URLs
- a sponsor dashboard for creating chart ad slots and funding them with on-chain SOL deposits
- Supabase-backed records for users, streams, ads, media jobs, and payments
- optional Privy auth for streamer-side identity and stream creation
- DexScreener-backed token search, pair lookup, and live chart rendering

The app is already beyond the migration phase: it has active routes, API handlers, Supabase migrations, and Vitest coverage for core parsing/data helpers.

## Stack

- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Supabase Postgres + Storage
- Privy for optional auth and embedded wallets
- Solana Web3.js for deposit-address generation and payment verification
- DexScreener REST data plus live chart polling/websocket helpers
- Vitest

## Current Product Surface

### Public routes

- `/`
  Landing page and lane entrypoint.
- `/x-overlay`
  Highest-priority overlay surface for X livestream workflows.
- `/youtube-overlay`
  YouTube-flavored overlay route using the shared overlay engine.
- `/twitch-overlay`
  Twitch-flavored overlay route using the shared overlay engine.
- `/pump-overlay`
  Pump.fun-flavored overlay route using the shared overlay engine.
- `/pump`
  Pump lane landing page.

### Dashboard routes

- `/dashboard/streamer`
  Stream management, OBS URL generation, and pending media job review surface.
- `/dashboard/sponsor`
  Sponsor campaign creation, generated deposit address display, and payment polling.

### API routes

- `POST /api/auth/sync`
  Upserts a Privy-authenticated user into Supabase.
- `POST /api/streams`
  Creates a stream record for `x`, `youtube`, `twitch`, or `pump`.
- `POST /api/streams/heartbeat`
  Marks a stream as live and refreshes `last_heartbeat`.
- `POST /api/ads`
  Validates a token against DexScreener, creates an ad, and creates a pending SOL payment.
- `POST /api/payments/verify`
  Checks whether a generated Solana deposit address has received the required payment and activates the ad on success.
- `POST /api/media-jobs/upload`
  Uploads sponsor media into Supabase Storage and creates a pending media job.
- `POST /api/media-jobs/review`
  Approves or rejects a media job and moves approved assets from `pending/` to `approved/`.
- `GET /api/dex/search`
  DexScreener search proxy.
- `GET /api/dex/pair`
  DexScreener pair lookup proxy by pair address or token address.

## Runtime Model

### Streamer flow

1. A Privy-authenticated streamer syncs identity through `/api/auth/sync`.
2. The streamer creates a stream record from `/dashboard/streamer`.
3. Hypertian generates an overlay URL for OBS Browser Source usage.
4. The overlay page sends a heartbeat every 15 seconds when a `stream` query param is present.
5. Active ads for that stream are expected to render through the shared overlay surface.

### Sponsor flow

1. A sponsor opens `/dashboard/sponsor`.
2. They choose a stream, token address, chain, position, and size.
3. `POST /api/ads` confirms a DexScreener pair exists and creates:
   - an `ads` record with an expiration window
   - a `payments` record with a generated Solana deposit address
4. The dashboard polls `POST /api/payments/verify`.
5. Once the required SOL amount lands, the payment is marked verified and the ad is activated.

### Media workflow

1. Sponsor media uploads go to the `ad-media` bucket under `pending/`.
2. Each upload creates a `media_jobs` row with `pending` status.
3. Review actions move approved files into `approved/` and mark the job as reviewed.

## Environment Variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HELIUS_RPC_URL=
```

### Optional

```bash
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_VERIFICATION_KEY=
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_PLATFORM_TREASURY_SOLANA=
CRON_SECRET=
DEXSCREENER_WS_URL=
```

Notes:

- Privy is optional for booting the app, but streamer-side creation/sync flows depend on it.
- `HELIUS_RPC_URL` is the preferred Solana RPC for payment verification on Vercel.
- `NEXT_PUBLIC_SOLANA_RPC_URL` remains available as a fallback if `HELIUS_RPC_URL` is omitted.
- Generated deposit-address verification currently supports `SOL` payments only.

## Local Setup

### 1. Install

```bash
npm install
```

### 2. Apply the database schema

Create a Supabase project, then run:

- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_payment_deposits.sql`

The second migration is additive and keeps `payments.deposit_address` and `payments.deposit_secret` present for existing projects.

### 3. Create storage

Create a private Supabase Storage bucket named `ad-media`.

Create these folders:

- `pending/`
- `approved/`

### 4. Set environment variables

Add the env vars listed above.

### 5. Start the app

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run typecheck
```

Node.js `>=20` is required.

## Data Model

The main tables live in `supabase/migrations/001_initial.sql`:

- `users`
- `streams`
- `ads`
- `media_jobs`
- `payments`

Realtime publication is enabled for:

- `ads`
- `media_jobs`
- `streams`
- `payments`

## Overlay Query Parameters

The shared overlay surface currently reads these common params:

- `token`
- `chain`
- `position`
- `size`
- `theme`
- `showChart`
- `showMedia`
- `mediaSrc`
- `mediaType`
- `stream`

Example:

```text
/x-overlay?token=So11111111111111111111111111111111111111112&chain=solana&position=bottom-right&size=large&theme=dark&showChart=true&showMedia=true&stream=<stream-id>
```

The repo also contains a CSV-style overlay parser in `src/lib/overlay.ts` that supports multi-slot query values such as:

```text
token=aaa,bbb&chain=solana,base&position=top-left,bottom-right
```

That parser is covered by tests and is useful context for future multi-slot overlay work.

## Defaults and Constraints

- Default sponsor price: `0.2 SOL`
- Default ad duration: `4 hours`
- Supported ad payment asset in the current flow: `SOL`
- Stream platforms: `x`, `youtube`, `twitch`, `pump`
- Ad creation validates the token by checking DexScreener before a payment record is created

## Testing

Current Vitest coverage includes:

- `tests/dexscreener.test.ts`
  Synthetic candle generation from DexScreener snapshots.
- `tests/overlay.test.ts`
  Overlay config parsing, including CSV-style multi-slot params.

Run:

```bash
npm run test
```

## Deployment

The app is Vercel-friendly and uses the App Router deployment model. Before deploying:

- set all required env vars
- apply both Supabase migrations
- create the `ad-media` storage bucket
- add `HELIUS_RPC_URL` so payment verification uses your Helius-backed Solana RPC

### Vercel notes

- This repo is configured for Vercel with [vercel.json](./vercel.json).
- Sponsor media uploads should use signed Supabase upload URLs through:
  - `POST /api/media-jobs/upload` to create a signed upload token
  - direct browser upload to Supabase Storage
  - `POST /api/media-jobs/complete` to create the `media_jobs` row after upload
- This avoids Vercel Function request-body limits on large multipart uploads.
- `GET /api/cron/payments` is available for optional Vercel Cron usage with `CRON_SECRET`. This is useful on paid plans when you want server-side payment reconciliation in addition to client polling.
- verify your Solana RPC endpoint is reachable in the deployment environment

## Repo Notes

- The package name and app branding are now `hypertian`.
- Firebase-era infrastructure has been removed from the active runtime path.
- `README.md`, [CODE_INDEX.md](/mnt/d/mythOS/CAMIKEY/CODE_INDEX.md), and [docs/MIGRATION_NOTES.md](/mnt/d/mythOS/CAMIKEY/docs/MIGRATION_NOTES.md) should be treated as the current documentation entrypoints.
