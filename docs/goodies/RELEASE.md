# Goodies admin release verification — 2026-11-06

**NOT READY for production release.**

Continue on the existing `goodies/production-readiness` branch. Initial head:
`e65ff541bef118e6c9e4f82137838a03152d8bed`; the initial working tree was clean.

Implemented admin changes:

- Correct canonical permission keys and deny signed-out/revoked/expired access.
- Persist permanent-ban appeals through authorized audited backend actions; no local fake success.
- Route product-submission notices to actual product review; show notification read failures.
- Add editable reviewed-only notification templates to the existing CMS.
- Four admin permission regression tests pass (`npm test`).

- Align runtime packages/lockfile with Expo SDK 58 compatibility requirements.
- Resolve private delivery-evidence references through authorized short-lived
  signed URLs, with an accurate unavailable-photo state.
- Include the customer source's literal CMS labels in the starter draft without
  replacing existing edited fields or marking translations reviewed.
- Expand isolated preview destinations, language selection, zoom, and synthetic
  confirmation/tracking fixtures. No real orders/payments are created by fixtures.
- Preserve existing customer-facing layouts; preview controls are confined to
  the admin editor. Full visual parity remains NOT VERIFIED.

| Check | Result | Evidence |
| --- | --- | --- |
| Expo Doctor | PASS | `evidence/tiss-admin-doctor.log`, 20/20 |
| Android/iOS JS/Hermes exports | PASS | Successful platform bundle logs |
| TypeScript | PASS | Shared people/staff errors repaired; current check exits 0 |
| Private proof authorization | PASS | Targeted synthetic PostgreSQL migration tests in customer repository |
| Live Storage signed URLs | NOT VERIFIED | Requires staging role accounts and actual Storage service |
| Every admin action and restricted-staff boundary | NOT VERIFIED | Full authenticated role suite not run |
| CMS publish → consumer E2E | NOT VERIFIED | No production content publication used as a test |
| Complete five-language review and preview parity | NOT VERIFIED | Translation coverage is incomplete; no human review was fabricated |
| Native signed builds/device behavior | NOT VERIFIED | JS export is not native compilation or device testing |

The shared report, screen register, machine-readable inventory, exact implementation
commits/changed files, migration tests and rollout/recovery gates are in
[the customer repository's release report](https://github.com/momojdy/tiss_tiss_beta/blob/goodies/production-readiness/docs/goodies/RELEASE.md).

The private-proof protocol requires coordinated viewer/vendor rollout and supported
client versions. Do not deploy it independently or make the private bucket public.
No production database, secrets, financial records, charges, CMS publication or
production-branch merge was changed during this work.
