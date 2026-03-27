# CAMIKey Architecture

## Product Boundary

CAMIKey only supports Pump.fun livestreams and only swaps Dexscreener charts inside an OBS Browser Source overlay.

- No OBS plugins.
- No non-Pump streams.
- No banners, links, images, or video creatives.
- The default overlay chart is always the streamer coin mint.
- Sponsored swaps accept only the buyer token mint.

## Primary Routes

- `/start`: streamer registration.
- `/ads`: advertiser dashboard showing only live registered streams.
- `/[slug]`: combined streamer control page and buyer purchase page.
- `/jobs/[intentId]`: dedicated payment and queue tracker for a single buyer job.
- `/o/[streamId]?k=...`: OBS Browser Source overlay endpoint.

## Firestore Model

### `streams/{streamId}`

Holds the registered stream record, overlay verification state, live status, and the current kernel state.

- `deployerWallet`
- `streamerCoinMint`
- `defaultDexscreenerUrl`
- `overlay.*`
- `liveStatus.*`
- `kernel.*`

### `slugs/{slug}`

Maps the public slug to the canonical `streamId`.

### `streams/{streamId}/events/{eventId}`

Ticker-tape events for registrations, verification, purchases, lease transitions, and payout forwarding.

### `live_index/current`

Stores the last Pump.fun live scrape result:

- `indexedAt`
- `refreshIntervalMs`
- `streams[]`

### `intents/{intentId}`

Stores the purchase request, generated deposit wallet, payment status, and payout result.

### `leases/{leaseId}`

Stores the queue entry that eventually becomes the active overlay lease.

## Registration Flow

1. Streamer opens `/start`.
2. CAMIKey validates:
   - slug format
   - Pump.fun coin metadata exists
   - `creator` from Pump.fun matches the submitted deployer wallet
   - Dexscreener can resolve the streamer coin mint
3. CAMIKey creates:
   - `streamId`
   - one-time `overlayKey`
   - `overlayKeyHash`
4. CAMIKey returns:
   - `/<slug>`
   - `/o/<streamId>?k=<overlayKey>`

## Overlay Verification + Heartbeat

The overlay verification flow is nonce-based and requires no manual code entry.

### Handshake

1. Streamer clicks `Verify overlay` on `/<slug>`.
2. `POST /api/overlay/verify/request` writes `verifyNonce` with a 30 second expiry.
3. The overlay polls `/api/stream/state` every 500ms.
4. When the overlay sees the nonce, it calls `POST /api/overlay/verify/complete`.
5. The streamer page polls `GET /api/overlay/verify/status` until success or timeout.

### Freshness Rules

- Verification is valid for 12 hours.
- Overlay heartbeats arrive every 15 seconds.
- Purchase gating requires `lastHeartbeatAt < 30s`.
- Heartbeats auto-renew `verifiedAt` for the verified overlay session.

## Live Indexing

`maybeRefreshLiveIndex()` scrapes `https://pump.fun/live` roughly every 45 seconds and parses:

- `mint`
- `creator.address`
- `viewerCount`
- `linkUrl`

The live index then updates `streams/{streamId}.liveStatus` by matching the registered streamer coin mint.

Public pages read the latest stored live index state. They do not trigger a fresh scrape themselves.

Purchase creation is fail-closed unless the stream is freshly live:

- `isLive === true`
- `lastSeenAt < 90s`

## Purchase Gating

`POST /api/intent/create` rejects unless all three are true:

1. the stream is live
2. the overlay heartbeat is fresh
3. the overlay verification is fresh

Dexscreener resolution for the buyer mint is also required before an intent is created.

## Payment + Intent Flow

1. Buyer selects `BASE` or `PRIORITY` on `/<slug>`.
2. Buyer enters only the token mint.
3. CAMIKey creates a unique deposit wallet for that intent.
4. Buyer sends the exact SOL amount.
5. CAMIKey sends the buyer to `/jobs/[intentId]`.
6. `GET /api/intent/status` polls the deposit address until:
     - payment is detected
     - the intent expires
7. Once payment confirms:
    - the intent is marked confirmed
    - a lease is created and queued
    - the stream kernel is processed
    - payout forwarding is attempted

## Scheduled Lifecycle

Core lifecycle work is also available through `POST /api/scheduler/run`.

The scheduler route is intended for a cron or worker and runs four jobs in one pass:

- refresh the Pump.fun live index if it is stale
- settle pending intents by checking deposit wallets
- retry payout forwarding for confirmed intents that are not fully forwarded yet
- process streams whose `kernel.nextEvaluationAt` is due

This keeps fairness, payout retries, and live gating working even if no buyer is actively polling a page.

## Fairness + Queue Kernel

The overlay always renders `streams/{streamId}.kernel.currentDexscreenerUrl`.

Each stream also stores `kernel.nextEvaluationAt`, which is the earliest timestamp when the server needs
to reevaluate the queue again. That timestamp is used by both the OBS overlay poll path and the scheduler
so queued `PRIORITY` leases can preempt exactly when they become eligible, without forcing a Firestore
query every 500ms.

### Tier Durations

- `BASE`: `0.01 SOL` for `120s`
- `PRIORITY`: `0.04 SOL` for `600s`

### Rules

- Leases are queued.
- Once a lease becomes active, it gets a minimum guaranteed display time of `120s`.
- `PRIORITY` may preempt an active `BASE` only after:
  - the active `BASE` has displayed for at least `120s`
  - `preemptCooldownUntil <= now`
- After any preemption:
  - `preemptCooldownUntil = now + 120s`
- `PRIORITY` never preempts another `PRIORITY`; it queues.
- When there is no active lease, the kernel reverts to the streamer coin chart.

## Payout Forwarding

After payment confirmation, CAMIKey forwards funds from the unique deposit wallet:

- `90%` to the streamer deployer wallet
- `10%` commission to `PLATFORM_TREASURY`
- network fees deducted from the commission share

The payout result is written back to the intent:

- `payoutStatus`
- `forwardTxSignature`
- `streamerPayoutLamports`
- `treasuryPayoutLamports`
- `feeLamports`

## Why The Overlay Polls Server State

The overlay stays dumb on purpose.

- It only needs the latest Dexscreener URL.
- It never owns queue logic.
- It never calculates fairness or gating client-side.
- The server remains the source of truth for leases, expiry, and verification.
