# TODO Prompts

Use these prompts in later implementation passes.

## Dynamic Pricing

`Implement dynamic pricing inside getPricing() so BASE and PRIORITY can change every 10 minutes without breaking the existing API shapes or buyer page flow.`

## Helius Webhooks

`Replace polling-only payment confirmation with Helius webhook support while keeping the current /api/intent/status polling path as a fallback.`

## Pump.fun Parser Hardening

`Add snapshot fixtures and parser fallbacks for pump.fun/live and pump.fun/coin pages so scraper regressions fail tests instead of production traffic.`

## Retryable Payout Worker

`Move payout forwarding retries out of the status poll path into a dedicated worker or scheduled reconciliation route that safely retries FAILED intents.`

## Streamer Access Control

`Add lightweight streamer authentication or signed management links so only the registered streamer can trigger sensitive control actions on /[slug].`

## Lease Analytics

`Add aggregate reporting for purchases, activations, viewer-adjusted CPM, and payout totals per stream while preserving the current Firestore schema compatibility.`

## Handover Operations

`Add an ops/admin playbook for inspecting stuck intents, failed payouts, stale live index refreshes, and overlay verification issues.`
