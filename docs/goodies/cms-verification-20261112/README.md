# Goodies CMS coverage — 12 November 2026

This change completes source registration and manual fields for the 34 customer routes in the current main application. It does **not** certify the entire Goodies ecosystem as production ready. No database migration, content publication, provider transaction, secret change or app deployment was performed.

The customer base includes the concurrent Android navigation-bar fix (`a5be9734`); Goodies source parity was also compared with `267e2286`. Admin base: `e65ff54`. Existing production-readiness branches were preserved.

## Implemented

- 1,214 source-registered text fields, 64 page/shared groups, all 34 navigation routes. Literal JSX copy, checkout summary wording, menu/filter labels, builder feedback, wallet/card copy and interface translations use the existing v5 CMS label architecture.
- Manual fields follow the existing page groups. FAQ/support topics/policies, promotions, assets and restriction wording have separate organized controls. Existing records/translations and unknown configuration fields are retained when missing labels are merged.
- Customer/vendor/account records and monetary values remain outside platform text editing. Payment configuration keys and financial settings keep their existing controls.
- Phone preview mirrors current customer components, including current sharing/group-order code. Explicit field identity avoids selecting a customer or vendor value merely because its text matches a platform label. Existing structured content and builder editing targets are preserved.
- Draft locale selection is synchronized with the editor; zoom and page shortcuts cover all routes. Backend, storage, clipboard, camera, GPS, links and card/provider operations are confined to local preview adapters. Maps and provider widgets identify their preview boundaries instead of pretending to be live.
- Shared wallet/card APIs accept optional Goodies labels; existing callers retain their default wording. Editable embedded HTML is escaped. Card verification errors use safe app-owned copy.
- Asset listing paginates with the existing RLS-protected table and fails instead of silently returning incomplete assets.
- No layout redesign. Across 2,200 existing customer/shared visual attributes, changes are limited to fixing an undefined theme color in the unavailable-store state and adding the missing secure-card network retry control. Other existing visual attributes remain unchanged.

## Verification

**PASS:** 7 consumer and 19 admin node:test cases; 34 isolated browser route renders; 11 browser interactions covering identity selection, draft reload, locale, zoom, structured FAQ/support/policy rendering and blocked financial/publication transports. Synthetic fixture text is isolated in the editor. All registered fields are exercised in all five locales through edit/serialization/lookup tests; this is technical coverage, not human translation approval.

**PASS:** source register check, no direct JSX text/label bypass in scanned Goodies screens/components, literal label registration, internal-state comparison guard, customer/shared lint with zero errors, admin Android/iOS Expo exports. These exports are unsigned JavaScript/Hermes bundles, not signed device builds.

**FAIL — pre-existing project checks:** customer has 9 TypeScript errors outside Goodies, and its full Android export stops at missing `expo-sensors` in Gatherz. Admin has 31 existing TypeScript errors in shared People/staff code. No new errors remain in the modified Goodies/CMS or shared wallet/card files. Lint warnings are recorded separately.

**NOT VERIFIED:** authenticated hosted draft save/publication and installed customer reload, live asset authorization, native widgets/physical devices, signed app builds and deployment. Publishing was deliberately not executed. Source/runtime tests do not establish production-wide readiness.

**NOT VERIFIED:** approved legal documents, FAQ wording and human-reviewed Haitian Creole. Existing content is preserved, not invented or approved. Unfinished Creole retains its review status and falls back to English in production; admin draft previews may display draft translations.

## Reproduce

With both repos checked out as siblings and dependencies installed:

```sh
cd tiss_tiss_beta
npm run check:goodies-cms
npm run test:goodies-cms
cd ../tiss-admin
npm run test:goodies-cms
npm run typecheck
```

`npm run sync:goodies-cms` in the customer repo regenerates the catalog and current-source preview in the sibling admin checkout. It never publishes. Admin tests explicitly skip the two paired-source parity checks if the customer checkout is absent; both ran and passed for this report. Each repository's existing validation workflow now runs its CMS regression checks. A clean GitHub install exposed an undeclared QR-code dependency for the mirrored group-order preview; it was added along with a regression test that checks all preview imports against declared packages.

Evidence JSON/logs accompany this report. Browser harness files are preserved as `.txt` outside application compilation; they used local Chromium/Playwright and esbuild with font/gradient/safe-area/icon adapters, and blocked external network requests. They verify local preview behavior rather than native visual fidelity or hosted publication.

## Screen register

A field may be shared by several pages; counts below are associations, not separate CMS copies. Source-only shared groups also include bottom sheets, accessibility labels, validation and courier wording.

| Route | Editor page | Text fields | Local preview |
|---|---|---:|---|
| `wantiss` | Wantiss entry | 5 | PASS |
| `home` | Home | 31 | PASS |
| `cats` | Categories | 1 | PASS |
| `orders` | Order history | 11 | PASS |
| `cart` | Cart | 48 | PASS |
| `grouporder` | Group orders | 113 | PASS |
| `explore` | Explore | 20 | PASS |
| `search` | Search | 34 | PASS |
| `catlist` | Category / store results | 11 | PASS |
| `store` | Store | 50 | PASS |
| `reviews` | Store reviews | 14 | PASS |
| `product` | Product | 27 | PASS |
| `checkout` | Checkout | 106 | PASS |
| `help-pay-preview` | Help Pay walkthrough | 50 | PASS |
| `addcard` | Add card | 26 | PASS |
| `cardauth` | Card verification | 9 | PASS |
| `confirm` | Order confirmation | 10 | PASS |
| `track` | Order tracking | 86 | PASS |
| `notifs` | Notifications | 9 | PASS |
| `promos` | Promotions | 5 | PASS |
| `flashdeals` | Flash deals | 5 | PASS |
| `favs` | Favorites | 6 | PASS |
| `byo` | Build Your Own | 75 | PASS |
| `help` | Help / FAQs | 4 | PASS |
| `settings` | Settings | 21 | PASS |
| `profile` | Profile | 9 | PASS |
| `addresses` | Addresses | 39 | PASS |
| `payments` | Payment methods | 29 | PASS |
| `contact` | Contact support | 20 | PASS |
| `storechat` | Store conversation | 15 | PASS |
| `supdone` | Support confirmation | 5 | PASS |
| `policies` | Policies | 4 | PASS |
| `policy` | Policy document | 6 | PASS |
| `ndetail` | Notification detail | 3 | PASS |
