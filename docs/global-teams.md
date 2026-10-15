# Global teams & player-first identity

Locked product decisions (2026-10-15, updated same day). Related: [`person-identity.md`](./person-identity.md) · [`match-formats.md`](./match-formats.md) · Roadmap **Phase 1.8 / 1.85**.

---

## 1. Player-first (always)

| Rule | Detail |
|------|--------|
| Signup / claim | Every claimed `person` is a **Player** by default. |
| Pre-provision | Adding someone by email/phone creates/links a `person` who is still a Player. |
| Staff roles | Organizer / scorer / umpire / etc. are **additional** hats. |

---

## 2. Teams are global

```
person
  └── team_memberships[]     (member | captain | manager)

global_teams
  ├── creator, QR, colors, description
  └── tournament entries (teams table)
        ├── captain_person_id  ← tournament-only captain (temporary)
        ├── purse / auction fields
        └── tournament roster
```

### Captains (two layers)

| Layer | Meaning |
|-------|---------|
| **Global captain** | `team_memberships.role = 'captain'` on the franchise. Set when the team is created (self checkbox or email/phone captain). |
| **Tournament captain** | `teams.captain_person_id` on the **entry**. May differ from the global captain for that event only. |

Never identify captains by free-text name alone — use **email and/or phone** (name only when creating a new person).

### Who manages a global team

Creator · Global captain · Manager (not ordinary members).

### Discoverability

Search library · My teams · QR `/t/[qrSlug]`.

---

## 3. Adding a team to a tournament

**Who (v1):** organizers (plus captain-invite accept path).

### Create new

1. Creator becomes creator/manager.
2. Checkbox **“I am the captain”** → creator is global captain.
3. Else: captain **email or phone** → lookup person; if missing, ask **name** and create person (Player); make them global captain + notify.
4. Tournament entry uses that same person as tournament captain initially.

### My teams / Search

1. Select a global team.
2. Show **member list** → pick tournament captain from members.
3. Or **add new captain** via email/phone (+ name if new) → join global squad as member (and optionally promote) + set as **tournament** captain only (global captain unchanged unless empty).

### Invite captain (no team yet)

Email/phone invite → notification → attach/create team (unchanged intent).

### Eligibility / auction

- Only people on this tournament’s player list can play; others sit out.
- Sold players → tournament roster + permanent global membership (v1).
- Same global team may enter many tournaments; each entry has its own tournament captain.

---

## 4. Player “Teams” hub

Every player has a **Teams** section (`/dashboard/teams`):

- List of My teams (created / captain / member).
- **Team page** (`/dashboard/teams/[globalTeamId]`) tabs:
  - **Members**
  - **Leaderboard** — batting / bowling / fielding / MVP (by match format)
  - **Achievements** — tournament wins, etc.
  - **Team stats** — matches, wins, losses (by match format)

Stats shells ship early; full numbers fill as Phase 3–5 scoring lands. Always filter by [`match-formats.md`](./match-formats.md).

---

## 5. Notifications

In-app panel + captain invites; match alerts later.

---

## 6. Implementation notes

- Auction FKs stay on tournament entry rows (`teams`).
- `global_teams` + `team_memberships` hold franchise identity.
- Captain contact resolution: `upsertPersonByContact` + `ensureCaptainPlayer` using person display name for tournament captain player row.
