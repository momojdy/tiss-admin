# Tiss Admin shared-backend audit

Audit date: 2026-10-26
Shared Supabase project: `ycbirmgppwavorwudlrv`

## Current implementation

- `src/features/admin/lib/supabase.ts` configures Supabase Auth using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, persists sessions with AsyncStorage, and handles auth deep links.
- `AuthFlow` uses Supabase password authentication, requires confirmed email, validates the linked `wantiss_admin_staff` row and invitation status, loads server permission grants, and hydrates backend data.
- `AuthGate` restores sessions and periodically rechecks staff status, email confirmation, invitation expiry, idle timeout and permission grants.
- `adminBackend.ts` calls the shared dashboard snapshot RPC, staff Edge Function, business application/document RPCs, CMS RPCs, account restriction RPCs, and financial request/refund workflows.
- `hydrateAdminState.ts` maps server snapshot results into the existing in-memory UI model. The UI model itself is not the database: a screen showing no rows can reflect a denied/failed snapshot because some hydration calls intentionally catch errors.
- The customer app, vendor Business Space and admin app use the same Supabase project and shared records for Goodies orders, business verification, published content, wallet and financial operations where those backend contracts are implemented.

## Authorization contract

- Identity is `auth.users.id`; editable user metadata or email text alone must never confer staff privileges.
- Staff access requires an active `wantiss_admin_staff` record.
- Permission grants use server-checked levels, expiry and revocation.
- Financial changes, refunds, business verification, document status, CMS publishing and staff-management actions must use narrow server-side operations with trusted audit logging.
- Client-side permissions only shape the UI; database/RPC/Edge Function checks must independently enforce every operation.

## Known gaps and required checks

- `wantiss-admin-bootstrap` is still deployed. After confirming the intended Super Admin is functional, delete the Edge Function and its `WANTISS_SUPER_ADMIN_BOOTSTRAP_SECRET` manually.
- Leaked-password protection remains disabled in Supabase Auth and must be enabled in the dashboard.
- The public SECURITY DEFINER inventory still needs a complete function-by-function review. Two unguarded mutation helpers were restricted to `service_role` by forward-only migrations and verified in the live catalog; this does not replace the remaining review.
- Migration history has duplicate versions and drift. Reconcile only on a disposable branch. Never delete `schema_migrations` rows or replay old migrations on production.
- CMS asset upload/publish, business-document review, staff permission boundaries, finance/refund outcomes and admin-to-customer visibility still need controlled end-to-end tests.
- A real business must be verified and its Goodies store/products published through the admin app before the customer flow can be accepted as live.
- The consumer repository's Expo Doctor check currently fails due to dependency-version mismatches; fix and verify build compatibility before release.

## Release verification

1. Test sign-in, sign-out, invitation acceptance, reset links, session expiry and staff revocation.
2. Test Super Admin and restricted staff against server-side permission boundaries.
3. Test business verification and document review, including unpublishing when verification is removed.
4. Test Goodies publication, customer visibility, order acceptance/decline, cancellation, stock and refunds.
5. Test wallet reads and financial operations against real backend records and audit history.
6. Verify production build configuration and complete device smoke tests. Source integration alone is not proof of release readiness.
