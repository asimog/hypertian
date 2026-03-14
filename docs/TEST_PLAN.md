# CAMIKey Test Plan

## Automated Regression Coverage

### Queue Kernel

`tests/kernel.test.ts`

- BASE keeps running before the 120s guarantee.
- PRIORITY preempts BASE after the guarantee and sets cooldown.
- PRIORITY does not preempt PRIORITY.
- Expired lease reverts to the default streamer chart when the queue is empty.

### Purchase Gating

`tests/gating.test.ts`

- purchase allowed when live + heartbeat fresh + verification fresh
- purchase denied when live status is stale
- purchase denied when heartbeat and verification are stale

### Overlay Verify Handshake

`tests/overlay-verify.test.ts`

- pending while a verify nonce is active
- success after overlay completion
- failed after nonce expiry
- overlay key hash validation

## Manual Functional Pass

### Registration

1. Open `/start`.
2. Enter a real Pump.fun deployer wallet, streamer coin mint, and slug.
3. Confirm the registration succeeds only when Pump.fun metadata matches.
4. Confirm the overlay URL includes a one-time `k=` value.

### Overlay Verification

1. Load the overlay URL in OBS Browser Source.
2. Open `/<slug>`.
3. Click `Verify overlay`.
4. Confirm the success message:
   - `Verified. We detected your OBS overlay running.`
5. Stop OBS or hide the Browser Source and retry.
6. Confirm the failure message:
   - `Not detected. Open OBS, switch to the scene with the overlay, then try again.`

### Live Index + Ads

1. Ensure a registered stream is live on Pump.fun.
2. Open `/ads`.
3. Confirm the stream appears with viewers sorted descending.
4. Confirm buy availability depends on:
   - live freshness
   - heartbeat freshness
   - verification freshness

### Purchase Flow

1. Open `/<slug>`.
2. Select `BASE` and create an intent.
3. Confirm a unique deposit address is returned.
4. Send the exact SOL amount.
5. Confirm `GET /api/intent/status` transitions:
   - `PENDING_PAYMENT`
   - `CONFIRMED`
6. Confirm the lease shows `QUEUED` or `ACTIVE`.

### Queue / Overlay Behavior

1. Start with no leases active.
2. Purchase a `BASE` lease and confirm the overlay swaps to the buyer mint.
3. Purchase another lease and confirm it queues.
4. Purchase a `PRIORITY` lease during an active BASE and confirm:
   - it does not preempt before 120s
   - it can activate after the guarantee window

### Payout Forwarding

1. After payment confirmation, inspect the intent document.
2. Confirm:
   - `payoutStatus`
   - `forwardTxSignature`
   - streamer / treasury lamport fields
3. Confirm 90/10 split with fees deducted from commission.

## Deployment Checks

- Firestore indexes deployed from `firestore.indexes.json`
- `PLATFORM_TREASURY` configured
- `PAYMENT_ENCRYPTION_KEY` configured
- `SOLANA_RPC_URL` configured
- cron caller configured for `POST /api/live-index/run` if external scheduling is used

## Known Manual Gaps

- No Solana RPC mock harness yet for end-to-end deposit + forwarding tests.
- No browser automation yet for OBS verification because real OBS Browser Source is required.
- No Pump.fun fixture snapshot test yet for the live-page parser.
