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

## Validation

Run `npm run typecheck` and test the actual app before releasing. A successful typecheck alone does not establish production readiness. Review Supabase security advisors, permissions and application logs after backend changes.
