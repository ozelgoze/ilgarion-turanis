# UEE ATAK APP — AI Development Guide

## Project Overview
A real-time collaborative tactical planning and party-finding web app for Star Citizen milsim organizations. Users create teams (units), upload map images, place NATO APP-6C markers, draw tactical overlays, run briefings, and find parties for gameplay sessions — all synced in real-time via Supabase broadcast channels.

**Live on Vercel.** Database on Supabase (hosted PostgreSQL).

## Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| Runtime | React | 19.x |
| Canvas | Fabric.js | 7.x |
| Database/Auth/Storage | Supabase | latest |
| Realtime | Supabase Broadcast + Presence | — |
| Styling | Tailwind CSS | 4.x |
| UI Primitives | Radix UI (Avatar, Dialog, Dropdown, Popover, Select, Tabs, Tooltip) | — |
| Animation | Framer Motion | 12.x |
| Icons | Lucide React | — |
| Language | TypeScript (strict) | 5.x |
| Hosting | Vercel | — |

## Architecture & File Map

### Server Actions (`src/app/actions/`)
All DB mutations go through server actions. Never call Supabase directly from client components.
- `auth.ts` — login, register, logout
- `teams.ts` — CRUD teams, manage members/roles, assign ships, fleet counts
- `maps.ts` — create maps, get maps with signed storage URLs, get team info/role, threat level updates
- `markers.ts` — CRUD tactical markers (with optimistic concurrency via `updated_at`)
- `drawings.ts` — CRUD vector drawings
- `briefings.ts` — CRUD briefings with markdown content
- `profile.ts` — get/update user callsign, SC handle, primary ship, org
- `parties.ts` — Full party/LFG system: CRUD parties, join/leave/kick, chat, ready-up, ratings, invites, auto-expire, notifications, event log, close with outcome

### Canvas Components (`src/components/canvas/`)
- `tactical-canvas.tsx` — Main Fabric.js canvas (~60KB, large by design). Exposes `TacticalCanvasRef` for external manipulation. Handles markers, drawings, grid, zoom, touch gestures, measure tool.
- `canvas-toolbar.tsx` — Top toolbar: zoom, grid toggle, drawing tools, colors, stroke width, SITREP toggle, export PNG, marker filter, op phase, timer, quick comms, keyboard shortcuts.
- `icon-palette.tsx` — Draggable NATO icon selector panel (friendly/hostile/neutral/unknown affiliations).
- `marker-context-menu.tsx` — Double-click popup for marker label, assignment (callsign + ship), label size (S/M/L).
- `marker-filter.tsx` — Filter markers by affiliation (friendly/hostile/neutral/unknown) and unit type (10 types). Active filter indicated with amber dot.
- `drawing-helpers.ts` — Fabric object factory, arrow path builder, color/width constants.
- `nato-icons.ts` — NATO APP-6C SVG generator (10 unit types × 4 affiliations).
- `sc-ships.ts` — Star Citizen ship database (9 categories: Fighters, Heavy Fighters, Bombers, Multicrew, Capital Ships, Cargo, Mining/Salvage, Support/Utility, Ground Vehicles). Used for marker ship assignment and fleet summary.
- `fleet-summary.tsx` — Canvas overlay showing fleet composition breakdown (category bar chart + individual entries). Reads `assigned_ship` or `primary_ship` from team members.
- `op-phase-tracker.tsx` — Operation phase indicator (6 phases: Planning → Staging → Transit → Engagement → Extraction → Debrief). Color-coded with progress dots.
- `op-timer.tsx` — Synced countdown timer with presets (30s, 1m, 2m, 5m, 10m) + custom MM:SS input. Urgency colors at 30s (orange) and 10s (red). Broadcasts via realtime channel.
- `quick-comms.tsx` — Tactical callout buttons (4 categories: Movement, Contact, Status, Orders). Sends callouts via broadcast. Toast notifications for incoming callouts.
- `keyboard-shortcuts.tsx` — Keyboard shortcut handler + overlay reference card. Keys: V/L/A/R/C/M (tools), Del (delete), G (grid), S (SITREP), E (export), +/- (zoom), 0 (fit), ? (help).
- `sitrep-panel.tsx` — SITREP panel for marker summary display.
- `threat-indicator.tsx` — Threat condition (TCON) selector: GREEN/YELLOW/ORANGE/RED with pulsing indicators on high threat.

### Shared Components (`src/components/`)
- `sidebar.tsx` — Left sidebar navigation (64px wide icon rail): Ops Center, Tactical Maps, Briefings, Party Finder, Settings.
- `topbar.tsx` — Top navigation bar, includes party notification bell.
- `party-notifications.tsx` — Bell icon dropdown with realtime notification updates via broadcast channel.
- `page-transition.tsx` — Framer Motion page transition wrapper with stagger animation variants.
- `mtc-logo.tsx` — App logo component (sm/md sizes).
- `markdown-renderer.tsx` — Markdown content renderer for briefings.
- `image-editor.tsx` — Lightweight crop & rotate editor for map image uploads. Uses native Canvas API, no dependencies.
- `stanton-reference.tsx` — Star system reference with two tabs: Locations (expandable tree of Stanton + Pyro system bodies) and QT Calculator (travel time estimates between locations). Displays 2 systems, 60+ locations.
- `quantum-planner.tsx` — Quantum travel route planner. Origin → Destination with system-grouped selects, route visualization with waypoint dots, cross-system jump point warnings, and estimated QT time.

### Realtime (`src/hooks/`)
- **`use-map-realtime.ts`** — Map canvas realtime sync.
  - **Primary:** Broadcast channel (`map:{mapId}`) — each client broadcasts after successful DB write.
  - **Fallback:** `postgres_changes` WAL listener (can miss events due to RLS in WAL context).
  - **Presence:** Tracks online viewers with callsigns.
  - **Event types:** `marker_insert`, `marker_update`, `marker_update_meta`, `marker_delete`, `drawing_insert`, `drawing_delete`.
  - Channel config: `broadcast: { self: false }` prevents echo.
- **`use-party-realtime.ts`** — Party detail realtime sync.
  - Broadcast channel (`party:{partyId}`) for party updates, member changes, and new messages.
  - Event types: `party_update`, `members_change`, `party_message`.
  - Additional global channels: `party-hub` (list refresh), `party-notifications` (bell icon refresh).

### Page Structure (`src/app/`)
```
(auth)/login, register
(dashboard)/
  layout.tsx             — Dashboard shell: sidebar + topbar + main content
  dashboard/
    page.tsx             — Server component: fetches teams, stats, threat level
    dashboard-client.tsx — Client: ops center home with stat cards, team cards,
                           StantonReference, QuantumPlanner, SC lore quotes
    maps/page.tsx        — Map list
    maps/[mapId]/
      page.tsx           — Server component: fetches map + markers + drawings + team
      canvas-client.tsx  — Client wrapper: wires callbacks, presence, context menu,
                           fleet summary, toolbar, op phase/timer, quick comms
    briefings/           — Briefing list & detail with markdown editor
    parties/
      page.tsx           — Server component: fetches open/my parties, notifications
      party-hub-client.tsx — Client: find/create/my-parties tabs, search filters,
                             join flow, passcode modal, activity type filter
      [partyId]/
        page.tsx         — Server component: fetches party + messages + events
        party-detail-client.tsx — Client: members, chat, ready-up, ratings, events,
                                  invite by callsign, close with outcome, countdown timer
    teams/[teamId]/      — Team view, roster, create-map/briefing dialogs
    teams/new/           — Create team
    settings/            — User profile settings (callsign, SC handle, primary ship, org)
```

### Database Schema (13 tables)
- **Core:** `profiles`, `teams`, `team_members`, `maps`, `tactical_markers`, `map_drawings`, `briefings`
- **Party system:** `parties`, `party_members`, `party_messages`, `party_events`, `party_ratings`, `party_notifications`

#### Key columns added via migrations:
- `profiles`: `sc_handle`, `primary_ship`, `sc_org`
- `team_members`: `assigned_ship`
- `maps`: `threat_level` (0–3 integer)
- `parties`: `passcode`, `outcome` (enum: success/fail/abandoned), `starting_station`
- `party_members`: `ready` (boolean)

Migrations in `supabase/migrations/` (12 files, ordered by timestamp). Types mirrored in `src/types/database.ts`.

### Supabase Clients (`src/utils/supabase/`)
- `server.ts` — Server-side client (server components, server actions)
- `client.ts` — Browser client (client components, realtime)
- `proxy.ts` — Middleware for auth session refresh + route protection

## Design System (UEE ATAK Theme)

**Dark mode only.** Defined in `src/app/globals.css` via CSS custom properties.

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-primary` | `#0B0C10` | Main background |
| `--color-bg-surface` | `#1F2833` | Panels, toolbars |
| `--color-accent` | `#00ffcc` | Primary accent (cyan) |
| `--color-amber` | `#F0A500` | Secondary accent (amber) |
| `--color-danger` | `#FF2442` | Destructive actions |
| `--color-text-primary` | `#C5C6C7` | Body text |
| `--color-text-bright` | `#EAEAEA` | Headings |
| `--color-border` | `#1F3A4A` | Default borders |

**Rules:**
- No rounded corners. Use sharp 90-degree edges or chamfered clip-paths.
- Monospace (`font-mono`) for all data readouts, labels, buttons.
- Tracking-widest + uppercase for labels and small text.
- Custom classes available: `.mtc-panel`, `.mtc-btn-primary`, `.mtc-btn-ghost`, `.mtc-input`, `.mtc-glow-text`.
- Marker labels use `#F0A500` (amber) with black stroke outline.

## RBAC Model
| Role | Maps | Markers/Drawings | Team Mgmt |
|------|------|-------------------|-----------|
| Commander | Create, edit, delete | Full CRUD | Full (add/remove/role) |
| Planner | View | Full CRUD | None |
| Operator | View | View only | None |

Check with `canEdit(role)` or `isCommander(role)` from `src/types/database.ts`.

## Party / LFG System

Full-featured party finder for organizing Star Citizen gameplay sessions.

### Features
- **Create/join/leave parties** with activity type, title, description, max players, region, voice chat link, starting station.
- **13 activity types:** bounty_hunting, cargo_run, mining, salvage, fps_mission, fleet_battle, racing, exploration, blueprint_run, escort, medical_rescue, piracy, other.
- **Starting station selector:** All major locations from Stanton (cities + orbital stations + L-point rest stops), Pyro (gateway + stations + outposts), and Nyx (Levski + gateway). Data in `SC_LOCATIONS` in `database.ts`.
- **Private parties:** Optional passcode set on create, validated server-side in `joinParty()`. Raw passcode never sent to clients — masked as `"***"` in all query responses.
- **Real-time chat** per party with broadcast sync.
- **Ready-up system:** Members toggle ready status, "All members ready!" indicator shown.
- **Party status flow:** `open` → `in_progress` → `closed` (or `full` when max reached, auto-reopens on leave).
- **Close with outcome:** Leader selects `success`, `fail`, or `abandoned` when closing.
- **Star rating system:** After close, remaining members rate 0–5 stars. Leader reputation = total stars / total votes across ALL closed parties. Shown on party cards and detail pages.
- **Auto-expire:** Parties older than 24h (from `created_at`) are auto-closed with `abandoned` outcome and 0-star penalty ratings from every remaining member. Countdown timer shown on detail page.
- **Invite by callsign or RSI handle:** Leader can add players directly (searches callsign first, then `sc_handle`). Sends `party_invite` notification to the invited player.
- **Activity event log:** `party_events` table records all lifecycle events (create, join, leave, kick, status_change, edit, invite, closed). Displayed in detail view.
- **Notification system:** Bell icon in topbar with real-time broadcast updates. Types: `member_joined`, `member_left`, `member_kicked`, `party_started`, `party_closed`, `party_invite`.
- **Search/filter:** By activity, text, region, sort order, and "has spots" toggle.

### Party Realtime Patterns
- Three broadcast channels: `party:{partyId}` (detail sync), `party-hub` (list refresh), `party-notifications` (bell refresh).
- After any party mutation, broadcast to the relevant channel(s) and send notification broadcasts targeting specific user IDs.
- Notification broadcasts include `targetUserIds` array so only affected users refresh their bell.

## Star Citizen Reference Tools

### Stanton System Reference (`stanton-reference.tsx`)
- Expandable tree view of 2 star systems (Stanton + Pyro).
- 5 location types: planet, moon, station, lagrange, gateway — each with distinct symbol + color.
- QT Calculator tab with 25+ pre-calculated routes and lookup function.
- System tab switcher + mode tab switcher (Locations / QT Calculator).

### Quantum Travel Planner (`quantum-planner.tsx`)
- Independent route planner component used on the Ops Center dashboard.
- Builds route waypoints including jump points for cross-system travel.
- Animated route visualization with sequential waypoint dots and dashed jump-point lines.
- Estimated QT time display + waypoint count + swap route button.
- 33 destinations across Stanton and Pyro systems.

### SC Ship Database (`sc-ships.ts`)
- 9 categories, 65+ ships with name, manufacturer, and 3–5 char abbreviation.
- Used in marker ship assignment dropdown and fleet summary breakdown.
- Categories: Fighters, Heavy Fighters, Bombers/Torpedo, Multicrew/Gunships, Capital Ships, Cargo/Transport, Mining/Salvage, Support/Utility, Ground Vehicles.

## Canvas Tactical Features

### Toolbar Features (left to right)
1. **Zoom controls** — +, −, fit-to-view, current zoom percentage
2. **Grid toggle** — Show/hide hex or square grid overlay
3. **SITREP toggle** — Show/hide marker summary panel
4. **Drawing tools** — Select, Line, Arrow, Rectangle, Circle, Measure
5. **Color picker** — 6 preset colors (friendly blue, hostile red, neutral green, unknown amber, accent cyan, white)
6. **Stroke width** — 1–5px selector
7. **Marker filter** — Toggle visibility by affiliation + unit type
8. **Op Phase tracker** — 6-phase operation lifecycle with editable selector
9. **Op Timer** — Synced countdown with preset/custom durations
10. **Quick Comms** — Tactical callout broadcast buttons
11. **Threat Indicator** — TCON GREEN/YELLOW/ORANGE/RED selector
12. **Keyboard shortcuts** — Help overlay (`?` key)
13. **Export PNG** — Canvas screenshot download

### Canvas Overlays
- **Fleet Summary** — Top-left overlay showing fleet composition bar + roster
- **Presence indicator** — Online viewers with callsigns
- **Icon Palette** — Draggable NATO icon selector for marker placement

### Keyboard Shortcuts
| Key | Action | Edit Only |
|-----|--------|-----------|
| V | Select/Move tool | ✓ |
| L | Line tool | ✓ |
| A | Arrow tool | ✓ |
| R | Rectangle tool | ✓ |
| C | Circle tool | ✓ |
| M | Measure tool | ✓ |
| Del | Delete selected | ✓ |
| Esc | Deselect / close panel | |
| +/= | Zoom in | |
| - | Zoom out | |
| 0 | Fit to view | |
| G | Toggle grid | |
| S | Toggle SITREP | |
| E | Export PNG | |
| ? | Show shortcuts overlay | |

## Development Rules

### Adding a New Feature (checklist)
1. **Migration first** — Add SQL migration in `supabase/migrations/` if schema changes needed.
2. **Types** — Update `src/types/database.ts` to mirror new columns.
3. **Server action** — Add/modify in `src/app/actions/`. Always validate auth + role.
4. **Client wiring** — Wire through `canvas-client.tsx` callbacks for canvas features.
5. **Broadcast** — Add event type to `MapBroadcastEvent` union in `use-map-realtime.ts` if realtime.
6. **Canvas ref** — Expose new methods via `TacticalCanvasRef` if canvas needs external manipulation.
7. **Build check** — Run `npx next build` before committing.

### Canvas-Specific Patterns
- Fabric objects use custom properties prefixed with `__` (e.g., `__markerId`, `__markerLabel`, `__markerLabelSize`, `__markerUpdatedAt`, `__drawingId`, `__markerLabelFor`).
- Labels are separate `FabricText` objects linked to markers via `__markerLabelFor`.
- `object:moving` handler syncs label position during drag.
- Always remove associated labels when deleting markers (`findLabelForMarker()`).
- Marker context menu opens on `mouse:dblclick` (not right-click — right-click conflicts with browser).
- Touch support: pinch-to-zoom (two fingers), single-finger pan.
- Drawing tool state: `DrawTool` type = `"select" | "line" | "arrow" | "rectangle" | "circle" | "measure"`.

### Realtime Patterns
- **Always broadcast after DB write**, not before. The broadcast is the source of truth for other clients.
- `postgres_changes` is a fallback only — it can silently drop events for non-commander roles due to RLS in WAL context.
- Broadcast payload must include `sender: currentUserId` to prevent echo (double-applied with `self: false`).

### Security
- All permission checks happen in server actions, not client-side.
- RLS policies enforce team-scoped access at the DB layer.
- Marker updates use optimistic concurrency control (`updated_at` check) to handle simultaneous edits.
- Storage URLs are signed (24h expiry) via `getMapWithSignedUrl()`.
- Party passcodes validated server-side only; masked in all query responses.

### Code Style
- Prefer editing existing files over creating new ones.
- Keep canvas logic in `tactical-canvas.tsx` — it's large by design (single Fabric lifecycle).
- Callbacks flow: `page.tsx` (server) -> `canvas-client.tsx` (client wrapper) -> `tactical-canvas.tsx` (canvas).
- Use `useImperativeHandle` + `forwardRef` pattern for canvas ref methods.
- Suppress Fabric.js v7 deprecation warnings with `// eslint-disable-next-line` where needed.
- Dashboard components: `page.tsx` (server fetch) -> `*-client.tsx` (client render with interactivity).

### Migration Convention
- Filename format: `YYYYMMDDNNNNNN_descriptive_name.sql`
- Always use `IF NOT EXISTS` / `IF EXISTS` for idempotency.
- Wrap enum creation in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` blocks.
- Add RLS policies immediately after table creation.
- Add to `supabase_realtime` publication if table needs realtime updates.
