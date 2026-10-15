# Person identity — pre-provision, claim, multi-role

Product goal (CricHeroes-style): a human can exist on the platform **before** they create a login; organizers attach them by **email now / phone later**; when they verify and sign in, they **claim** that person and keep all roles, roster links, and future stats in one place.

This document is the architectural target for **Phase 1.75**. It does not change Phases 2–9 scope wording; those phases consume this model.

---

## Problem with the current model

Today identity is **auth-account-centric**:

| Concept | Current reality |
|---------|-----------------|
| User | Only `auth.users` (must sign up first) |
| Player | Tournament-local `players` row — **no email/phone, no `user_id`** |
| Staff role | `tournament_members` — **requires** `user_id`, **one role** per `(tournament_id, user_id)` |
| Platform staff | Invite only works if invitee already signed up |

So: adding someone as a player does not register them on the platform; adding them later as scorer/organizer needs a separate signed-up account and cannot share history with the player roster row.

---

## Target mental model

Four layers (never collapse these):

```
Person          = real human identity (exists without login); always a Player at core
Auth account    = how they sign in (email password now; phone OTP later)
Staff roles     = optional hats (organizer, scorer, umpire, platform admin, …)
Teams           = global franchises (see global-teams.md); not tournament-only
```

```
                    ┌─────────────┐
                    │   person    │  ← always Player + optional staff hats
                    └──────┬──────┘
           ┌───────────────┼───────────────┬────────────────┐
           ▼               ▼               ▼                ▼
    auth.users      tournament_roles   tournament       global team
  (nullable until      (many roles)    roster rows      memberships
      claim)                           (person_id)
```

- **Player-first (locked):** signup, claim, and pre-provision all yield a Player. Staff roles are additive only — even if first invite is “organizer”.
- **Same person** can be player + scorer + organizer + umpire across one or many tournaments.
- **Stats/records** always hang off `person_id` (and tournament/match FKs), not off “did they click Sign up.”
- **Role-specific names** are allowed (e.g. roster display name vs scorer label) but they resolve to one person.
- **Teams** are platform-global; tournaments enter them — [`global-teams.md`](./global-teams.md) (Phase 1.8).

---

## Proposed schema (Phase 1.75)

### `persons`

Canonical human record.

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `display_name` | Best-known name (from first provision or claim) |
| `primary_email` | Nullable unique (normalized lower-case); required for claim via email |
| `primary_phone` | Nullable unique E.164; unused for auth until phone OTP phase |
| `auth_user_id` | Nullable unique → `auth.users`; set on claim |
| `claim_status` | `unclaimed` \| `claimed` |
| `avatar_path` | Optional |
| `created_at` / `updated_at` | |

Indexes: unique on `primary_email` where not null; unique on `primary_phone` where not null; unique on `auth_user_id` where not null.

### `person_aliases` (optional v1, recommended v1.1)

Role/context display names without splitting identity: `(person_id, context_type, context_id, display_name)`.

### Role assignments (replace single-role membership)

**Break** `UNIQUE (tournament_id, user_id)` with a single `role` column.

Prefer **`tournament_role_assignments`**:

| Column | Notes |
|--------|--------|
| `id` | UUID |
| `tournament_id` | |
| `person_id` | → `persons` |
| `role` | `organizer` \| `operator` \| `scorer` \| `umpire` \| `team_manager` \| `viewer` (+ legacy `admin`) |
| `granted_by_person_id` | Optional audit |
| `created_at` | |

**UNIQUE (`tournament_id`, `person_id`, `role`)** — multi-role, one row per role.

Keep `tournament_members` temporarily as a compatibility view or migrate in one shot in 1.75; app code should read/write assignments only.

**Player is not only a staff role:** auction/match roster stays on `players`, but:

```sql
ALTER TABLE players
  ADD COLUMN person_id UUID REFERENCES persons(id),
  ADD COLUMN contact_email TEXT,   -- denorm at provision time; source of truth is persons
  ADD COLUMN contact_phone TEXT;
```

Adding a **player** = upsert `person` by email/phone + insert `players` with `person_id` (+ optional soft role `player` if you want it in “my roles” UI).

### Platform staff

Migrate `platform_staff.user_id` → also store `person_id` (or resolve via `persons.auth_user_id`). Invites create/link a person by email even if unclaimed.

### Invites / notifications (minimal)

| Column set | Purpose |
|------------|---------|
| `person_id`, `tournament_id`, `role` or `player_id`, `channel` (`email`/`sms`), `sent_at`, `token_hash` | Optional claim deep-link; not required if claim is “same email on signup” |

v1 claim can be **email match only** (no token): on verified signup/login, if `auth.users.email` matches `persons.primary_email` and `auth_user_id` is null → claim.

---

## Flows

### A. Organizer adds a player (email today)

1. Normalize email; validate.
2. **Upsert person** by `primary_email` (create if missing; if exists, reuse — do **not** ask them to “register as a new user”).
3. If person already has `display_name`, prefill; organizer may set **roster name** on `players.name` / `display_name` without overwriting person name unless person was empty.
4. Insert `players` with `person_id` + contact fields.
5. Optionally email: “You were added to {tournament} as a player — sign up / log in with this email to claim.”

Unclaimed persons **do** participate in auction and (later) match stats via `person_id`.

### B. Organizer adds scorer / organizer / umpire / etc.

1. Same upsert person by email/phone.
2. Insert `tournament_role_assignments` for that role (same person may already be a player).
3. If they already had a name as player, **do not force a second account**; UI may ask for a **role display label** only if needed, defaulting to `person.display_name`.

### C. First login / signup (claim)

1. User signs up or logs in with email (+ verify as today).
2. After `email_confirmed_at` is set, run **claim**:
   - Find `persons` where `primary_email = auth email` and `auth_user_id IS NULL`.
   - Set `auth_user_id`, `claim_status = claimed`.
   - If person `display_name` empty, take from signup metadata; if signup name empty, keep person name from organizer.
3. Session continues; dashboard “My tournaments / My roles” lists all assignments + player roster links for that `person_id`.

Conflict: email already claimed by another `auth_user_id` → hard error / support path (should be rare with unique constraints).

### D. Existing auth user added later

If organizer adds email that already maps to a claimed person → attach roles/player immediately; user sees new tournament on next load (optional notify email).

### E. Phone later (no auth change yet)

- Collect `primary_phone` on provision for future OTP.
- Claim path v2: match phone after Supabase phone verify.
- Until then email remains the claim key; phone is contact + future identifier.

---

## Permission checks (evolution)

Today: `requireTournamentRole` uses `auth.uid()` → `tournament_members.user_id`.

Target:

1. Resolve `auth.uid()` → `persons.id` (`auth_user_id`).
2. Check `tournament_role_assignments` for role ranks **or** creator shortcut.
3. Player-only people (roster, no staff role) get a default **participant** capability (view own profile / own stats), not organizer powers.

Unclaimed persons have **no** `auth.uid()` — they cannot log in until claim; data still exists for organizers and public/stats queries via service or organizer RLS.

---

## Stats & records

Rule: **every future scoring / participation fact references `person_id`** (directly or via `players.person_id`).

| Entity | Link |
|--------|------|
| Auction purchase / roster | via `players.person_id` |
| Match batting/bowling (Phase 4+) | `person_id` (+ team/match) |
| “Career” UI | aggregate by `person_id` across tournaments |

Do **not** key career stats on `auth.users.id` alone — that breaks pre-claim history.

---

## Migration strategy (safe order)

1. Add `persons`, `tournament_role_assignments`; backfill:
   - One `person` per existing `auth.users` (email + metadata name), `claimed`.
   - Copy `tournament_members` → role assignments via that person.
   - `players.person_id` left null initially (anonymous roster).
2. Switch app writes: member invite + player create → person upsert.
3. Add claim on verified login/signup (server helper + optional DB trigger).
4. Deprecate writing `tournament_members`; dual-read briefly; then drop or view-wrap.
5. Organizer UX: email required (or strongly prompted) when adding player/staff for claimable identity; allow “no contact” only as explicit **local-only roster** (cannot claim).

---

## Product UX principles

1. **One human, many hats** — never create a second account for a second role.
2. **Organizer-provided name seeds the profile**; claim does not wipe history.
3. **Ask for name again only when useful** (empty person name, or distinct roster/jersey label) — not to create a new identity.
4. **Email now, phone field ready**; OTP auth stays deferred (roadmap Deferred).
5. **Local-only players** remain possible for pure auction lists, but they won’t unify into a career until contact is added and claimed.

---

## What Phase 2+ consumes (unchanged schedule)

| Phase | How it uses this model |
|-------|------------------------|
| 2 Identity & permissions UI | Invite/manage = person + role assignments; purse visibility; grants ✅ |
| 3 Casual matches | Join/add player = person upsert |
| 4 Scoring | Scorer role on assignments; ball events → person |
| 5+ | Standings/MVP by person |
| Deferred phone OTP | Claim + login via `primary_phone` |

---

## Out of scope for 1.75

- Full career public profile polish (can be thin “My profile”)
- Phone OTP login
- Merging duplicate persons (manual admin tool later)
- Clubs/orgs as a separate tenant layer
