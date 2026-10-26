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

The app is connected to Supabase, but not every workspace from the original HTML prototype has been ported. Screens that are not implemented must not be treated as production admin tools. Goodies-specific administration remains incomplete; the customer/vendor Goodies workflow is in `tiss_tiss_beta`.

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
- Goodies merchant, product-review, order, fee/rule, and analytics actions still need dedicated server-backed APIs. Several lists are based on the current seed/snapshot.
- The full HTML customer-page drag-and-drop editor and standalone business-detail screen are not fully ported.
- Settings categories beyond personal appearance/notification preferences are stored locally only. They do not change production platform settings until a server-backed settings contract is implemented.
- Content approvals, banner/promotion lifecycle, and announcement delivery still need server-side workflow endpoints. CMS drafts must not be treated as live placements.
- No Expo Go screenshot comparison or on-device interaction pass has been completed. A successful TypeScript check is not proof of pixel parity or production readiness.

## Validation

Run `npm run typecheck` and test the actual app before releasing. A successful typecheck alone does not establish production readiness. Review Supabase security advisors, permissions and application logs after backend changes.
