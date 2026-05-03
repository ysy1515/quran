# القرآن الكريم — Full-Stack Quran App

## Architecture

**Monorepo** managed with pnpm workspaces.

### Artifacts
- `artifacts/quran` — React + Vite frontend (preview path `/`)
- `artifacts/api-server` — Express 5 backend (preview path `/api`)

### Shared Libraries
- `lib/api-spec` — OpenAPI 3.0 YAML spec (`openapi.yaml`)
- `lib/api-zod` — Zod schemas generated from spec via Orval
- `lib/api-client-react` — React Query hooks generated from spec via Orval
- `lib/db` — Drizzle ORM schema + PostgreSQL connection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Wouter (routing), TanStack Query |
| Styling | Tailwind CSS v4, next-themes (dark/light mode) |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| API | Quran.com API v4 (proxy + cache) |
| UI Components | vaul (bottom sheet drawer), sonner (toasts) |
| Codegen | Orval (React Query hooks + Zod schemas from OpenAPI) |
| Fonts | Cairo (UI), Scheherazade New + Amiri (Quran text) |

---

## Features

- 114 Surahs from Quran.com API with full verse text
- Ibn Kathir Tafsir (ID 169) via bottom-sheet drawer on verse tap
- Bookmarks — save/delete verses, stored in PostgreSQL
- Reading progress — tracks last surah/page read
- Settings — dark/light mode, Quran font size
- Search — filter surahs by name
- Juz listing — 30 juz with navigation
- RTL Arabic interface throughout
- Responsive: desktop sidebar + mobile bottom nav

---

## Database Schema (`lib/db/src/schema/`)

- `bookmarks` — user-saved verse bookmarks
- `reading_progress` — last-read position
- `app_settings` — theme, font size, tafsir toggle
- `tafsir_cache` — cached tafsir responses

All sessions use `sessionId = "default"` (no auth in MVP).

---

## API Routes (`artifacts/api-server/src/routes/`)

| Route | Description |
|---|---|
| `GET /api/surahs` | List all 114 surahs |
| `GET /api/surahs/:id/verses` | Get verses for a surah |
| `GET /api/surahs/:id/verses/:num/tafsir` | Ibn Kathir tafsir |
| `GET /api/juz` | List 30 juz |
| `GET /api/search` | Search surahs |
| `GET/POST/DELETE /api/bookmarks` | Bookmark CRUD |
| `GET/PUT /api/reading-progress` | Reading progress |
| `GET/PUT /api/settings` | App settings |
| `GET /api/stats` | Reading statistics |

---

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (Replit-managed)
- `SESSION_SECRET` — Session secret (Replit secret)
- `QURAN_API_BASE` — Quran.com API base URL (default: `https://api.quran.com/api/v4`)

---

## Codegen

Run after editing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Development

Both workflows are managed by Replit:
- `artifacts/api-server: API Server` — runs Express on assigned PORT
- `artifacts/quran: web` — runs Vite dev server on assigned PORT
