# UI redesign screenshots

Reference, before and after, captured at iPhone 13 size (390×844) in Chromium.

- The Quran API was not reachable from the build machine, so the after screens use a mocked API. The ayah text in them is the Tanzil Uthmani text (from the semarketir/quranjson mirror), loaded only for these screenshots. Nothing from it is in the app.
- The time is fixed to 17 Oct 2026 14:12 in Riyadh, so the prayer times can be compared with reference 5.
- The device has sample saved data: a khatmah, bookmarks, favourites, a tasbeeh count and reading time.

## 3D feature icons (PR #3 review round)

- `11-athkar-3d-icons.jpg`: the Athkar grid (top, scrolled, dark mode) and the empty khatmah card, with the final icons in place.
- `12-3d-icon-set.jpg`: all 11 icons on deep-green and ivory backgrounds.

The icons are real 3D renders (three.js, one shared camera, lighting, environment and three materials), built from code in `artifacts/quran/tools/feature-art`. They contain no text or lettering. They were not drawn by a designer; any of them can be replaced by dropping a designer's WebP with the same name into `src/assets/feature-art/`.
