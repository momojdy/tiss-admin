# Step 1 — CMS preview route implementation and local acceptance

2026-11-06. **Local implementation verified; hosted acceptance NOT VERIFIED.** This does not certify Goodies production readiness.

## Implemented

- The preview selector derives from the actual customer page catalog: all 33 registered routes, including group orders, add-card and card authentication. Builders keep the existing selector and organization.
- Group-order and card screens mirror the current customer components, with recorded source hashes and visual-attribute parity tests. Existing UI primitives and overlays match customer styling. No customer application screen or production backend was modified in this step.
- Explicit CMS field identities make duplicate/dynamic labels selectable. Ambiguous legacy labels offer a field chooser. Disabled input placeholders have a separate edit hit target. Enabling edit mode preserves the current page.
- All mirrored backend and device-storage imports use local adapters. Checkout, refund, publication, arbitrary database writes and payment calls are rejected. Native bank HTML is never executed; camera/share/storage boundaries cannot contact production. Assets may still render their existing published URLs.
- Group/card fixtures cover default, loading, error, host, guest, saving and success views where applicable. These are deliberately selected editor fixtures, not saved orders, payments or cards. Native bank challenges/camera output are external surfaces and are explicitly unavailable in the CMS phone preview.
- A reproducible `scripts/sync-goodies-preview.cjs` in the customer repository refreshes the mirrored group/card components, adds CMS identities and reapplies local transport boundaries. The admin manifest identifies exact source provenance.

## Evidence

| Check | Result |
| --- | --- |
| Admin access tests | PASS — 4 |
| Admin CMS/preview tests | PASS — 17 |
| Customer CMS tests | PASS — 4 |
| Both TypeScript checks | PASS |
| Configured customer lint | PASS |
| Source CMS catalog | PASS — 1,253 fields / 33 routes; 612 critical fields in candidate publication guard |
| All registered label fields through local edit/save/review serialization/customer resolver | PASS — synthetic values in all five existing locales |
| Group/card source visual attributes and source hashes | PASS — regression checks, not screenshot/device acceptance |
| Android/iOS admin JS/Hermes exports | PASS — both platforms; signed native builds are NOT VERIFIED |
| Hosted authenticated edit → draft preview → publish → customer reload | NOT VERIFIED |
| Every phone control and modal visually exercised on a device | NOT VERIFIED |
| Real human review of translations/legal/support copy | NOT VERIFIED |

Logs and per-route classifications accompany this file. Tests exercise the actual editor serializers, publication guards, customer lookup and local transport ports. They do not publish real content or certify the deployed publication guard. Existing candidate migrations remain undeployed.

## Remaining acceptance boundary

An authorized admin/customer session and approved reviewed content are needed to perform hosted publishing acceptance on main. That check changes published customer content and was not authorized by merely selecting this implementation step. No alternate Supabase project was restored, no production content was published and no production schema or financial data changed. Obtain explicit publishing approval for a concrete reviewed draft before that final acceptance action. Device interaction/visual acceptance also remains required; bundle success alone does not establish it.
