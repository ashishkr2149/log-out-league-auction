# Phase 6 — UI / design system spec

Locked from product discussion (2026-10-15). Implement only after this doc is accepted.

**Out of scope:** Live OBS auction overlay visuals → Phase 6.5.  
**In scope:** Full visual + shell pass on every app screen (auth, dashboard, tournaments, teams, me, platform, auction *management* including create-overlay-link UI). Auction *control* stays dark-skinned for now.

---

## 1. Principles

| Principle | Rule |
|-----------|------|
| Mobile-first | Design for phone; desktop is the same system scaled up |
| No desktop sidebar | Top header/navbar only |
| Light app | All app + public/auth pages are light |
| Dark exception | Auction control room stays dark until revisited (6.5 / later) |
| Overlay exception | `/overlay/*` left as-is until 6.5 |
| Airy density | Comfortable spacing; type not oversized; not cramped |
| Casual voice | Friendly cricket-app copy (CricHeroes / Dream11 adjacent) |
| Labels | **Purse** (money), **Spectator** (role formerly shown as Viewer in UI) |
| Cards | Prefer flat list rows / soft sections; cards only when they aid interaction |
| Empty states | Short line + one CTA — no essay onboarding |
| A11y floor | Contrast, ~44px targets, icon labels, focus rings — not a formal WCAG audit |
| Back | History-stack **←** chevron on nested pages (not breadcrumbs). Back follows the path the user took |
| Same nav for all | Role gates live inside pages, not different chrome per role |

---

## 2. Visual tokens (Ink & scarlet)

### Color

- **Canvas:** near-white / cool off-white  
- **Surface:** white / soft elevated panels  
- **Text:** near-black / charcoal  
- **Muted text:** slate-gray  
- **Primary / CTA:** bright scarlet  
- **Danger / sold:** deeper red  
- **Success:** restrained green  
- **Borders:** hairline slate, low contrast  

Implement as CSS variables on `:root` (e.g. `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--accent-fg`, `--danger`, `--border`, `--ring`).

### Typography

Token layers (swap fonts later without hunting components):

| Token | Role |
|-------|------|
| `--font-sans` | Body / UI |
| `--font-display` | Brand / large titles (can equal sans initially) |
| `--font-mono` | Codes, purse numbers if useful |

Start with current stack mapped into these tokens; changing fonts = one place.

### Radius / elevation

- Soft rounds (pills for nav capsule, rounded avatar/bell).  
- Light elevation or hairline borders — avoid heavy multi-shadow “AI purple” looks.

### Placeholder brand

- Wordmark: **Log Out League** (placeholder OK)  
- Logo: simple mark placeholder until final asset  

---

## 3. Desktop shell

```
┌──────────────────────────────────────────────────────────┐
│  [Mark] Log Out League   Home  Tournaments  Teams   🔔  🙂 │
└──────────────────────────────────────────────────────────┘
```

- **Links:** Home (dashboard), Tournaments, Teams  
- **🔔:** Notifications (rounded control)  
- **🙂:** Avatar menu → Me / Profile, Settings, About, **Platform** (if platform staff), Sign out  

No left sidebar on any breakpoint that uses the desktop shell.

---

## 4. Mobile shell

```
┌─────────────────────────────┐
│  Log Out League        🔔 🙂 │  ← top strip (brand + notifications + profile)
│                             │
│         page content        │
│                             │
│           ╭─────╮           │
│            (  ●  )          │  ← scarlet FAB only (capsule hidden)
│     tap → glass capsule     │     expands from FAB; Me is NOT in radial
└─────────────────────────────┘
```

### Top strip

- Brand (left)  
- Notifications + **Profile avatar** (right)  

### Glass capsule (floating, above home indicator)

- **Hidden by default** — only the center scarlet FAB shows.  
- **Tap FAB:** capsule expands outward from the button (single width/scale morph — no per-icon pop) with Home / Teams / Tournaments / Matches inside.  
- **Collapse when:** user scrolls, taps outside, taps FAB again, or navigates.  
- Visual: iPhone-style liquid glass (frosted blur + specular rim); scarlet FAB stays on top.

### Back chevron

On nested routes, top-leading **←** uses browser/app history so:

Home → Tournaments → Team → … → back unwinds that same stack.

Prefer `router.back()` with a sensible fallback href when there is no history.

---

## 5. Information architecture

| Entry | Behavior |
|-------|----------|
| Post-login | **Dashboard** summary home |
| Dashboard | Summary hub (v1 can be light: live auction CTA, my teams, my tournaments, notifications peek; grow later) |
| Tournaments | Tabs: **My tournaments** / **Open** (extend later as needed). Row open → tournament hub; edit only if role allows |
| Teams | Global / my teams hub (existing Phase 1.8 intent, restyled) |
| Matches | Placeholder until Phase 3 |
| Me (avatar) | Profile, roles, settings entry, platform link if staff |
| Platform | Owner/staff console (restyled, still gated) |

### Tournament hub (mobile-recommended)

One hub screen:

- Name, season, status badges (open/private, draft/active, …)  
- Your role chip  
- Strong **Open auction** CTA when relevant  
- Section chips/rows: Overview · Teams · Players · Auction · Staff (Staff if permitted)  

Drill into sections; **←** returns along the stack.

---

## 6. Forms & patterns

| Use case | Pattern |
|----------|---------|
| Quick single action (invite staff, toggle setting) | Dialog or bottom sheet |
| Multi-add (many players, bulk-ish flows) | Full page + clear **+** to add more rows |
| Lists | Airy rows; optional soft section chrome |
| Empty | One sentence + one CTA |

---

## 7. Auction surfaces

| Surface | Phase 6 treatment |
|---------|-------------------|
| Auction control | Keep **dark**; make **fully one-handed** usable; restyle controls to match new density/type tokens where possible |
| Create / manage overlay links | Restyle in app (light chrome around management UI) |
| Live OBS overlay page | **Do not revamp** (Phase 6.5) |

---

## 8. Copy

- **Voice:** casual  
- **Purse** not budget/points in UI (currency/pts can still show as units)  
- **Spectator** in UI for the viewer role (DB may remain `viewer`)  
- Empty: short + one CTA  

---

## 9. PWA (lightweight)

- Web app manifest + icons + theme-color  
- Installable / add-to-home-screen  
- Sensible start URL (dashboard)  
- **Not** full offline-first caching in this phase  

---

## 10. Implementation order

1. Design tokens (color, type, spacing) + light theme baseline  
2. Desktop header + mobile top strip + glass radial capsule  
3. Auth pages (login/signup)  
4. Dashboard summary shell  
5. Tournaments (tabs + hub) → teams/players nested  
6. Teams hub + team pages  
7. Me / notifications / platform  
8. Auction control (dark, mobile one-hand pass) + overlay-link management restyle  
9. Matches stub  
10. PWA manifest/icons  
11. Sweep remaining screens + empty states + Spectator/Purse copy  

---

## 11. Explicit non-goals (Phase 6)

- Redesigning the broadcast overlay compositor  
- Formal WCAG certification  
- Full offline PWA  
- Shipping real Matches feature (stub only)  
- Final brand logo/wordmark assets (placeholders OK)  

---

## Acceptance checklist

- [x] No desktop sidebar anywhere in dashboard chrome  
- [x] Mobile glass capsule + expand/collapse (scroll + outside tap)  
- [x] Profile only via top avatar (mobile); Platform under avatar menu  
- [x] Light theme across app; auction control dark; overlay untouched  
- [x] History back on nested pages  
- [x] Ink & scarlet tokens in CSS variables; fonts tokenized  
- [x] Tournaments My / Open; tournament hub pattern  
- [x] Casual copy; Purse + Spectator labels in UI  
- [x] PWA installable (manifest + icons)  
- [x] Full visual pass on existing app screens (except overlay) — foundation + uneven-screen polish; further tweaks opportunistic  

**Out of this checklist (by design):** live OBS overlay → Phase 6.5; real Matches/leaderboard data → Phases 3–5.  

