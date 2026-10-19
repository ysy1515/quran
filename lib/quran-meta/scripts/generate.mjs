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

const namesFile = fs.readdirSync(distDir).find((f) => /^surah\.ar-.*\.js$/.test(f));
const namesSrc = fs.readFileSync(path.join(distDir, namesFile), "utf8");
const namesLiteral = namesSrc.slice(namesSrc.indexOf("const surahNamesAr = [") + "const surahNamesAr = ".length, namesSrc.indexOf("];", namesSrc.indexOf("const surahNamesAr")) + 1);
const surahNames = Function(`"use strict"; return (${namesLiteral});`)().slice(1, 115).map((n) => n[1]);
if (surahNames.length !== 114 || surahNames.some((n) => typeof n !== "string" || !n)) throw new Error("bad surah names");

const out = `// GENERATED FILE — do not edit by hand.
// Source: quran-meta@${version} (MIT, https://github.com/quran-center/quran-meta), Hafs ʿan ʿĀṣim lists.
// Regenerate with: node lib/quran-meta/scripts/generate.mjs (see README).
// Contains reference numbering and surah names only. No Quran text.

/** Number of ayat in each surah, index 0 = surah 1. */
export const AYAH_COUNTS: readonly number[] = ${fmt(counts)};

/** First ayah of each juz as [surah, ayah], index 0 = juz 1. */
export const JUZ_STARTS: readonly (readonly [number, number])[] = ${fmt(L.JuzList.slice(1, 31).map(toKey))};

/** Ayat with a sajdah tilawah marker as [surah, ayah]. */
export const SAJDAH_AYAT: readonly (readonly [number, number])[] = ${fmt(L.SajdaList.map(toKey))};

/** First ayah of each Madani mushaf page as [surah, ayah], index 0 = page 1. */
export const PAGE_STARTS: readonly (readonly [number, number])[] = ${fmt(L.PageList.slice(1, 605).map(toKey))};

/** First ayah of each hizb quarter (rub' al-hizb) as [surah, ayah], index 0 = quarter 1 (240 total). */
export const RUB_STARTS: readonly (readonly [number, number])[] = ${fmt(L.HizbQuarterList.slice(1, 241).map(toKey))};

/** Arabic surah names without tashkeel (e.g. "البقرة"), index 0 = surah 1. */
export const SURAH_NAMES_AR: readonly string[] = ${fmt(surahNames)};
`;

const here = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(here, "..", "src", "hafs.generated.ts"), out);
console.log(`wrote hafs.generated.ts from quran-meta@${version}`);
