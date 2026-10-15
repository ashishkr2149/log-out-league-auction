# Product roadmap

Living plan for Log Out League / cricket auction platform. Phase 0 decisions are locked; Phase 1 security is done. Build in order unless product explicitly reprioritizes.

## Done

### Phase 0 — Decisions
Product scope, auth, roles, auction rules, brand direction, hosting, security/release, cricket roadmap, Phase 1 boundaries.

### Phase 1 — Security foundations
Authz, overlay audit, platform IAM, captain player link, expanded roles, CI.

### Phase 1.5 — Security product polish ✅
Platform admin UI, overlay credential UI, verify messaging, overlay live updates.

### Phase 1.75 — Unified person identity ✅
[`docs/person-identity.md`](./person-identity.md) — persons, claim, multi-role assignments.

### Phase 1.8 — Player-first + global teams ✅
[`docs/global-teams.md`](./global-teams.md) — global franchises, tournament entries, QR, notifications, promote existing teams.

---

## Upcoming

### Phase 1.85 — Captains by contact + Teams hub + match formats foundation ✅
Continuing 1.8 product rules (do not renumber 2–9):

- Create team: “I am captain” **or** captain **email/phone** (name only if new person)
- Enter from My teams / Search: **member list** → tournament captain, or add by email/phone
- **Global captain** vs **tournament-only captain** (`teams.captain_person_id`)
- Player **Teams** hub `/dashboard/teams` + team page tabs (Members / Leaderboard / Achievements / Team stats shells)
- Tournament `match_type` on create ([`docs/match-formats.md`](./match-formats.md))
- Docs updated: `global-teams.md`, `match-formats.md`, `architecture.md`

### Phase 2 — Identity & permissions (product surface) ✅
Tournament member invite/manage (add + revoke roles); Viewer purse visibility toggle; open/private tournaments + join-as-viewer; platform Owner console (staff, kill switches, service grants matrix); `requireServiceGrant` on mutation paths.

### Phase 6 — UI / design system ✅ foundation + polish pass
Spec: [`docs/phase6-ui-spec.md`](./phase6-ui-spec.md). **Shipped:** ink & scarlet tokens, capsule buttons, desktop header (no sidebar), mobile liquid-glass FAB nav, light theme across app screens, tournaments My/Open + hub tabs, SegmentedTabs, notifications modal, BackLink, Matches stub, PWA manifest/icons, Spectator/Purse copy, empty-state CTAs, auction control mobile order (controls first). Opportunistic page polish OK; overlay → **6.5**.

### Phase 6.5 — Auction overlay revamp ⚡ after Phase 6
Pause feature work; finalize auction overlay for near-term events. Then resume Phase 3+.

### Phase 3 — Casual matches
Two-side matches with `match_type`; open vs private; team pick from global library; eligibility greying for non-listed squad members.

### Phase 4 — Scoring
Ball-by-ball; live scorecard; summary; Scorer role. Stats written with `match_type` so careers stay format-separated.

### Phase 5 — Formats & standings
Stage builder; points table; fill Team hub leaderboards / achievements / team stats (batting, bowling, fielding, MVP) **per match format**.

### Phase 7 — Broadcast overlays (match score)
Bottom score overlay for live matches. Builds on 6.5.

### Phase 8 — Production hardening
Sentry; prod DB; backup drill; Terms/Privacy; optional Playwright.

### Phase 9 — Monetization (6+ months)
Plans/limits; Razorpay; entitlements.

---

## Deferred
PWA/store apps, phone OTP primary auth (phone collected now; OTP login later), clubs/orgs, multi-sport, microservices/Redis/Kafka, captain self-enter into open tournaments, push notifications.

---

## Process
1. Finish current phase with E2E verification before starting the next.
2. Order: **1.85 → 2 → 6 → 6.5 → 3 → 4 → 5 → 7 → 8 → 9**.
3. When product locks mid-phase, update `docs/` + this roadmap in the same change set.
4. Re-open Phase 0 only when a decision blocks schema.

## Priority note
Auction control + overlay (6 / 6.5) ship before matches/scoring so near-term auctions are ready first.
