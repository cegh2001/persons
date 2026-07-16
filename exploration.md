# Exploration: persons app — current UI

## Current State

The app is a single-page **Censo de Damnificados (disaster victim census)** built on **Next.js 16 (App Router) + React 19**. It is a single-route SPA where `src/app/page.tsx` renders the entire `CensoDashboard` behind a `Login` wall. There is no real client-side routing — all "navigation" is anchored scrolling, modal dialogs, or state-driven view swaps inside the dashboard.

The product domain is post-earthquake relief (sismo 2026) field operations: track affected people, mark vulnerability, log supplies delivered and medical attention received, scan handwritten lists with Gemini, and aggregate per-sector stats.

## Affected Areas (UI surface)

- `src/app/layout.tsx` — root layout, Geist fonts, `sonner` `<Toaster/>`
- `src/app/page.tsx` — entry: wraps `CensoDashboard` in `ErrorBoundary` + `Suspense`
- `src/app/globals.css` — Tailwind v4 entry
- `src/components/` — all UI lives here (no `src/app/*/page.tsx` beyond home)
- `src/components/ui/` — shadcn-style primitives (base-nova style: Base UI + Radix)
- `src/components/scan/` — Gemini scan flow
- `src/components/CensoDashboard.tsx` — top-level orchestrator
- `src/components/CensoHeader.tsx` — branded header + action buttons
- `src/components/CensoStats.tsx` — 3 KPI cards + horizontal sector strip
- `src/components/CensoFilters.tsx` — search + sector combobox + vulnerability segmented control
- `src/components/CensoTable.tsx` — paginated persons table with inline toggles
- `src/components/PersonFormDialog.tsx` — add/edit modal
- `src/components/DeletePersonDialog.tsx` — destructive confirm modal
- `src/components/Login.tsx` — full-screen login
- `src/components/ErrorBoundary.tsx` — class-component error boundary
- `src/components/scan/ScanUpload.tsx` — 3-step scan dialog (upload → preview → confirm)
- `src/components/scan/ScanPreviewTable.tsx` — editable scan results table
- `src/components/scan/ConfirmDialog.tsx` — commit summary tile
- `src/components/scan/MatchBadge.tsx` — match-status pill (exact/partial/none)
- `src/hooks/useAuth.ts` — auth state (login/logout/me)
- `src/hooks/useCensoData.ts` — fetches persons + stats, manages URL filter params
- `src/hooks/useCensoForm.ts` — add/edit form state + submit
- `src/hooks/useCensoDelete.ts` — delete flow
- `src/hooks/useScanData.ts` — Gemini scan upload/preview/commit orchestration
- `src/middleware.ts` — CSRF check on state-changing `/api/*` calls

## Pages and Routes

- **Public**: `/` (home — renders login if no session, dashboard if authenticated)
- **API routes** (server-only, no UI):
  - `/api/auth/login` · `/api/auth/logout` · `/api/auth/me`
  - `/api/persons` (GET list, POST create) · `/api/persons/[id]` (PATCH, DELETE)
  - `/api/persons/scan` (POST Gemini scan)
  - `/api/stats` (GET aggregate)
  - `/api/deliveries` · `/api/deliveries/[id]` (server route exists; **no UI consumes it yet**)
  - `/api/delivery-items` · `/api/medical-attentions` (present per ls but no UI consumer found)
  - `/api/health`

There are **no Next.js route segments** under `src/app/` other than the root and `/api/`. All views live as components inside the dashboard.

## Key Components and Purpose

| Component | Purpose |
|---|---|
| `CensoDashboard` | Top-level orchestrator. Wires auth → data → form → delete hooks; renders header, stats, filters, table, and three dialogs. |
| `CensoHeader` | Title "Censo de Damnificados", Sismo 2026 / SQLite / role badges, action buttons (Escanear, Registrar, Ver Personas, Logout). |
| `CensoStats` | 3 clickable KPI cards (Total Censo, Personas con suministros, Atenc. Médica) + horizontal scroll of sector cards. Cards double as filters (click to toggle). |
| `CensoFilters` | Text search input, sector `Combobox`, vulnerability segmented control (Todos / Vulnerables / Estables). |
| `CensoTable` | Paginated, sortable-by-click toggles table. Columns: Nombre, Cédula, Sector, Vulnerabilidad (heart toggle), Asistencia (supplies + medical pills), Notas, Acciones. |
| `PersonFormDialog` | Add/edit modal. Fields: name, document_id, sector combobox, is_vulnerable, received_supplies, received_medical, notes. |
| `DeletePersonDialog` | Red destructive confirm. |
| `Login` | Centered card on gradient blur background, email + password with show/hide eye, "Sismo 2026" badge. |
| `ScanUpload` | 3-step modal: drag/drop image → editable preview table → commit summary. Caches unfinished scans in localStorage. |
| `ErrorBoundary` | Class component with retry button. |

## UI Patterns Used

- **Cards** (`<Card>`) as primary surface — KPI tiles, sector tiles, table wrapper
- **Modal Dialogs** (Radix Dialog via `src/components/ui/dialog.tsx`) — form, delete, scan
- **Inline toggles in table** — `<button>` pills for vulnerable/supplies/medical that fire mutations on click (admin only)
- **Combobox** (Base UI) for sector selection with type-ahead and clear
- **Segmented control** (3-button group) for vulnerability filter
- **Horizontal scroll strip** for sector KPI cards (`overflow-x-auto` with negative margins for edge-to-edge feel)
- **Loading skeletons** via `boneyard-js/react` `<Skeleton name="..." fixture={...}>` — declarative fixtures for stats and table during initial load
- **Toast** notifications via `sonner` (registered in `layout.tsx`)
- **URL-synced filter state** — `useCensoData` reads/writes `q`, `loc`, `vuln`, `sup`, `med`, `p` query params via `useSearchParams` / `useRouter`
- **Suspense + ErrorBoundary** wrapping the dashboard at the page level
- **Server-rendered HTML reduced** — all meaningful components are `"use client"`
- **Click-to-filter pattern** — KPI and sector cards toggle a filter when clicked (ring highlight + "Filtrado" pill indicate active state)

## Tech Stack

- **Framework**: Next.js `16.2.10` (App Router), React `19.2.4`
- **Primitives**: `@base-ui/react` 1.6 + `@radix-ui/react-dialog` + `@radix-ui/react-label` + `@radix-ui/react-slot` (shadcn "base-nova" style per `components.json`)
- **Tables**: `@tanstack/react-table` 8.21 is installed but **NOT used** — current table is hand-rolled with `<TableHead>`/`<TableCell>` primitives
- **Icons**: `lucide-react`
- **Styling**: Tailwind v4 (`@tailwindcss/postcss`), `class-variance-authority`, `clsx`, `tailwind-merge`, CSS variables, neutral base
- **Forms/validation**: `zod` 4.4, custom `react-hook-form`-free pattern
- **DB**: `@libsql/client` (SQLite, file `persons.db`)
- **AI**: `@google/genai` for Gemini Vision scan
- **Toasts**: `sonner` 2.0
- **Skeleton/fixtures**: `boneyard-js` (custom in-house tool — `Skeleton`, `fixture`, `stagger`, `transition` props)
- **Other deps**: `xlsx` (xlsx parse for migration), `vitest` + `@testing-library/react` for tests
- **Dev**: `concurrently` to run Next + boneyard watcher; `pnpm-workspace.yaml` present
- **Middleware**: custom CSRF check on `/api/*` state-changing methods (Origin/Referer + SameSite cookies)
- **Lang**: Spanish (es), labels all in Rioplatense Spanish
- **Port**: dev server runs on `:3456`

## Data Each View Currently Shows

- **Login**: email + password inputs, "Sismo 2026" badge, decorative gradient orbs
- **CensoHeader**: app title, role badge (admin/visor), three action buttons (Escanear/Registrar/Logout) + "Ver Personas" anchor button (smooth-scrolls to `#tabla-damnificados`)
- **CensoStats** (3 cards + sector strip):
  - Total Censo (count + vulnerable count subtitle)
  - Personas con suministros (count + "con entrega")
  - Atenc. Médica (count + "atendidos")
  - Per-sector card: sector name + count + vulnerable count (icon color varies by sector)
- **CensoFilters**: text search (name/cédula/notes), sector combobox, Todos/Vulnerables/Estables segmented control
- **CensoTable rows** (per person):
  - Name (bold)
  - Document ID (mono badge, "Sin Cédula" placeholder)
  - Sector (color-coded badge via `getLocationColor`)
  - Vulnerable pill (heart icon, red when vulnerable, slate when stable — clickable toggle for admin)
  - Suministros pill (indigo) + Médica pill (rose) — clickable toggles for admin
  - Notes (line-clamp-2 with `FileText` icon, "Sin notas" italic placeholder)
  - Edit / Delete ghost icon buttons (admin only)
- **Pagination footer**: page X of Y, total, prev/next + numeric page buttons with ellipsis
- **PersonFormDialog**: name, document_id, sector combobox, is_vulnerable checkbox (red), received_supplies (indigo), received_medical (rose), notes textarea
- **ScanUpload** step 1: drag/drop area with file input
- **ScanUpload** step 2 (preview): editable table of extracted rows with per-row `MatchBadge` (none/partial/exact) and "Incluir" toggle
- **ScanUpload** step 3: Nuevos / Actualizados summary tiles + Confirmar button
- **ErrorBoundary fallback**: error message + retry button

## Auth UI

- `src/components/Login.tsx` — full-screen centered card, no separate `/login` route (mounted conditionally inside `CensoDashboard` when `!auth.user`)
- Gradient background (indigo/violet blur orbs)
- Email + password with eye-toggle for password
- Error banner above form (red, slide-in animation)
- Submit button with spinner state
- After login: header shows current role (admin = emerald, visor = amber)

## Stats Dashboard

**There IS a stats surface, but it is embedded inside the main dashboard view** — not a separate route. `CensoStats.tsx` renders three interactive KPI cards plus a horizontally scrollable sector strip. Cards act as click-to-filter controls (clicking the "Suministros" card adds `suppliesFilter="yes"` to the URL). The `/api/stats` endpoint is consumed by `useCensoData` and shaped as the `Stats` type: `{ total, vulnerableTotal, suppliesTotal, medicalTotal, byLocation: [{ location, count, vulnerableCount }] }`.

There is **no dedicated "dashboard" page**, **no charts** (no recharts/chart libs installed), and **no time-series analytics**. The stats are summary numbers only.

## Notable observations / Constraints

- All Spanish UI copy — Rioplatense style (voseo, accent on confirmation prompts)
- Boneyard `Skeleton` with `fixture` prop is used heavily for loading states — this is an in-house dev tool, not a published library
- URL state is the source of truth for filters; page reload preserves filter state
- `boneyard.config.json` exists but no `bones` directory in src/ — fixture data is embedded in components
- Tests exist under `src/__tests__/` and use `vitest` with `jsdom` + `@testing-library/react`
- `next-env.d.ts` indicates TS strict project; `tsconfig.json` standard
- Several `.db` files in repo root suggest separate test fixtures (`persons-deliveries.test.db`, `persons-medical.test.db`, `persons-items-stats.test.db`, `persons-migration.test.db`)
- No client-side router, no `useRouter` for navigation beyond URL param updates
- Roles are a binary `admin` | `visor`; visor mode hides all write actions (add/edit/delete/toggle)
- Boneyard JSON fixtures live at `src/bones/censo-stats.bones.json` and `censo-table.bones.json` — referenced from the registry at `src/bones/registry.ts` (imported by `page.tsx`)

## Ready for Proposal

Yes. The current UI is a single-page dashboard with clear separation: header / stats / filters / table / modals. Any new UI work can be planned as additions to `CensoDashboard` (new sections, new filters, new cards) or as new top-level views that would require introducing the first client-side route. The data model (`Person`, `Stats`) and hooks (`useCensoData`, `useCensoForm`) are the natural integration points.
