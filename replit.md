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
| Mobile | Capacitor (iOS + Android), @capacitor/push-notifications, @capacitor/local-notifications |

---

## Features

- 114 Surahs from Quran.com API with full verse text
- Ibn Kathir Tafsir (Arabic ID 14, English ID 169) via bottom-sheet drawer on verse tap
- **الأذكار** — Categories page with 8 active categories (morning, evening, sleep, post-prayer, istighfar, praise, salah-nabi, istiazah) and 3 coming-soon
- **التفسير والترجمات** — Standalone tafsir lookup page: select surah + verse → Arabic text, English translation, Ibn Kathir tafsir (concise/full toggle)
- **نسخ الآيات** — Copy any ayah from Mushaf action popup, TafsirPanel, and TafsirPage with formatted attribution
- Bookmarks — save/delete verses, stored in PostgreSQL
- Reading progress — tracks last surah/page read
- Settings — dark/light mode, Quran font size
- Search — filter surahs by name
- Juz listing — 30 juz with navigation
- عداد الأذكار — Dhikr counter with progress ring
- Adhan — 5 MP3 adhans selectable by city (Mecca, Medina, Al-Aqsa, Egypt, Turkey)
- RTL Arabic interface throughout
- Responsive: desktop sidebar + mobile bottom nav

---

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Stats + quick access |
| `/mushaf` | Mushaf | Flowing Arabic text reader |
| `/mushaf/:surah` | Mushaf | Direct surah access |
| `/surahs` | Surahs | List of 114 surahs |
| `/juz` | Juz | 30 juz navigation |
| `/search` | Search | Search surahs by name |
| `/bookmarks` | Bookmarks | Saved verses |
| `/adhan` | Adhan | Prayer call MP3 player |
| `/athkar` | Athkar | Adhkar categories & content (NEW) |
| `/dhikr` | Dhikr | Counter with progress ring |
| `/tafsir-translations` | TafsirPage | Standalone tafsir & translation (NEW) |
| `/settings` | Settings | Theme, font size, notifications |
| `/about` | About | App info |

---

## Navigation Structure

**Desktop sidebar** (12 items): الرئيسية، المصحف، السور، الأجزاء، الأذان، الأذكار(/athkar)، عداد الأذكار(/dhikr)، التفسير والترجمات، البحث، العلامات، الإعدادات، حول

**Mobile bottom nav** (5 items): الرئيسية، المصحف، الأذان، الأذكار(/athkar)، الإعدادات

---

## Copy Functionality (`src/lib/clipboard.ts`)

```typescript
copyToClipboard(text, successMsg?)  // copies text, shows toast
formatAyahForCopy(text, surahName, verseNumber)  // formats: "${text}\n— سورة X، الآية N"
```

Copy buttons available in:
- **Mushaf action popup** — 3-button grid: علامة / تفسير / نسخ
- **TafsirPanel header** — copy ayah + copy translation buttons
- **TafsirPage** — copy ayah, copy translation, copy tafsir

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
| `GET /api/verses/:surah/:verse/tafsir` | Ibn Kathir tafsir |
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

## Mobile Build

```bash
# Build + sync both platforms
cd artifacts/quran
pnpm build:mobile
npx cap sync ios
npx cap sync android
```

**App Icon:** Place a 1024×1024 PNG at `artifacts/quran/assets/app-icon.png`, then run:
```bash
npx @capacitor/assets generate
```

---

## Development

Both workflows are managed by Replit:
- `artifacts/api-server: API Server` — runs Express on assigned PORT
- `artifacts/quran: web` — runs Vite dev server on assigned PORT

Production URL: `https://quran.yahya.app`
