# CODE_INDEX

Generated against commit `82310ac`.

## Pages And App Routes

| File | Line | Purpose |
| --- | ---: | --- |
| `src/app/start/page.tsx` | 4 | `StartPage()` renders the streamer registration entrypoint. |
| `src/app/ads/page.tsx` | 11 | `AdsPage()` renders the live advertiser dashboard, sorted by viewers. |
| `src/app/[slug]/page.tsx` | 9 | `SlugPage()` loads stream data, pricing, gate status, and ticker events for the combined streamer/buyer page. |
| `src/app/o/[streamId]/page.tsx` | 5 | `OverlayPage()` validates the overlay key and mounts the OBS overlay client. |

## API Endpoints

| File | Line | Purpose |
| --- | ---: | --- |
| `src/app/api/stream/register/route.ts` | 11 | `POST()` registers a streamer, validates Pump.fun metadata, and returns the one-time overlay URL. |
| `src/app/api/stream/state/route.ts` | 13 | `GET()` serves overlay state, verify nonce data, and kernel chart changes to the OBS overlay. |
| `src/app/api/overlay/heartbeat/route.ts` | 15 | `POST()` records overlay heartbeat freshness and auto-renews verification for the verified session. |
| `src/app/api/overlay/verify/request/route.ts` | 10 | `POST()` creates the 30-second verify nonce. |
| `src/app/api/overlay/verify/status/route.ts` | 10 | `GET()` reports pending/success/failed/verified status back to the streamer page. |
| `src/app/api/overlay/verify/complete/route.ts` | 18 | `POST()` completes the nonce handshake from the overlay. |
| `src/app/api/live-index/run/route.ts` | 4 | `POST()` refreshes the Pump.fun live index for cron or manual triggering. |
| `src/app/api/intent/create/route.ts` | 11 | `POST()` creates a gated purchase intent and unique deposit address. |
| `src/app/api/intent/status/route.ts` | 4 | `GET()` polls payment status, queue state, and payout-forwarding progress. |

## UI Components

| File | Line | Purpose |
| --- | ---: | --- |
| `src/components/start-form.tsx` | 13 | `StartForm()` handles streamer registration and displays the one-time overlay key. |
| `src/components/overlay-client.tsx` | 15 | `OverlayClient()` polls `/api/stream/state`, sends heartbeats, and swaps the Dexscreener iframe. |
| `src/components/stream-page-client.tsx` | 88 | `StreamPageClient()` combines verify UX, purchase intent creation, payment polling, and the event ticker tape. |

## Stream, Overlay, And Live Index Core

| File | Line | Purpose |
| --- | ---: | --- |
| `src/lib/streams.ts` | 55 | `hydrateStreamRecord()` converts Firestore values into typed `StreamRecord` objects. |
| `src/lib/streams.ts` | 106 | `registerStream()` creates the stream, slug mapping, hashed overlay key, and initial event. |
| `src/lib/streams.ts` | 226 | `getStreamBySlug()` resolves the public slug to a stream record. |
| `src/lib/streams.ts` | 246 | `getStreamById()` loads a stream by canonical ID. |
| `src/lib/streams.ts` | 260 | `getLiveStreams()` returns live registered streams sorted in memory by viewers. |
| `src/lib/streams.ts` | 267 | `getRecentStreamEvents()` loads the last 20 ticker events for a stream. |
| `src/lib/overlay.ts` | 6 | `VERIFY_WINDOW_MS`, `VERIFIED_TTL_MS`, `HEARTBEAT_INTERVAL_MS`, `HEARTBEAT_STALE_MS`, `LIVE_STALE_MS` define the overlay freshness rules. |
| `src/lib/overlay.ts` | 24 | `getVerificationStatus()` computes `idle`, `pending`, `success`, `failed`, or `verified`. |
| `src/lib/overlay.ts` | 79 | `createVerifyChallenge()` writes the verify nonce and expiry window. |
| `src/lib/overlay.ts` | 101 | `completeVerifyChallenge()` marks the overlay session verified and bumps overlay state. |
| `src/lib/overlay.ts` | 117 | `recordOverlayHeartbeat()` keeps heartbeat freshness and verification auto-renewal in sync. |
| `src/lib/pumpfun.ts` | 34 | `fetchPumpCoinMetadata()` validates that the submitted mint and deployer wallet match Pump.fun. |
| `src/lib/pumpfun.ts` | 74 | `fetchPumpLiveEntries()` scrapes live mints and viewer counts from the current Pump.fun live payload. |
| `src/lib/live-index.ts` | 8 | `LIVE_INDEX_INTERVAL_MS` defines the ~45 second live refresh cadence. |
| `src/lib/live-index.ts` | 104 | `maybeRefreshLiveIndex()` refreshes the live scrape and writes `streams/{streamId}.liveStatus`. |
| `src/lib/live-index.ts` | 139 | `refreshLiveIndexFromCron()` guards the refresh route behind the optional cron secret. |
| `src/lib/gating.ts` | 20 | `getPurchaseGateStatus()` enforces live + heartbeat + verification gating. |
| `src/lib/pricing.ts` | 21 | `getPricing()` preserves the fixed pricing interface so dynamic pricing can slot in later. |

## Queue, Payment, And Intent Logic

| File | Line | Purpose |
| --- | ---: | --- |
| `src/lib/kernel.ts` | 5 | `MINIMUM_GUARANTEED_DISPLAY_MS` and `PREEMPT_COOLDOWN_MS` encode the fairness rules. |
| `src/lib/kernel.ts` | 52 | `hydrateLeaseRecord()` converts Firestore lease documents into typed records. |
| `src/lib/kernel.ts` | 105 | `evaluateLeaseQueue()` is the pure queue/preemption/cooldown decision engine. |
| `src/lib/kernel.ts` | 225 | `processStreamKernel()` applies queue decisions, rotates the overlay chart, and writes lease events. |
| `src/lib/payments.ts` | 12 | `INTENT_TTL_MS` defines purchase intent expiry. |
| `src/lib/payments.ts` | 43 | `createDepositWallet()` generates a unique Solana deposit address per intent. |
| `src/lib/payments.ts` | 57 | `observeDepositPayment()` checks the deposit address balance and recent signatures. |
| `src/lib/payments.ts` | 107 | `forwardDepositToRecipients()` forwards 90% to the streamer and the remainder minus fees to treasury. |
| `src/lib/intents.ts` | 41 | `hydrateIntentRecord()` converts Firestore intent documents into typed records. |
| `src/lib/intents.ts` | 82 | `createIntent()` performs gating, Dexscreener resolution, and intent creation. |
| `src/lib/intents.ts` | 172 | `expireIntent()` marks stale unpaid intents expired. |
| `src/lib/intents.ts` | 221 | `confirmIntentPayment()` creates the lease and queues it after payment detection. |
| `src/lib/intents.ts` | 335 | `pollIntentStatus()` drives buyer-side polling and queue advancement. |
| `src/lib/intents.ts` | 385 | `ensureIntentPayoutForwarded()` performs the idempotent payout-forwarding step after confirmation. |
| `src/lib/events.ts` | 4 | `upsertStreamEvent()` is the shared helper for deterministic event writes. |

## Regression Tests

| File | Line | Purpose |
| --- | ---: | --- |
| `tests/gating.test.ts` | 1 | Regression coverage for live, heartbeat, and verification gate combinations. |
| `tests/kernel.test.ts` | 1 | Regression coverage for queueing, preemption, cooldown, and revert-to-default behavior. |
| `tests/overlay-verify.test.ts` | 1 | Regression coverage for the nonce-based overlay verification handshake. |

## Docs

| File | Line | Purpose |
| --- | ---: | --- |
| `docs/ARCHITECTURE.md` | 1 | System architecture, data model, gating, fairness, and payout flow. |
| `docs/TEST_PLAN.md` | 1 | Automated and manual verification plan for the current implementation. |
| `docs/TODO_PROMPTS.md` | 1 | Follow-on implementation prompts for future work. |
