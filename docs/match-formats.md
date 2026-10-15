# Match formats (ball types)

Locked product decision (2026-10-15): cricket on this platform has **three independent formats**. Stats for players, teams, and tournaments must never mix across formats.

| Format key | Label | Notes |
|------------|--------|--------|
| `tennis_ball` | Tennis ball | Soft-ball / tennis-ball cricket |
| `leather_ball` | Leather ball | Hard-ball / leather |
| `box_cricket` | Box cricket | Indoor / box cricket |

## Rules

1. **Tournament creation** requires selecting exactly one `match_type` (format). All matches in that tournament use it.
2. **Casual matches** (Phase 3) also carry `match_type`.
3. **Player career / team leaderboards / achievements** are always sliced by format (tabs or filters: Tennis / Leather / Box).
4. Auction + scoring still run inside a tournament; they inherit the tournament’s format for any derived stats.

## Schema (target)

```text
tournaments.match_type   CHECK IN (tennis_ball, leather_ball, box_cricket)
matches.match_type       (Phase 3; usually copied from tournament when tournament-bound)
stats aggregates         keyed by (person_id | global_team_id, match_type, …)
```

## UI

- Tournament create/edit: format selector (required).
- Team hub + player profile: format filter on leaderboards / stats tabs.
- Comparing “tournament wins” only compares within the same format.
