# Wantiss Admin

Wantiss Admin is the staff operations app built with Expo, React Native and TypeScript. It uses the shared Wantiss Supabase project for staff authentication, server-managed permissions, staff records, application review and connected operational data.

## Run

```sh
npm install
npx expo start
npm run typecheck
```

## Authentication and access

- Staff sign in with Supabase Auth using an invited, email-confirmed account.
- Staff access is checked against `wantiss_admin_staff`; inactive, revoked, expired or unaccepted invitations are rejected.
- Permission grants are loaded from Supabase and refreshed while the app is active.
- Self-registration is disabled. A Super Admin provisions staff invitations.
- No prototype password, fixed verification code, or local demo credential is supported by the sign-in flow.

## Backend status

The app is connected to Supabase, but not every workspace from the original HTML prototype has been ported. Screens that are not implemented must not be treated as production admin tools. Goodies has dedicated deployed operational contracts and 14 registered modules; full installed cross-role acceptance remains open. Its customer/vendor/courier implementation lives in `tiss_tiss_beta`.

## Goodies operating guide

Use the [current Goodies guide](https://github.com/momojdy/tiss_tiss_beta/blob/main/src/features/Goodies/README.md) for the full business flow and the [22 November audit](https://github.com/momojdy/tiss_tiss_beta/blob/main/docs/goodies/operating-guide-audit-20261122/README.md) for evidence. They distinguish the 10% discounted-product commission, 7% delivery commission and configurable customer service fee; Wallet-only Help Pay versus host-paid Group Orders; the 5,000 HTG outstanding cash-sales cap; the 24-hour hold; rolling weekly cash-commission deadline; payout timing; CMS/locales; owner deferrals; and remaining release checks.

Shared Bill Wallet funding, vendor settlement and private delivery-proof uploads are enabled in the live backend. External bank/GCash/MonCash/NatCash payout channels and device push rollout remain disabled. The CMS preview uses isolated fixture/device/backend ports; it must never execute production funding, refund or approval operations. Publishing and translation review are separate, and publishing unfinished content does not certify its translations or installed-app delivery.

## HTML parity restoration status

The HTML-to-React Native restoration is in progress on `main`:

- Overview and Analytics screens are registered and use the shared admin snapshot / HTML-aligned visual primitives.
- The shell now uses one scrolling surface, the Wantiss wordmark, HTML-sized section tabs, and a collapsible global dock for search, quick create, alerts, operations, export, and settings.
- Search opens permission-filtered record results and links to existing detail drawers.
- Content Studio now has Overview, Media, Banners, Promotions, Announcements, Calendar, Approvals, History, Editor, and CMS versions sections.
- Goodies has a dedicated module workspace; service modules use a shared data-driven workspace.
- Quick-create and Content Studio edit actions save private CMS drafts where the existing CMS endpoint supports it. They do not mutate demo seed records or publish automatically.

## Remaining production/parity gaps

- Service-specific workspaces are not yet individually ported pixel-for-pixel; the shared workspace is a first functional pass.
- Goodies merchant, moderation, order, fee and analytics operations have dedicated backend APIs. Nine legacy shared RPCs are still absent and can affect mixed-feature business workspaces; this is separate from Goodies-only contract coverage. Other service workspaces may still have incomplete snapshot/parity behavior.
- The full HTML customer-page drag-and-drop editor and standalone business-detail screen are not fully ported.
- Settings categories beyond personal appearance/notification preferences are stored locally only. They do not change production platform settings until a server-backed settings contract is implemented.
- Generic content approvals, banner/promotion lifecycle and announcement delivery still have workflow gaps. Goodies has a real CMS draft/publish lifecycle, but its coupon wording editor is not an authoritative discount-code creation/activation workflow. CMS drafts must not be treated as live placements.
- No Expo Go screenshot comparison or on-device interaction pass has been completed. A successful TypeScript check is not proof of pixel parity or production readiness.

## Validation

Run `npm run typecheck` and test the actual app before releasing. A successful typecheck alone does not establish production readiness. Review Supabase security advisors, permissions and application logs after backend changes.

Goodies operational promotions now use **Goodies → Promotions**, with Finance view/manage permissions. Percentage/free-delivery terms, eligibility, redemption limits and audit are server-owned. See the [confirmed-gap repair evidence](https://github.com/momojdy/tiss_tiss_beta/blob/main/docs/goodies/confirmed-gap-repairs-20261122.md). Historical mixed-workspace/promotion findings in earlier reports are superseded only within that documented scope.

## Konsoliss integration checkpoint — 2026-11-25

The [consumer's master Konsoliss business README](https://github.com/momojdy/tiss_tiss_beta/blob/main/src/screens/Konsoliss/README.md) is authoritative for the latest 0A–0E decisions, including Haiti's verified-receipt-to-pickup Day-80 obligation, three-country architecture, source-of-truth reservation/loading distinction and approved 3D interface.

**Connected and applied in shared Supabase project `ycbirmgppwavorwudlrv`:** `20261125071000_konsoliss_reconciliation_and_custody_foundation.sql` (GitHub Admin commit `ebcb1c62`) and `20261125071700_konsoliss_service_request_manual_triage.sql` (`889e3fde`). These add RLS-protected entitlement-right/movement records, immutable itemized adjustment version snapshots, consignment/piece identity, per-piece customs decisions, service-specific lot commitments, partner cases and customer service-request statuses; the manual request RPC authorizes only active Super Admin staff.

**Admin UI:** `src/features/admin/screens/konsoliss/KonsolissBookingOperations.tsx` commits `b44e9b4a` and `76394b36` add customer refund/return/alternative/claim request review and bind approved quote scopes to route, destination, equipment and cargo. This is a real database connection, not a demo local store. Approval is **not** a refund capture, actual cargo return, or shipping fulfillment.

**CMS:** `src/features/admin/screens/content/KonsolissBookingCopyEditor.tsx` commit `c5b880b7` adds new service-request labels to the existing localized booking-copy draft/publish process. Operational prices, entitlements, live shipping status and profit cannot be authored in copy CMS.

**Preserved:** existing homepage and 3D renderer, consumer/admin homepage preview sync, original CMS editor, feature theme and approved Book Space layout. No customer billing route was enabled; the hard `checkout_enabled=false` protection remains in place.

**Verified now:** Both migrations applied successfully; read-only SQL confirmed eight new public tables have RLS and read policies; live financial, rights, quoted-payment, request and partner tables contained zero data at verification. Separate standalone HTML simulator: 11 targeted engine checks and 5 Chromium journey groups passed, including 320/390/1280 responsive smoke checks. These tests do **not** establish native React Native pixel parity, successful Expo device build, Supabase authenticated cross-role runtime flow or provider settlement.

**Still blocking production:** verified payment provider signatures and atomic order/capacity ledger; backend-owned parcel/warehouse status transitions with actual staff scans; enforceable financial settlement and refund implementation; actual partner rate cards/custody evidence and cross-border guarantees; operational margin/customs underwriting; security/TypeScript/native device integration suite; remove/disable demo selectors for public builds. There is no valid claim that Konsoliss is production ready. Do not turn simulated HTML financial events into live financial records or add fictitious shipments.


**Further Konsoliss verified foundations (2026-11-25):** Both repositories and live Supabase now additionally include `20261125074200_konsoliss_declared_tracking_and_receipt_actions.sql` (corrected migration consumer `fdc74dd8`, Admin `7b6708c9`) and `20261125075400_konsoliss_atomic_entitlement_balance_view.sql` (consumer `97422bcd`, Admin `d06cd7c3`). Admin operations `KonsolissBookingOperations.tsx` commit `f6f6b97e` adds manual carrier first-scan verification and staff warehouse receiving with unique receipt evidence and verified measured CBM/kg; customer Book Space commit `19529bfa` includes authenticated piece declaration and tracking and a secure per-right balance display. CMS booking editor commit `02043ebc` exposes the corresponding copy fields. Haiti LCL's Day80 is tied to verified eligible warehouse receipt; US/DR/FCL **do not** automatically inherit it. No fake carrier/loaded cargo or live customer financial records were inserted; default checkout remains locked. SQL privilege checks confirmed no anon declare/receive and no direct authenticated entitlement minting/tracking acceptance. Local prototype: 11 Node and 5 Chromium check groups pass; V6/V7 starting sheet pixel-identical at 390/1280, **not** independently tested on native iOS/Android. Full paid order-to-Admin-to-consumer cross-role UAT, real payment, partner custody, refunds, claims settlement and legal/commercial activation are BLOCKED.
