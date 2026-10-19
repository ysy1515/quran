# Feature artwork (3D assets)

Tiles use `<FeatureArt name="…" />`. If a file named after the art exists in this
folder, it is used automatically; otherwise a layered-SVG fallback is drawn.

The current files are 3D renders made with `tools/feature-art` (procedural
three.js models, one shared scene and material set). A designer's file with the
same name replaces any of them with no code change.

| File name (`.webp`, or `.png`) | Used on |
|---|---|
| `morning` | Athkar: أذكار الصباح |
| `evening` | Athkar: أذكار المساء |
| `sleep` | Athkar: أذكار النوم |
| `post-prayer` | Athkar: الأذكار بعد السلام من الصلاة |
| `istighfar` | Athkar: الاستغفار |
| `praise` | Athkar: الثناء على الله تعالى |
| `salah-nabi` | Athkar: الصلاة على النبي ﷺ |
| `istiazah` | Athkar: الاستعاذات |
| `tasbeeh` | Athkar: عداد التسبيح |
| `khatmah` | Home: khatmah setup |
| `quran` | reserved (rendered, not yet placed) |

Asset spec for the designer:
- One material family: brushed gold and warm ivory details, with deep-green
  ceramic where a body colour is needed. Soft key light from the top-left
  (about 45°), one soft contact shadow, no outlines.
- **No text, no Arabic or pseudo-Arabic lettering, no Quran text.**
- Transparent background, square, centred with about 8% padding.
- Masters at 1024 px; export 512 px WebP (quality 85) here. Target ≤ 40 KB each.
- The tile backgrounds are deep green, so check contrast on `#143826`.
