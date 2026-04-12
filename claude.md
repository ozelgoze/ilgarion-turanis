# MYTHRA TACTICAL COMMAND (MTC) — AI Development Guide

## Project Overview
A real-time collaborative tactical planning web app (Star Citizen milsim aesthetic). Users create teams, upload map images, place NATO APP-6C markers, draw tactical overlays, and run briefings — all synced in real-time via Supabase broadcast channels.

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
| UI Primitives | Radix UI | — |
| Animation | Framer Motion | 12.x |
| Language | TypeScript (strict) | 5.x |
| Hosting | Vercel | — |

## Architecture & File Map

### Server Actions (`src/app/actions/`)
All DB mutations go through server actions. Never call Supabase directly from client components.
- `auth.ts` — login, register, logout
- `teams.ts` — CRUD teams, manage members/roles
- `maps.ts` — create maps, get maps with signed storage URLs, get team info/role
- `markers.ts` — CRUD tactical markers (with optimistic concurrency via `updated_at`)
- `drawings.ts` — CRUD vector drawings
- `briefings.ts` — CRUD briefings
- `profile.ts` — get/update user callsign

### Canvas Components (`src/components/canvas/`)
- `tactical-canvas.tsx` — Main Fabric.js canvas (large file). Exposes `TacticalCanvasRef` for external manipulation. Handles markers, drawings, grid, zoom, touch gestures.
- `canvas-toolbar.tsx` — Top toolbar: zoom, grid, drawing tools, colors, stroke width, SITREP toggle, export.
- `icon-palette.tsx` — Draggable NATO icon selector panel (friendly/hostile/neutral/unknown affiliations).
- `marker-context-menu.tsx` — Double-click popup for marker label, assignment, label size (S/M/L).
- `drawing-helpers.ts` — Fabric object factory, arrow path builder, color/width constants.
- `nato-icons.ts` — NATO APP-6C SVG generator (10 unit types x 4 affiliations).

### Realtime (`src/hooks/use-map-realtime.ts`)
- **Primary:** Broadcast channel (`map:{mapId}`) — each client broadcasts after successful DB write.
- **Fallback:** `postgres_changes` WAL listener (can miss events due to RLS in WAL context).
- **Presence:** Tracks online viewers with callsigns.
- **Event types:** `marker_insert`, `marker_update`, `marker_update_meta`, `marker_delete`, `drawing_insert`, `drawing_delete`.
- Channel config: `broadcast: { self: false }` prevents echo.

### Page Structure (`src/app/`)
```
(auth)/login, register
(dashboard)/dashboard/
  page.tsx             — Ops center home
  maps/page.tsx        — Map list
  maps/[mapId]/
    page.tsx           — Server component: fetches map + markers + drawings + team
    canvas-client.tsx  — Client wrapper: wires callbacks, presence, context menu
  briefings/           — Briefing list & detail with markdown editor
  teams/[teamId]/      — Team view, roster, create-map/briefing dialogs
  teams/new/           — Create team
  settings/            — User profile settings
```

### Database Schema (7 tables)
`profiles`, `teams`, `team_members`, `maps`, `tactical_markers`, `map_drawings`, `briefings`

Migrations in `supabase/migrations/` (ordered by timestamp). Types mirrored in `src/types/database.ts`.

### Supabase Clients (`src/utils/supabase/`)
- `server.ts` — Server-side client (server components, server actions)
- `client.ts` — Browser client (client components, realtime)
- `proxy.ts` — Middleware for auth session refresh + route protection

## Design System (MTC Theme)

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

### Code Style
- Prefer editing existing files over creating new ones.
- Keep canvas logic in `tactical-canvas.tsx` — it's large by design (single Fabric lifecycle).
- Callbacks flow: `page.tsx` (server) -> `canvas-client.tsx` (client wrapper) -> `tactical-canvas.tsx` (canvas).
- Use `useImperativeHandle` + `forwardRef` pattern for canvas ref methods.
- Suppress Fabric.js v7 deprecation warnings with `// eslint-disable-next-line` where needed.
