# Wantiss Admin shared-backend implementation baseline

The current admin app is still a local prototype: local seed-backed sign-in, fixed verification code, in-memory grants, and non-persistent screen data. Do not use the demo credentials for a real account.

Backend contract:
- Supabase project: `https://ycbirmgppwavorwudlrv.supabase.co`
- Auth identity is `auth.users.id`; never authorize staff based on editable user metadata or email text alone.
- Admin access must require an active `wantiss_admin_staff` row.
- Per-feature permissions use `view`, `edit`, and `manage`, with server-enforced expiry and revocation.
- CMS content is versioned and has separate `draft`, `published`, and `archived` states.
- Published customer content is public; staff drafts remain protected.
- The CMS asset bucket is private. Upload paths are scoped to the authenticated staff UUID and require explicit permission.
- Financial, refund, wallet, and account restriction operations must be narrow server-side RPCs, not broad table write access.

First Super Admin bootstrap:
1. Create the intended administrator's account through Supabase Auth and sign in as that account.
2. Set a strong random `WANTISS_SUPER_ADMIN_BOOTSTRAP_SECRET` as a Supabase Edge Function secret.
3. Deploy the `wantiss-admin-bootstrap` Edge Function only after the migration is applied and the secret is set.
4. Call it with the signed-in user's bearer token and the bootstrap secret header once. The function rejects bootstrap if a Super Admin already exists.
5. Remove the bootstrap secret from the function environment after successful use and redeploy/disable the bootstrap function.

The bootstrap function fails closed when any required environment value is absent. It must never accept a target user ID or email from the request body.
