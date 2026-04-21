# Migration Notes

- Firebase config, hosting files, and Firestore-dependent routes were removed.
- The repo now targets Hypertian rather than the original CamiKey marketplace flow.
- Shared overlay primitives now live in reusable components:
  - `DexChart`
  - `MediaBanner`
  - `OverlayDisclosure`
  - `OverlaySurface`
- Platform lanes are separated by route:
  - `/x-overlay`
  - `/youtube-overlay`
  - `/twitch-overlay`
  - `/pump-overlay`
- The Pump lane remains a dedicated route namespace (`/pump`) while the X lane is the most polished overlay route.
- Supabase is the backend contract and the exact schema lives in `supabase/migrations/001_initial.sql`.
- Privy is the auth layer and user sync happens through `/api/auth/sync`.
