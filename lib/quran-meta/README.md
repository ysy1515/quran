# @workspace/quran-meta

Reference numbering for the Hafs ʿan ʿĀṣim Madani mushaf: ayah counts per surah,
juz boundaries, sajdah ayat, page starts and Arabic surah names. **No Quran text lives here.**

`src/hafs.generated.ts` is generated from [quran-meta](https://github.com/quran-center/quran-meta)
(MIT). `src/index.test.ts` checks it against independently written values.

Regenerate:

```bash
mkdir /tmp/qm && cd /tmp/qm && npm pack quran-meta@7.0.0 && tar xzf quran-meta-7.0.0.tgz
node lib/quran-meta/scripts/generate.mjs /tmp/qm/package
pnpm --filter @workspace/quran-meta test
```
