# Wantiss Admin shared-backend contract

## Shared backend

- Supabase project: `https://ycbirmgppwavorwudlrv.supabase.co`
- Customer app: `momojdy/tiss_tiss_beta`
- Staff app: `momojdy/tiss-admin`
- Auth identity is `auth.users.id`. Never authorize staff based only on editable user metadata or email text.
- Admin access requires an active `wantiss_admin_staff` row tied to the authenticated user.
- Per-feature permissions use `view`, `edit`, and `manage`; expiry and revocation must be enforced server-side.
- CMS content is versioned with `draft`, `published`, and `archived` states. Customer reads expose published content only.
- The CMS asset bucket is private. Upload paths are scoped to the authenticated staff UUID and require explicit permission.
- Financial, refund, wallet, business-verification, and account-restriction operations must use narrow server-side RPCs or Edge Functions, not broad client table writes.
- Sensitive mutations must produce trusted server-side audit records.

## Bootstrap lifecycle

The `wantiss-admin-bootstrap` Edge Function is a one-time bootstrap mechanism, not an ongoing admin API. It must only bind the already-authenticated user, never accept a target user ID or email from request input, and fail closed if required server-held configuration is absent.

The function remains deployed at the time of this audit. After verifying that the intended Super Admin can sign in and manage staff:
1. Delete `wantiss-admin-bootstrap` from Supabase Edge Functions.
2. Delete `WANTISS_SUPER_ADMIN_BOOTSTRAP_SECRET` from Supabase function secrets.
3. Confirm the function no longer appears in the deployed function inventory and no production workflow depends on it.

## Release gates

- Verify production environment variables point to the intended Supabase project and use only a publishable client key.
- Test Auth and staff status/permission boundaries against real server operations.
- Test business application review, document access, business verification, Goodies publishing, order lifecycle, wallet and refund reconciliation.
- Reconcile migration history on a disposable branch. Never delete rows from `schema_migrations` or replay old migrations on production.
- Review SECURITY DEFINER execute grants individually; do not blanket-revoke intentional public reads or authenticated functions with validated caller checks.
- Complete the manual Auth security settings and real-business launch checks before calling the apps production-ready.
