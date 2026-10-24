# Wantiss shared-backend audit

Audit date: 2026-10-24

## Scope and evidence

Reviewed repository package manifests, application entry points, admin authentication and state stores, Goodies content provider, Supabase project metadata, public schema, migrations, storage buckets/policies, Edge Function inventory, and current Supabase security/performance advisor output.

## Tiss Tiss Beta

- Expo React Native app, package version 1.10.0, uses `@supabase/supabase-js` and configures `src/lib/supabase.ts` from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Supabase auth persists sessions with AsyncStorage and starts/stops token refresh with app lifecycle.
- Goodies is not a live catalogue/content integration. `src/features/Goodies/store.ts` builds stores, inventory, availability, pricing, addresses, notifications and wallet state from local seeds and generated values. It includes a demo guest profile, demo wallet balance, demo notifications, and random vendor visibility (`Math.random()`).
- `src/features/Goodies/content.ts` uses device AsyncStorage for imported admin export JSON and falls back to seed data. This is not shared backend publishing.
- Existing Supabase configuration is not proof that every feature is backed by Supabase.

## Tiss Admin

- Package version 0.12.0 has no Supabase client dependency or backend configuration.
- `src/features/admin/state/db.ts` clones `seed.json` and `authSeed.json` into in-memory state. Changes are lost on restart.
- `src/features/admin/auth/authLogic.ts` compares local credentials, uses a fixed MFA code, and derives staff emails from local seed records.
- Staff roles, status, grants, temporary access, notifications and audit history are client-side state. Client-only checks cannot securely enforce authorization.
- `README.md` identifies Overview, Analytics, Content, Customer page editor, Business detail, service workspaces, Potssy, Goodies, and search/quick-create/settings panels as not ported.
- README notes the app has not been rendered on a device. Neither app was launched locally as part of this remote audit.

## Supabase

- Project `Wantiss`, ref `ycbirmgppwavorwudlrv`, region `us-east-1`, status `ACTIVE_HEALTHY`.
- Existing schema includes profiles, notifications, vendor fulfillment, wallet, Stayz and other feature tables, but no admin staff, admin permission, CMS content or admin asset metadata tables were found.
- 50 public tables have policies; 98 public policies were reported. `public.account_modes` has RLS enabled with no policy, denying API access by default until an intentional policy is added.
- Storage currently has private `flyz-moments` and public `wallet-avatars` buckets. No admin-managed CMS asset bucket was found.
- Security advisor reports six functions with mutable search paths and 45 SECURITY DEFINER functions executable by `anon`. Review each against intended anonymous use before changing permissions; a blanket revoke may break legitimate flows.
- Performance advisor reports nine unindexed foreign keys and 32 RLS policies with auth initialization-plan warnings.
- Migration history includes duplicate names and repeated feature fixes. Reconcile migration history and repository migration files before further production schema work.

## Required implementation sequence

1. Add an additive admin authorization/CMS schema with RLS and a controlled first-super-admin bootstrap. Never bootstrap from a client-supplied email.
2. Replace local admin password/MFA logic with Supabase Auth. Link staff access to `auth.users.id`; enforce status, role, per-permission overrides, expiry and revocation server-side.
3. Persist staff actions and audit permission changes and administrative mutations.
4. Add protected asset storage and versioned CMS drafts/published content. Public clients may read published content only; authorized staff may edit/publish.
5. Connect Goodies and other app content to the shared CMS with loading, empty and error states. Remove demo catalogue, wallet and business values from production paths.
6. Port and test missing admin screens and workflows from the existing HTML spec.
7. Add CI for both apps, install dependencies, run TypeScript checks and Expo validation/export, then test end-to-end flows against a non-production Supabase environment.
8. Re-run Supabase advisors and test staff privilege boundaries before merging or promoting to production.

## Verification limits

Repository source, Supabase metadata, and advisor output were inspected remotely. Neither app was launched in a local simulator/device, no end-to-end test was executed, and no production schema changes were made as part of this audit. Do not describe the apps as connected until implementation and tests are complete.
