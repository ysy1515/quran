// Regenerates src/hafs.generated.ts from the quran-meta npm package.
//
//   mkdir /tmp/qm && cd /tmp/qm && npm pack quran-meta@7.0.0 && tar xzf quran-meta-7.0.0.tgz
//   node lib/quran-meta/scripts/generate.mjs /tmp/qm/package
//
// The source file exports HafsLists under a minified name, so we read the module
// text and evaluate only the object literal.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = process.argv[2];
if (!pkgDir) throw new Error("usage: generate.mjs <path-to-extracted-quran-meta-package>");

const version = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")).version;
const distDir = path.join(pkgDir, "dist");
const file = fs.readdirSync(distDir).find((f) => /^HafsLists-.*\.js$/.test(f));
const src = fs.readFileSync(path.join(distDir, file), "utf8");
const literal = src.slice(src.indexOf("{"), src.lastIndexOf("\n};") + 2);
const L = Function(`"use strict"; return (${literal});`)();

const surahs = L.SurahList.slice(1, 115);
const counts = surahs.map((s) => s[1]);
const starts = surahs.map((s) => s[0]);
const toKey = (g) => {
  let i = 0;
  while (i < 113 && starts[i + 1] <= g) i++;
  return [i + 1, g - starts[i] + 1];
};
const fmt = JSON.stringify;

const out = `// GENERATED FILE — do not edit by hand.
// Source: quran-meta@${version} (MIT, https://github.com/quran-center/quran-meta), Hafs ʿan ʿĀṣim lists.
// Regenerate with: node lib/quran-meta/scripts/generate.mjs (see README).
// Contains reference numbering only (counts and boundaries). No Quran text.

/** Number of ayat in each surah, index 0 = surah 1. */
export const AYAH_COUNTS: readonly number[] = ${fmt(counts)};

/** First ayah of each juz as [surah, ayah], index 0 = juz 1. */
export const JUZ_STARTS: readonly (readonly [number, number])[] = ${fmt(L.JuzList.slice(1, 31).map(toKey))};

/** Ayat with a sajdah tilawah marker as [surah, ayah]. */
export const SAJDAH_AYAT: readonly (readonly [number, number])[] = ${fmt(L.SajdaList.map(toKey))};

/** First ayah of each Madani mushaf page as [surah, ayah], index 0 = page 1. */
export const PAGE_STARTS: readonly (readonly [number, number])[] = ${fmt(L.PageList.slice(1, 605).map(toKey))};
`;

const here = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(here, "..", "src", "hafs.generated.ts"), out);
console.log(`wrote hafs.generated.ts from quran-meta@${version}`);
