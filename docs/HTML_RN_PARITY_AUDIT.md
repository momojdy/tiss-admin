# Wantiss Admin HTML → React Native parity audit

**Source of truth for this pass:** the user-uploaded `wantiss-admin-crm final .html` (227,662 UTF-8 bytes, 924 lines; SHA-256 `32170bcbb7213c98364d4997b351a3be0180ff1dc372e49400f1f2574137ee77`).  
**Target reviewed:** `momojdy/tiss-admin`, default branch `main`  
**Scope:** source-level comparison against the exact uploaded file above. The earlier 312,412-byte `wantiss-admin-v9.html` is a different source version and must not be treated as this pass's baseline. No live-device screenshot comparison has been performed in this audit.

## Global shell and navigation — baseline at audit start

- **HTML reference:** compact account/header area, floating/collapsible vertical dock with seven actions (collapse, Search, Quick create, Alerts, Operations, Export, Settings), seven primary sections (Overview, Operations, Ecosystem, Content, Finance, Analytics, People), blurred overlays/drawers, light/dark/system appearance.
- **React Native:** account/search/notification header and horizontally scrolling section pills. Search is passed as an empty callback in `AdminApp.tsx`; there is no Quick create, dock export or Settings action in the shell. Navigation and overlays use separate components, which is a good base for restoring parity.
- **Difference:** the navigation model, access point for global actions, and visual hierarchy are materially different. Restore the HTML dock/action model without replacing the existing authentication and access checks.

## Historical screen-by-screen notes (earlier HTML version; not the current upload's parity verdict)

**Important:** The table below was written against the different 312,412-byte `wantiss-admin-v9.html`. It is retained only as historical context. Do not treat its screen-level claims as a verified comparison against the current uploaded `wantiss-admin-crm final .html`; the exact-upload section below is the active baseline.

| HTML section/surface | Current React Native implementation | Difference / missing work |
|---|---|---|
| Overview | No Overview screen is registered in `ScreenHost.tsx`; it renders the generic “not ported” card. | Entire HTML dashboard missing: KPI row, activity range/chart, attention queue, review-speed ring, queue mix, money snapshot, feature health, content/promotion status, team and recent activity. |
| Operations | `screens/operations/OperationsScreen.tsx` | A real screen exists. Compare against HTML review board/list/filters, overdue and unassigned queues, detail drawers and keyboard interactions in device screenshots; source inspection alone cannot certify pixel parity. |
| Ecosystem | `screens/ecosystem/EcosystemScreen.tsx` | Service directory exists with grid/table/search/filter/favourites. HTML service-specific workspace paths and module depth need parity verification. Cards use fixed ~48.4% width, which can wrap differently from HTML's responsive grid. |
| Service hub / service workspaces | `screens/ecosystem/ServiceHubScreen.tsx` | Current hub mainly shows module names, service content and selected business verification. The HTML defines a different module list for each service, including Goodies, Stays, Woulib, Flyz, services, Habita, Potssy and others. Generic module routing is not equivalent to porting each workspace. |
| Content | `screens/content/ContentScreen.tsx` | Current screen manages CMS versions/assets and a Goodies phone preview. HTML Content also contains banner/promotion/announcement queues, calendar, approval flows, and its own customer-page editor. The existing CMS screen is useful but does not replace the HTML Content workflow. |
| Goodies | No `goodies` route registered in `ScreenHost.tsx`; only the Goodies phone preview is in Content. | HTML has a dedicated Goodies workspace: Overview, Home content, Categories, Builder library, Ingredient requests, Promotions, Fees and rules, Restricted goods, Text and notifications, Support and legal, Merchants, Product review, Orders and Analytics. The v5 customer page editor is also omitted from RN. |
| Finance | `screens/finance/FinanceScreen.tsx` | Finance screen exists. Verify against HTML Transactions/Refunds/Payouts/Settlements/Reconciliation, filters, tables and record drawers. Do not treat existence as parity proof. |
| Analytics | No Analytics screen is registered; generic “not ported” card is shown. | Entire HTML analytics dashboard missing: shared activity dataset, 7D/30D/90D/1Y/custom range, service filter, approval rate, review turnaround, by-service share, content performance and export/expand interactions. |
| People | `screens/people/PeopleScreen.tsx` plus `PermissionsPanels.tsx` | Staff/access management is present. Compare HTML's Customers, Businesses, Staff, Requests, Permissions, Audit log and account controls, especially overlays and access-level interactions. |
| Business detail / customer page editor / Potssy | Route IDs exist in `Nav.tsx`, but `ScreenHost.tsx` does not register screens for them. | Routes fall through to the generic “not ported” card. HTML includes business detail and editor surfaces, and Potssy has its own module workspace. |
| Search | Header renders a search button but `AdminApp.tsx` supplies `() => {}`. | No working search overlay or cross-record search from the current header. HTML search groups results for applications, transactions, services, staff, customers, content and accounts, gated by permissions. |
| Quick create | No shell action/overlay in current React Native. | HTML provides New banner, New promotion, Invite staff and New announcement actions, each with its own form and access checks. |
| Settings | Account sheet exists; no global Settings panel/screen. | HTML Settings covers Appearance, Platform, Ecosystem, Notifications, Documents and requirements, Workflows, Finance, Team and access, and Help and information. RN needs settings UI and persisted/authorized behavior, not a cosmetic placeholder. |
| Overlays | RN has shared dialog/drawer provider and separate drawer modules. | Reusable foundation exists, but several HTML actions and drawers are absent; overlay sizes/entry points/close behavior require device verification. |

## Design tokens and dimensions — measured from the HTML source

- RN uses Outfit font assets and HTML-derived palette tokens in `theme/tokens.ts`; this is directionally aligned with the source.
- The HTML uses CSS variables, responsive CSS layout, compact cards, an expandable dock and responsive grid/table layouts. React Native uses explicit style objects and some fixed widths/paddings. Identical token names do **not** guarantee identical typography metrics, wrapping, card height, spacing or overlay geometry.
- Exact pixel parity requires comparing screenshots at the same device width and font scale and then adjusting screen-specific styles. This source audit does not claim that those measurements have been verified.

## Priority order

1. Register and implement Overview and Analytics using the HTML's existing data/interaction model.
2. Restore global shell actions: Search, Quick create, Settings and Export; preserve current Supabase auth and server permission enforcement.
3. Port Goodies and the HTML service workspaces as feature/screen folders, not a single monolithic component.
4. Bring Content workflows (banners, promotions, announcements, approvals, calendar, customer page editor) into parity alongside the existing CMS version/asset manager.
5. Capture Expo Go screenshots and exercise every action on a phone; run typecheck/build and report anything not verified.

## Important boundary

This is a source-level audit. It does not prove Supabase schema/RLS correctness, production readiness, or pixel parity. The HTML contains demo/in-memory interactions as well as interface definitions; real-money, staff, publish, refund and access actions must remain connected to their authorized server-side workflows rather than blindly copying demo behavior.


### HTML source measurements

These values are read directly from the original HTML CSS, not estimated from screenshots:

- Main frame: 512 × 910 CSS px, max-width 100vw, max-height 100%, corner radius 26 px. At viewport widths ≤520 px it becomes full width/full dynamic viewport height with no corner radius.
- Main scrolling surface: padding 14 px top, 10 px right, 90 px bottom, 57 px left. When the dock is collapsed, left padding changes to 28 px. Safe-area top/bottom padding is added.
- Main section heading: Outfit 22.1 px, weight 400, line-height 1.08, letter spacing −0.2 px.
- Tabs: 11.8 px type, 7 px × 11 px padding, 2 px gap, 14 px top/bottom margins, pill radius.
- KPI row: 10 px gap, 10 px top and 14 px bottom margins; KPI value 14.7 px, label 9.5 px, icon 30 px (36 px on mobile).
- Cards: translucent background, 22 px radius, 12 px padding, 10 px bottom margin, border rgba(0,0,0,.07) in light mode, shadow 0 8px 24px rgba(60,50,30,.07).
- Small action cards: 16 px radius, 9 px padding, 112 px minimum height. Service tiles: 20 px radius, 10 px padding.
- Expanded dock: 37 px wide, left offset 9 px, 15 px gap, 12 px vertical padding; collapsed dock: 16 × 72 px, flush to the left edge.
- Dialog: 26 px radius and 16 px padding. Drawer: 318 px wide, max-width 100%, full height.
- Palette: ink #161a17; green #2f5d4e; orange #d1481d; yellow #f2c94c; light background gradient #f6e4d2 → #eef0e4 → #e1ecdc; light card rgba(251,250,245,.84). Font family is Outfit 300/400/500/600.

### Restoration commits after the baseline audit

- Added this audit document and registered React Native Overview and Analytics screens.
- Added a collapsible global dock for Search, Quick create, Alerts, Operations, Export and Settings; wired header branding and the global search overlay.
- Added permission-aware search across applications, transactions, services, staff, customers, content and accounts.
- Added Quick create forms. Banner/promotion/announcement actions save private CMS drafts; staff invitations use the protected server function.
- Added a Settings drawer with the HTML categories and appearance controls. At present, non-personal settings save locally only because a verified server-side settings endpoint is not present; they do not change production behavior.
- Added a dedicated Goodies workspace with the HTML module names, data-backed sections and draft staging, plus a shared module-driven service workspace.
- Changed the shell to one scrolling surface and aligned tab/dock/content insets more closely with the HTML. Removed the nested Content scroll view.

### Remaining parity and verification work

- The HTML Content Studio has separate Banners, Promotions, Announcements, Calendar, Approvals, History, Media and customer-page Editor surfaces. The RN Content screen still primarily manages CMS versions/assets; these separate workflows are not yet fully ported.
- Goodies merchants, product review, orders and analytics now have entry points, but several rely on the current admin snapshot/seed or link to existing workspaces. They are not a substitute for dedicated server-backed Goodies APIs.
- The service workspace is a shared data-driven shell, not yet a bespoke port of every service-specific HTML module.
- Business detail and the standalone customer-page editor still fall through to the not-ported screen.
- No Expo Go screenshots or device interaction pass has been performed by this audit. CI typecheck is being used to catch source errors; visual parity and runtime behavior still require on-device verification.


## Exact uploaded HTML baseline — 2026-10-26 follow-up

This section supersedes any earlier claims that were based on `wantiss-admin-v9.html`. The uploaded file inspected for the current task is `wantiss-admin-crm final .html`, SHA-256 `32170bcbb7213c98364d4997b351a3be0180ff1dc372e49400f1f2574137ee77`.

Confirmed from that exact file:

- Primary tabs are Overview, Operations, Ecosystem, Content, Finance, Analytics and People; the dock contains collapse, Search, Quick create, Alerts, Operations, Export and Settings.
- Goodies workspace module order is exactly: Overview, Products and catalog, Categories, Merchants, Product review, Orders, Promotions, Support, Analytics, Settings.
- Global frame is 512 × 910 CSS px, max-width 100vw and max-height 100%; at viewport widths ≤520 px it uses full viewport width/dynamic height and removes the outer corner radius.
- The source uses Outfit 300/400/500/600, a 22 px card radius with 12 px padding and 10 px bottom margin, a 318 px max-width drawer, a 26 px dialog radius, and the palette/gradient documented above.
- Source CSS defines a 57 px left content inset when the dock is expanded and 28 px when collapsed; the expanded dock is 37 px wide and the collapsed dock is 16 × 72 px.
- HTML interactions that only toast, mutate in-memory demo arrays or say a feature opens “in the next pass” are prototypes, not evidence of a production endpoint.

## Changes made against the exact uploaded baseline

- Goodies navigation labels/order were aligned to the nine module names in this uploaded HTML. The Settings section is explicitly read-only until an authorized server-side settings endpoint exists.
- Added a separate `CustomerPageEditorScreen` file and registered the `editor` route. It reads Goodies CMS versions from Supabase and saves changes only as private drafts through the existing `saveCmsVersion` server RPC; it does not publish automatically.
- Added a dedicated business-details screen using only fields present in the authorized ecosystem snapshot. It does not fabricate missing business fields or perform direct status changes. The Service Hub links to this screen.
- Content Studio now links to the standalone customer page editor. Existing Supabase auth, section permission gates and CMS server RPCs were not replaced by HTML demo mutations.

## Still unverified / remaining

- The global shell and all screens have **not** yet passed same-device screenshot comparison against the uploaded HTML.
- The HTML's full global responsive behavior, overlays, search results, quick-create forms and settings subpanels still need an end-to-end parity pass.
- The generic service workspace is not yet a complete one-to-one implementation of every service-specific HTML module. Content Studio workflows and Goodies workflows also need further module-by-module comparison and implementation.
- Business details currently show only fields available from the authorized snapshot; additional business profile fields require a verified backend query/RPC and explicit permission contract.
- No Expo Go runtime/typecheck was run as part of these GitHub-only edits. Do not consider this branch production-ready until typecheck, app launch, authorization checks and device screenshots have been verified.
