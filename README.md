# Wantiss Admin — Expo / React Native (partial port)

Port of `wantiss-admin-v9.html` to Expo SDK 52 + React Native + TypeScript. UI/UX only; data is in memory (`state/db.ts`), Supabase comes later.

## Run
    npm install
    npx expo start        # i / a to open a simulator
    npm run typecheck

## Status (honest)
Written without being able to `npm install` or render RN in the build environment. V12 checks that were actually run: a strict `tsc` pass against stubbed React Native modules (no new errors compared with V11), and 33 Node checks of the grant rules in `state/` (request, approve, decline, revoke, change end date, expiry, notifications, permissions, effective access), plus a run with the real clock switched on. Nothing has been rendered on a device, so expect layout differences to fix on first run.

Ported: People (access requests and grants, staff access matrix, employees, edit access, suspend/restore/revoke/reinstate, invitations, role templates, accounts, restrictions, customers, businesses list, audit log), theme tokens (light/dark), UI kit (`ui/`), data + permission model (`state/`, `data/`), full auth flow (sign in, MFA, register by invitation, forgot/reset), shell (header, tabs filtered by access, account sheet with appearance, preview-as, sign out, idle sign-out), Operations, Ecosystem, Service hub, Finance, and the application / document / case / transaction / settlement / payout / reconciliation / refund drawers.

NOT ported yet (show a "not ported" card): Overview (role home), Analytics, Content, Customer page editor, Business detail, service workspaces, Potssy, Goodies, search / quick-create / settings panels. (The notification bell is ported.) The HTML (and `src/engine/parts` in the earlier web zip) is the spec for these.

## Access requests and grants (V12, completed in V13)
Staff ask for more access, a Super Admin decides and sets how long it lasts, and every grant has its own end date.
- **Ask** (any active staff): Account > My access > *Request access*, or *Request access* on the "No access" screen of a section. Pick a section (View/Edit) or a special right, name the file or item, give a reason, optionally suggest a duration. "Manage permissions" cannot be requested.
- **Decide** (needs the "Manage permissions" right): People > Requests > open a request > *Approve…* (level, 1 day / 3 days / 1 week / 2 weeks / 1 month / a specific date / permanent) or *Decline…* (reason required). Nobody can decide their own request.
- **Effect**: a live grant is added on top of role + personal overrides (`acs()` in `state/access.ts`); it never removes access. It ends by itself after its end date (inclusive), or when revoked, or when all of the person's staff access is revoked.
- **Analytics** (People > Permissions, same right): running grants, permanent, ending within 3 days, waiting requests, running grants sorted by soonest end with a time-left bar, per-person summary, most granted, full grant history (filter Active / Expired / Revoked, search). Tap a grant > *Revoke now* ends it immediately with a required reason.
- **Change end date…** on a running grant: extend, shorten, or make it permanent (counts from today, reason required, kept as "End-date changes" on the grant and in the person's history).
- **Notifications** (the bell, now ported): a new request notifies everyone who can manage permissions; approve / decline / early revoke / end-date change notify the requester; the grantee is told once when access ends tomorrow or today and when it ended. Notices carry `to` (a name, or `*perm`). Tapping one opens the request or grant. Filters: All / Unread / Mine, and Mark all read.
- **Clock**: `USE_REAL_CLOCK` in `state/db.ts` (default false = the demo day 2026-10-17 that the other demo data uses). When true, every date rule uses the device's local date read at app start and the demo grants/requests shift with it. Restart the app after midnight.
- Every step is written to the person's access history and the audit log.
- Code: `state/grantStore.ts` (data), `state/grants.ts` (rules + analytics), `data/grantsSeed.json` (demo grants/requests), `overlays/GrantDrawers.tsx`, `screens/people/PermissionsPanels.tsx`.

## Layout
    App.tsx, index.ts
    src/features/admin/
      AdminApp.tsx         providers, auth gate, frame
      theme/ ui/           tokens and reusable components
      state/ data/ lib/    in-memory db, access rules, seed JSON, CSV share
      auth/                auth logic and screens
      shell/               nav, header, tabs, account sheet, screen host
      overlays/            detail drawers (registered by kind: app, doc, case, inv, staff, acc, cust, aud)
      screens/             operations, ecosystem, finance, people
