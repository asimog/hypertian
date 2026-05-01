# Summary of Changes

## 1. Removed "Sign-in optional" from header
**File:** `src/components/app-shell.tsx`
- Removed the text "Sign-in optional" from the header when Privy is not enabled
- The header now only shows the sign-in button or nothing when Privy is disabled

## 2. Modified OverlaySurface to show only chart OR banner (not both)
**File:** `src/components/OverlaySurface.tsx`
- Updated `showMedia` logic to only display when `isBannerAd` is true
- Previously: `showMedia = searchParams.get('showMedia') !== 'false'`
- Now: `showMedia = searchParams.get('showMedia') !== 'false' && isBannerAd`
- This ensures that when a banner ad is active, only the banner is shown
- When a chart ad is active (or no ad), only the chart is shown
- Added OBS overlay window size recommendation comment at the top of the component

## 3. Removed position options from ad creation
**Files:** 
- `src/lib/types.ts` - Changed `AdPosition` type from multiple options to just `'bottom-right'`
- `src/lib/overlay.ts` - Updated `positionSchema` to only allow `'bottom-right'`
- `src/app/api/ads/route.ts` - Updated position schema to only allow `'bottom-right'`
- `src/components/OverlaySurface.tsx` - Simplified `getPositionClass()` to always return `'bottom-10 right-6'`
- `tests/overlay.test.ts` - Updated test to remove position parameter from test URL

## 4. Key Behavior Changes

### Before:
- Users could choose between multiple positions (top-left, top-right, bottom-left, bottom-right, full)
- Both chart and banner could be displayed simultaneously if both `showChart` and `showMedia` were enabled
- "Sign-in optional" text was displayed in the header

### After:
- Position is fixed to `bottom-right` only (no user choice)
- Only ONE ad type is displayed at a time:
  - If banner ad is active → only banner is shown
  - If chart ad is active (or default) → only chart is shown
- "Sign-in optional" text removed from header
- Streamers can set OBS browser source to 1920x1080 (or their stream resolution) with the recommendation comment in the code

## 5. Files Modified
1. `src/components/app-shell.tsx`
2. `src/components/OverlaySurface.tsx`
3. `src/lib/types.ts`
4. `src/lib/overlay.ts`
5. `src/app/api/ads/route.ts`
6. `tests/overlay.test.ts`

## 6. Testing
All changes have been verified with automated checks to ensure:
- Sign-in optional text is removed
- AdPosition type is correctly updated
- Position schema only allows 'bottom-right'
- API route schema is updated
- OverlaySurface showMedia logic is correct
- OBS recommendation comment is present
- Test file is updated
