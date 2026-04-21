# Hypertian

## Legal Disclaimer
Hypertian is a self-hosted tool for personal livestream overlays.
You are solely responsible for complying with platform rules (X, YouTube, Twitch, etc.), Paid Partnerships policies, and all laws.

Always enable native sponsorship disclosure where required.
Use at your own risk.

Not affiliated with any platform. No warranty.

Hypertian is a Next.js 15+ App Router project for running your own crypto-native advertising channel. It combines live DexScreener chart billboards, approved sponsor media, OBS-safe overlays, optional Privy authentication, generated Solana deposit addresses for ad activation, and Supabase data/storage into a self-hosted creator stack.

## Stack

- Next.js 15 App Router + strict TypeScript
- Tailwind CSS
- Optional Privy for creator auth + embedded Solana wallets
- Supabase PostgreSQL + Realtime + Storage
- Lightweight Charts for live chart rendering
- DexScreener REST + WebSocket for live token data
- Vercel-ready deployment model

## Lanes

- `/x-overlay`
  X-first, polished overlay route for OBS Browser Source and RTMP workflows.
- `/youtube-overlay`
  YouTube overlay lane using the same shared chart/media/disclosure engine.
- `/twitch-overlay`
  Twitch overlay lane with the same personal-tool model.
- `/pump-overlay`
  Pump overlay route for Pump.fun-focused usage.
- `/pump`
  Pump Ads lane, intended as the reusable multi-user platform box.
- `/dashboard/streamer`
  Creator dashboard for stream records, pending media jobs, and overlay URL generation.
- `/dashboard/sponsor`
  Sponsor workflow for launching chart + media proposals.

## Setup

### 1. Install

```bash
npm install
```

### 2. Create Supabase project

Set these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run the schema below in the Supabase SQL editor.

### 3. Configure Privy (optional)

Set:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_VERIFICATION_KEY=
NEXT_PUBLIC_SOLANA_RPC_URL=
```

If Privy is configured, creator login and user sync stay enabled. If Privy is omitted, the sponsor lane still works with generated Solana deposit addresses and automatic on-chain activation.

### 4. Storage bucket

Create a private Supabase Storage bucket named `ad-media`.

Create folders:

- `pending/`
- `approved/`

### 5. Run

```bash
npm run dev
```

## Supabase SQL Schema

```sql
create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  privy_id text unique not null,
  wallet_address text,
  role text default 'creator',
  created_at timestamptz default now()
);

create table if not exists streams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id),
  platform text not null, -- 'x', 'youtube', 'twitch', 'pump'
  is_live boolean default false,
  last_heartbeat timestamptz,
  created_at timestamptz default now()
);

create table if not exists ads (
  id uuid primary key default uuid_generate_v4(),
  stream_id uuid references streams(id),
  token_address text not null,
  chain text default 'solana',
  position text default 'bottom-right',
  size text default 'medium',
  is_active boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists media_jobs (
  id uuid primary key default uuid_generate_v4(),
  ad_id uuid references ads(id),
  sponsor_wallet text,
  media_path text,                    -- Supabase storage path
  media_type text,                    -- 'image', 'gif', 'video'
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  ad_id uuid references ads(id),
  tx_hash text unique,
  amount numeric(20,8),
  currency text default 'SOL',
  deposit_address text,
  deposit_secret text,
  status text default 'pending',
  verified_at timestamptz,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table ads, media_jobs, streams, payments;
```

## OBS Guide

Use a Browser Source with:

- Width: `1920`
- Height: `1080`
- Custom CSS: none
- Shutdown source when not visible: off
- Refresh browser when scene becomes active: on

Example X overlay URL:

```text
/x-overlay?token=So11111111111111111111111111111111111111112&chain=solana&position=bottom-right&size=large&theme=dark&showChart=true&showMedia=true
```

Common params:

- `token`
- `chain`
- `position=bottom-right|top-left|center`
- `size=medium|large`
- `theme=dark|light`
- `showChart=true|false`
- `showMedia=true|false`
- `mediaSrc`
- `mediaType=image|gif|video`
- `stream`

Every overlay keeps a fixed disclosure bar visible:

`Paid Partnership • Sponsored Chart + Media • DexScreener • Not financial advice`

## Payment Flow

- Sponsor creates an ad slot in `/dashboard/sponsor`.
- Hypertian generates a unique Solana deposit address for that payment.
- Sponsor sends the exact SOL amount to that address.
- The dashboard polls `/api/payments/verify` and activates the ad automatically once the deposit is confirmed.
- Privy remains available for creator auth, but it is not required for the sponsor payment path.

## DexScreener Notes

- Initial pair data comes from DexScreener REST token lookup.
- Realtime refresh uses the DexScreener WebSocket endpoint provided in the current Hypertian spec.
- The hook reconnects automatically and keeps a rolling history buffer for chart rendering.

## Migration Summary

- Firebase config, scripts, and Firestore-first data model were removed.
- The repo is being reshaped into Hypertian with shared overlay components and per-platform routes.
- X overlay is the highest-priority production surface.
- Supabase replaces the backend/state layer.
- Firebase was removed.
- Privy is now optional instead of mandatory.
- Sponsor payments use generated Solana deposit addresses and auto-activation.

## Deployment

Deploy to Vercel after adding the environment variables above. The project is App Router based and configured for standalone output.
