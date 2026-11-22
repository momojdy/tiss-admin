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
