# Konsoliss 3D container — acceptance audit, 2026-11-25

**Release decision: HOLD — not yet production-ready.** This is a separate 3D/homepage milestone, not commercial launch authorization. Do not advance to the next button as though this milestone passed. Preserve the founder-approved layout, colors, empty animation, softened shadow, 4.6-second flight cycle, labels and 7-second progress switch. No new branches, production test records, payment captures, schema mutations, or app deployment were made for this audit.

## 1. Reproducible evidence and boundaries

- Baseline consumer main: `f9f486391d6f2402a6e7942e498c976f2ebc2682`.
- Baseline admin main: `495845eb1d55633483b16b1c469ffc40bdc9c912`.
- Live project: `ycbirmgppwavorwudlrv`. Read-only catalog, policy, function, constraint, trigger, publication and aggregate queries executed.
- Consumer [TypeScript and Expo build checks](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45579619615): TypeScript success; Konsoliss suite failure; web export skipped. First model suite 11/11, homepage suite 5/11; six failures all stem from the homepage mock loading the new booking module's real Supabase dependency (`Unexpected dependency react-native-url-polyfill/auto`). This is a test boundary defect, not proof of a production Supabase connection error.
- Admin [validation](https://github.com/momojdy/tiss-admin/actions/runs/45579626157): TS2724 missing exported KonsolissLoadProgress/KonsolissContainerOccupancy; TS2339 trackingDueAt not in adapter's inferred state. Subsequent sync, tests and Android/iOS bundle steps skipped.
- Consumer [Expo validation](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45579619625): unrelated Goodies CMS source coverage error (`Unread counts unavailable · Retry` in GoodiesQuickMenu.tsx); main validation stopped before lint/typecheck/export. Other workflow jobs succeeded. Do not change Goodies in this 3D audit.
- Candidate renderer executed independently in a deterministic mocked canvas: all 23 fixture invariants, 27 renderable views (including separate unassigned views), 324/324 combinations = 27 × 3 widths (320/390/430) × 2 themes × 2 motion settings. Thirteen clock positions spanning initial flight, landing, multiple replays and the original empty cycle; drag/pointer events; finite coordinates; physical loaded amount, labels and sealed/free assertions. D6/D6b produce no preview views. The exact fixture functions were evaluated after removing TypeScript annotations; this is not a complete RN runtime or a real screenshot test.
- Original `CONTAINER_JS` initializer is byte-identical before/after the narrow audit patch. Nonempty renderer code was parsed and exercised. No native iOS/Android screenshot, measured frame-time, visual comparison against the reference or authenticated live mutation test was executed. A mock cannot prove shadows, layering, clipping or device compatibility visually.
- Approved original HTML `Konsoliss Home – 3D container states ….html` uses canvas projection, roof/side geometry, carton flight and a nine-scenario selector. Current RN screen intentionally expands the fixtures to 23 and corrects the HTML's loaded-only headline, partner disclosure and incorrect accounting. HTML is visual reference, not source of backend truth.

## 2. All scenarios: render coverage versus live reachability

All rows have fixture-level coverage. “Live” means source/schema can represent the facts, not that a real customer transaction was observed.

| Code | Approved presentation and numeric meaning | Live assessment |
| --- | --- | --- |
| A1 | Original empty illustration, no booking/cargo | Unrecorded + verified no assignment; no invented zero balance |
| A2 | Purchased, nothing sent; red illustration resets and lands every 4.6 s | Progress + active rights needed; payment-to-progress reconciliation unproven |
| A3 | Same as A2; blinking Send goods and upload tracking + absolute countdown | Reads earliest valid active paid right tracking_due_at; none exist; partial shipments unresolved |
| A4 | Label created; sent remains zero | Tracking table supports submission; homepage does not read it |
| A5 | Inbound to warehouse, 0.7 CBM; no physical load | First carrier scan can be recorded; homepage does not distinguish tracking from warehouse receipt |
| B1 | 0.4 at warehouse, 0.6 not sent | Receipt supported per piece; aggregate summary not automatically reconciled by receipt RPC |
| B2 | 0.7 at warehouse, unassigned | Same distinction missing in live home |
| B3 | 0.5 allocated outline, no physical loading; translucent illustrative landing | Dedicated pre-inbound reserved allocation is not represented separately by current live allocation model |
| B4 | 0.3 inbound, 0.4 at warehouse, 0.3 not sent; separate 0.7 unassigned view | Selected-container inbound now derived from verified allocation minus loaded; unassigned picker remains demo-only |
| C1 | 0.3 loaded, 0.2 unassigned; arrow callout | Single verified container gets computed callout when account and container measurements agree |
| C2 | 0.3 loaded, 0.1 inbound, 0.1 remaining | Live inbound fixed; dashed reservation beyond committed cargo not independently stored |
| C3 | 0.7 loaded, 0.3 unused | Numbers possible; no verified completion flag establishes unused vs still unassigned in live home |
| C4 | Customer 0.5/0.5; shared 51.7/68 = 76%; 16.3 free | Independent account/container measures supported; no populated rows |
| C5 | Customer 0.5 loaded; 60.6 shared; sealed; no free label on canvas | Server lifecycle available; physical seal evidence / no inbound on advance not enforced by current RPC |
| C6 | True tiny 0.020 CBM parcel | Three-decimal model and numeric constraints support it; pixel size needs real device review |
| C7 | Two real containers, identical total 0.500 callout, 0.600 committed / 1.000 purchased; 0.400 unassigned | Aggregate callout and split bar supported; active-only filtering fixed; live unassigned selection missing |
| D1 | Preparing shipment; no provider disclosure | Neutral UI fixture; live provider/route milestones not consumed by home |
| D2 | Departed, measured cargo retained | Server status and read model exist; no actual departure |
| D3 | Arrived, customs/pickup not implied | Container arrival supported; homepage has no verified customs/pickup projection |
| D4 | Expired reservation; original empty illustration; historical record retained | Entitlement movements exist; automatic valid expiry-to-home reconciliation not proven |
| D5 | Incident under review; last verified cargo retained | Demo only; live incident projection and evidence not bound to home |
| D6 | Unavailable: no invented numbers/container | Error/null path implemented; real auth/network/device test outstanding |
| D6b | Loading: no invented numbers/container | Loading path implemented; real runtime timing test outstanding |

## 3. Source-to-server review (logical blocks and authority)

### Consumer
- `konsolissHomeScreen.tsx`: Screen selects actual or explicitly marked local demo state; data from independent current/assigned/progress/occupancy hooks; summary = loaded + inbound over reserved; physical shared fill = loaded / 68. Real preview selection never queries demo IDs. Before this audit, live `hereInbound` was omitted entirely while fixtures passed it. The narrow correction passes `verifiedContainerInbound(occupancy)` from the same occupancy result. Missing allocation is unknown, not invented inbound. Computed live partial/combined callouts require agreement of customer and single-container measurements; do not label an unsent open remainder “unused” without completion evidence. Split caption remains account total; alternate shared progress bar shows total physical fill and free, not individual volumes. Own per-container data still travels to the authorized customer client to draw geometry; it is not secret from an owner inspecting the API.
- `useKonsolissAssignedContainers.ts`: owner-filtered assignments and container lookup; added `is_current=true` so historical assignments are not counted as split live loads. Stale selected IDs fall back to an available active container. No 7-second rotation to an unavailable shared bar without a selected container.
- `useKonsolissContainerOccupancy.ts`, `konsolissOccupancyModel.ts`: selected ID + verified RPC; parser validates 40HQ/68 CBM, finite nonnegative volumes, own + other = loaded, loaded + free = 68, allocation >= loaded. Selected-ID and request-sequence guards prevent stale cross-container display; null means unverified.
- `useKonsolissLoadProgress.ts`, `konsolissLoadModel.ts`, `konsolissNumbers.ts`: authenticated owner query of secure breakdown, numeric precision guards, account totals separate from each container, active-right date from real paid order. One new helper derives verified inbound from allocation minus physical load; one computes a concise safe live caption. Countdown uses absolute timestamps with no fake expiration/refund action. A partial shipment's unsent rights and a submitted label cannot yet be distinguished solely by aggregate totals. Device wall clock and periodic refresh are not authoritative deadline enforcement.
- `useKonsolissRefresh.ts`: auth invalidation, request generation, app foreground refresh, 30-second active polling, subscription on assignment/container/progress and cleanup. Hooks are separate requests, not one atomic snapshot; a measurement and headline can momentarily be from different versions. Add versioned unified live projection or suppress inconsistent combinations before acceptance.
- `konsolissPreviewScenarios.ts` + controller: 23 local fixtures, selector, replay and manual/autoplay isolation; no Supabase write APIs. Demo flag defaults ON for founder review; production artifact must explicitly disable `EXPO_PUBLIC_KONSOLISS_DEMO=0` after approval, then test released build. Do not remove demo controls early.
- Renderer: phase reset, red landed hold, soft shadow, foreground painter ordering, reduced-motion settled view, sealed canvas free suppression, finite coordinates at tested widths and rotations. Patched a real edge case: no brown customer-external cartons if verified other cargo is zero. Allocation geometry is illustrative, not a measured packing plan. Important remaining visual/data edges: tiny or nearly full cuboid fitting vs yellow free-slab proportionality, unassigned reservations >68 CBM currently no parcel geometry, fully assigned but zero own volume has no pointer anchor, actual draw clipping/legibility of multi-line callout and rotations, original and new canvas behavior on physical iOS/Android, background timer performance. Browser mock does not prove these. Canvas labels above and status below My current load preserve latest founder instructions.
- `useKonsolissCopy.ts`, `cms/catalog.ts`, `cms/model.ts`, `annotationScript`: published content resolver, locale cache (public copy only), published English/default fallback, annotation substitution and escaped script. New compact dynamic labels, countdown/status and demo captions include hardcoded English; translated label/measurement formatting and text measurement must be completed/checked without changing layout. No published homepage row exists in the real database.

### Tiss Admin and synchronization
- `screens/konsoliss/KonsolissAdminScreen.tsx` invokes `konsoliss_admin_list_containers`, `konsoliss_admin_manage_container`, `konsoliss_admin_get_customer_load_progress`, `konsoliss_admin_set_customer_load_progress`. `KonsolissMeasurements.tsx` calls `konsoliss_admin_get_container_measurements` and `konsoliss_admin_verify_container_measurements` with customer, all measurements, expected progress timestamp and reason. Active Super Admin UI gate; backend is authoritative. Verified response read back; stale/rejected writes not silently successful.
- `KonsolissEditor.tsx` → `konsolissHomepageCms.ts`: separate CMS permissions; saves draft/publishes with expected version and verifies stored payload + public customer endpoint. Consumer uses `wantiss-public-content` and fallback cache. PreviewData intentionally local mock, not admin operational records. **A preview rendering is not proof of published data.**
- `scripts/sync-konsoliss-preview.cjs` → admin `screens/content/konsolissPreview`: same homepage/model/scenarios, safe adapter for read-only visual preview. The current homepage was regenerated by reproducing the existing deterministic transform and matching the old generated file byte-for-byte first; changed manifest hashes updated. New source homepage SHA-256 `9109f363f2b6d357ada63b8098fc241daf5bc512c14a66470c9d0edf372c0835`; generated homepage `e16e12f5bac4b4d41521502532030951a9329a72a1f3e19855570efbe7c88779`; load-model `be160e2097ec7fef73109c503bb4518b81fff78fff528e4b7c8abdcfd1e67da1`. Admin preview adapter now re-exports types and declares canonical load-progress union. Full generator --check, all asset-byte hashes and compilation must still be confirmed by CI. The 10 existing remote preview assets were located in consumer tree; no assets changed. Do not confuse cache-busted raw main URLs with immutable artifact pinning.
- Both clients use configured Wantiss public Supabase URL/key, not service-role keys in these modules. Environment values on actual devices and successful authenticated paired-app exchange still need confirmation.

## 4. Live PostgreSQL evidence (no writes)

Read-only counts: containers 0; assignments 0; customer progress 0; booking orders 0; entitlement rights 0; consignment pieces 0; tracking records 0; published Konsoliss homepage locales 0. Therefore no real cargo lifecycle or CMS publication can be demonstrated from existing production rows. Do not insert test customer records to manufacture evidence.

| Contract inspected | Actual live result |
| --- | --- |
| containers | CHECK container_type=40HQ, capacity_cbm=68, statuses filling/filled/departed/arrived |
| assignments | unique container/user, nullable unknown measurements, finite loaded/allocated in [0,68], loaded<=allocated |
| capacity guard | row lock on container, aggregate loaded and allocated bounds, immutable ownership |
| progress | finite nonnegative totals, loaded+inbound <= reserved and <= sent; no 68 cap on aggregate |
| breakdown and rights balance | security_invoker=true; derived load measures and append-only rights movement balance |
| occupancy RPC | authenticated current assignment required; returns null if missing/unverified or invalid shared total; legacy single-container aggregate fallback; no other-customer identities |
| admin measurement RPC | active Super Admin, stable container lock order, exact active set, unique IDs, three decimals, expected timestamp, total <= sent/reserved, atomic assignment + progress update and audit log |
| admin manage container | active Super Admin, audited create/assign and monotonic status transition; no physical sealing evidence or sealed-container assignment/measurement guard found in function body |
| RLS and permissions | RLS on base tables; customer owns load/assignment and assigned containers; booking/rights/tracking owner or active Super Admin; direct authenticated UPDATE false on base tables; sensitive RPC anon EXECUTE false, authenticated EXECUTE true with internal authorization |
| realtime | assignments, containers, progress in supabase_realtime; assignment trigger touches container to invalidate shared occupancy; rights/tracking/receipt/CMS not in observed publication (poll/foreground refresh matters) |
| negative occupancy read | unauthenticated SQL context, nonexistent UUID → null (not a real two-account RLS integration test) |

Important gaps:
1. The booking-rights, tracking, receipt and progress systems are not yet one proven lifecycle projection. Inspected `konsoliss_admin_verify_piece_tracking` writes carrier record + audit; `konsoliss_admin_receive_piece` writes receipt, order received CBM, lot commitment + audit, **not** customer load-progress sent/reserved quantities. Current admin progress RPC is a separately audited manual write. Need authoritative reconciliation/transactional provenance, including zero/partial/expired rights, duplicate events, extensions, return/refund and custody.
2. Current capacity trigger guards sums/ownership but does not check container lifecycle. Admin advance validates order of statuses, not measured completeness or absence of inbound; assign does not reject a sealed/departed container. Measurement RPC can write active assignments without a status guard. Need safe state transitions and explicit audited exception policy, including concurrency with seal/assignment/measurement; no schema changes made without a separate reviewed migration.
3. Legacy single-container occupancy fallback counts aggregate loaded if no assignment measurement. It can be inconsistent with capacity checks based on explicit assignment amounts; unknown allocations must not silently enable overbooking. Replace/validate fallback and reconcile totals before production.
4. Server allows allocated = loaded+inbound, does not represent a separate assigned empty entitlement or finalized unused amount. C1/C3 need explicit semantics; B3, C2 remaining, B4/C7 unassigned need true live projection, not demo fixtures.
5. Production CMS lacks published content rows; locale / cache recovery and publish-readback need actual authorized workflow verification. No fake content published.
6. Some repo migration filenames for older/reconciliation SQL differ from live migration versions (e.g. admin 20261122130000 vs live 20261122125654, 20261125071000 vs live 20261125070759); do not reapply blindly. Review migration history/drift on actual shared project before any schema migration. This audit inspected deployed definitions, not assumed filename equivalence.

## 5. Narrow corrections in this audit

1. Repair admin preview type exports/canonical union (no UI change).
2. Isolate new booking screen in homepage test harness only, so the homepage tests do not accidentally load actual Supabase client; booking itself is not claimed tested.
3. Filter active assignments, fall back safely when selected ID disappears, avoid switching to nonexistent shared bar.
4. Pass verified selected-container inbound to canvas; derive accurate live callouts when sufficient facts exist. Retain actual aggregate split total and actual per-container geometry. Stop drawing brown other cargo when its verified volume is zero.
5. Add deterministic 324-combination regression test and verified-inbound/partial-caption assertions; regenerate paired admin sources. No changes to original empty renderer, landing cycle, shadow, native card/navigation styles, fees, payment or booking workflow. No database writes.

## 6. Release gates — MUST all pass before next button

| Gate | State | Required proof |
| --- | --- | --- |
| G1 All scenarios visually and mathematically correct | Fixture math/render execution pass, device visuals pending | 23 scenarios + each split/unassigned view, real phone screen recording/screenshots, portrait widths, drag, replay, dark mode, reduced motion |
| G2 Every real scenario reachable from authoritative data | FAIL | unified lifecycle projection from paid right, label, carrier scan, warehouse receipt, allocation, load, seal, departure, arrival/customs/pickup, expiry and incident; no fake records |
| G3 Financial/cargo safety and lifecycle | FAIL | server enforcement/reconciliation and safe transactional transitions incl. overcapacity, stale writes, duplicate events and concurrency |
| G4 Both repositories compile and match | Baseline FAIL; narrow patches committed for CI verification | exact paired main CI success, source manifest and all asset hashes verified, Android/iOS bundles, consumer export |
| G5 Admin → backend → consumer | Not demonstrated | actual authorized user/admin, existing legitimate operational data, create/assign/measure → matching consumer read, realtime and polling, stale request/account switching; nonowner/unauthorized negative checks; no synthetic production inserts |
| G6 CMS and release config | FAIL | publish authorized content and confirm public consumer endpoint; verify all locales and labels; explicit demo=0 only after founder visual approval |
| G7 UX/performance | Pending | no unintended UI change, no text clipping, soft shadow at real DPI, stable 4.6-second replay, no stale/incorrect occupancy, no memory/timer leaks, offline/reconnect and measured frame times |

Reproduction commands (run in existing approved development environment, no deployment):
```sh
# Consumer (Node 22, Expo SDK 58)
npm run test:konsoliss
npx tsc --noEmit
KONSOLISS_ADMIN_ROOT=/workspaces/tiss-admin npm run check:konsoliss-preview
# Admin
npm run typecheck
KONSOLISS_CONSUMER_ROOT=/workspaces/tiss_tiss_beta npm run test:konsoliss
```

Run existing integration/CI only under the agreed testing constraints. Do not create a new hosted test Supabase or fake live records. Do not launch payments, shipments or the super-app. The next milestone should remain the 3D live projection, safety rules and paired device verification, **not** a redesign and **not** the next homepage button.
