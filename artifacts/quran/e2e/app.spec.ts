import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mockApi";
import { APP_CONFIG } from "../src/lib/appConfig";

const TABS = [
  { path: "/", label: "ورد اليوم" },
  { path: "/athkar", label: "الأذكار" },
  { path: "/adhan", label: "الصلاة" },
  { path: "/index", label: "الفهرس" },
  { path: "/more", label: "المزيد" },
];

async function open(page: Page, path: string, storage: Record<string, unknown> = {}) {
  await page.addInitScript((seed) => {
    sessionStorage.setItem("splash-shown", "1");
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
    }
  }, storage);
  await mockApi(page);
  await page.goto(path);
  await expect(page.getByTestId("tabbar")).toBeVisible();
}

const box = async (page: Page, testId: string) => (await page.getByTestId(testId).first().boundingBox())!;

test.describe("fixed shell", () => {
  for (const tab of TABS) {
    test(`${tab.label}: header and tab bar stay put while only the middle scrolls`, async ({ page }) => {
      await open(page, tab.path);
      const header = await box(page, "app-header");
      const bar = await box(page, "tabbar");
      const viewport = page.viewportSize()!;
      expect(header.y).toBe(0);
      expect(Math.round(bar.y + bar.height)).toBe(viewport.height);

      const body = page.getByTestId("screen-body");
      await body.evaluate((el) => el.scrollBy(0, 2000));
      await page.mouse.wheel(0, 2000);
      expect(await box(page, "app-header")).toEqual(header);
      expect(await box(page, "tabbar")).toEqual(bar);
      // The document itself never scrolls; the body scroller sits between the bars.
      expect(await page.evaluate(() => [window.scrollY, document.documentElement.scrollHeight - window.innerHeight])).toEqual([0, 0]);
      const b = await body.boundingBox();
      expect(Math.round(b!.y)).toBe(Math.round(header.y + header.height));
      expect(Math.round(b!.y + b!.height)).toBe(Math.round(bar.y));
    });
  }

  test("tabs navigate and mark the active tab", async ({ page }) => {
    await open(page, "/");
    for (const tab of TABS) {
      await page.getByTestId("tabbar").getByRole("link", { name: tab.label }).click();
      await expect(page).toHaveURL(new RegExp(`${tab.path === "/" ? "/$" : tab.path}`));
      await expect(page.getByTestId("tabbar").getByRole("link", { name: tab.label })).toHaveAttribute("aria-current", "page");
    }
  });

  test("sub-screens keep their parent tab active and the back button returns", async ({ page }) => {
    await open(page, "/more");
    await page.getByTestId("more-bookmarks").click();
    await expect(page.getByTestId("tabbar").getByRole("link", { name: "المزيد" })).toHaveAttribute("aria-current", "page");
    await page.getByTestId("header-back").click();
    await expect(page).toHaveURL(/\/more$/);
  });
});

test.describe("layout", () => {
  for (const width of [320, 390, 430]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      for (const path of ["/", "/khatmah/new", "/athkar", "/athkar/morning", "/adhan", "/adhan/settings", "/index", "/index?tab=juz", "/more", "/dhikr", "/mushaf/2", "/bookmarks", "/settings"]) {
        await open(page, path);
        const overflow = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>("body *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length,
        );
        expect(overflow, path).toBe(0);
        expect(await page.evaluate(() => document.dir || document.documentElement.dir)).toBe("rtl");
      }
    });
  }

  test("tab bar and header buttons are at least 44px", async ({ page }) => {
    await open(page, "/");
    for (const el of await page.locator(".tabbar__link, .header-btn").all()) {
      const b = (await el.boundingBox())!;
      expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("khatmah", () => {
  test("start a plan, finish a wird, persist across reloads, undo", async ({ page }) => {
    await open(page, "/");
    await page.getByTestId("start-khatmah").click();
    await page.getByTestId("plan-juz").click();
    await expect(page.getByTestId("plan-summary")).toContainText("٣٠ وردًا");
    await page.getByTestId("create-khatmah").click();

    const card = page.getByTestId("wird-card");
    await expect(card).toContainText("الجزء الأول");
    await expect(card).toContainText("سورة الفاتحة - آية ١");
    await expect(card).toContainText("إلى سورة البقرة - آية ١٤١");
    await expect(page.getByTestId("wird-preview")).toContainText("[نص تجريبي للآية 1:1]");

    await page.getByTestId("finish-wird").click();
    await expect(card).toContainText("الجزء الثاني");
    await page.getByRole("button", { name: "تراجع" }).click();
    await expect(card).toContainText("الجزء الأول");
    await page.getByTestId("finish-wird").click();
    await expect(card).toContainText("الجزء الثاني");
    await expect(page.getByTestId("khatmah-progress")).toHaveAttribute("aria-valuenow", "1");
    await page.reload();
    await expect(page.getByTestId("khatmah-progress")).toHaveAttribute("aria-valuenow", "1");
    await expect(page.getByTestId("previous-portions")).toContainText("١");

    await page.getByTestId("previous-portions").click();
    await expect(page.getByText("الورد ١")).toBeVisible();
  });

  test("a plan from a later juz finishes as a reading plan, not a full khatmah", async ({ page }) => {
    await open(page, "/khatmah/new");
    await page.getByTestId("plan-juz").click();
    await page.getByTestId("start-juz").selectOption("29");
    await expect(page.getByTestId("plan-summary")).toContainText("خطة قراءة من الجزء التاسع والعشرون");
    await page.getByTestId("create-khatmah").click();
    await expect(page.getByTestId("khatmah-progress-title")).toContainText("خطة القراءة");
    await page.getByTestId("finish-wird").click();
    await page.getByTestId("finish-wird").click();
    await expect(page.getByTestId("khatmah-finished")).toContainText("أتممت خطة القراءة");
    await expect(page.getByTestId("khatmah-finished")).toContainText("لا تُحسب ختمة كاملة");

    await page.goto("/more");
    await expect(page.getByTestId("stat-khatmas")).toContainText("٠");
    await expect(page.getByTestId("stat-partial-plans")).toContainText("١");
  });

  test("continue reading opens the reader inside the wird", async ({ page }) => {
    await open(page, "/", {
      "quran.khatmah.v1": {
        plan: { id: "k1", startedAt: "2026-10-01T00:00:00.000Z", unit: "rub", size: 8, portions: 1, startJuz: 1, completions: ["2026-10-02T00:00:00.000Z"] },
        history: [],
      },
    });
    await page.getByTestId("continue-wird").click();
    await expect(page).toHaveURL(/\/mushaf\/2\?ayah=142&wird=1/);
    await expect(page.getByTestId("wird-banner")).toContainText("الورد ٢");
  });
});

test.describe("existing data", () => {
  test("old reading stop, progress, tasbeeh and prayer settings still load", async ({ page }) => {
    const seed = {
      "quran.readingStop.v1": { surahNumber: 18, verseNumber: 10, pageNumber: 294, surahName: "الكهف", createdAt: "2026-10-10T10:00:00.000Z" },
      "quran.progress.v1": { lastSurahNumber: 36, lastVerseNumber: 1, lastPageNumber: 440, lastSurahName: "يس", updatedAt: "2026-10-10T10:00:00.000Z" },
      "dhikr-state": { presetText: "أَسْتَغْفِرُ اللَّهَ", target: 100, sessions: 7 },
      adhan_prefs: { enabled: false, muezzinId: "adhan-3", enabledPrayers: ["fajr"], snoozedUntil: null, calcMethod: "Egyptian", madhab: "Hanafi", reminderMinutes: 10, prefsVersion: 2 },
      adhan_coords: { lat: 24.71, lng: 46.67 },
    };
    await open(page, "/", seed);
    await expect(page.getByTestId("continue-reading")).toContainText("سورة يس");

    await page.goto("/bookmarks");
    await expect(page.getByTestId("reading-stop")).toContainText("سورة الكهف، آية ١٠");

    await page.goto("/dhikr");
    await expect(page.getByTestId("dhikr-preset")).toContainText("أَسْتَغْفِرُ اللَّهَ");
    await expect(page.getByTestId("dhikr-sessions")).toHaveText("٧");

    await page.goto("/adhan/settings");
    await expect(page.getByTestId("calc-method")).toHaveValue("Egyptian");
    await expect(page.getByRole("tab", { name: "حنفي" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("radio", { name: /أذان ٣/ })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("reader", () => {
  test("bookmark and favourite an ayah, then find them in the More lists", async ({ page }) => {
    await open(page, "/mushaf/2?ayah=255");
    await expect(page.getByTestId("app-header")).toContainText("سورة البقرة");
    await page.locator('[data-ayah="255"] [role="button"]').click();
    await page.getByTestId("action-bookmark").click();
    await page.getByTestId("action-favorite").click();
    await page.keyboard.press("Escape");

    await page.reload();
    await page.goto("/bookmarks");
    await expect(page.getByTestId("bookmark-2-255")).toContainText("سورة البقرة، آية ٢٥٥");
    await page.goto("/favorites");
    await expect(page.getByTestId("favorite-2-255")).toContainText("[نص تجريبي للآية 2:255]");
    await page.goto("/more");
    await expect(page.getByTestId("more-bookmarks")).toContainText("١");
  });

  test("records the ayah being read as the continue-reading position", async ({ page }) => {
    await open(page, "/mushaf/2?ayah=100");
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("quran.progress.v1") ?? "{}").lastVerseNumber)).toBe(100);
    await page.getByTestId("screen-body").evaluate((el) => el.scrollBy(0, 1500));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("quran.progress.v1") ?? "{}").lastVerseNumber)).toBeGreaterThan(100);
  });

  test("focus mode hides the header and tab bar, and comes back", async ({ page }) => {
    await open(page, "/mushaf/1");
    await page.getByTestId("focus-mode").click();
    await expect(page.getByTestId("app-header")).toHaveAttribute("aria-hidden", "true");
    await page.getByTestId("exit-focus").click();
    await expect(page.getByTestId("app-header")).not.toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("tasbeeh", () => {
  test("count survives a reload; reset asks first", async ({ page }) => {
    await open(page, "/dhikr");
    for (let i = 0; i < 3; i++) await page.getByTestId("dhikr-tap").click();
    await expect(page.getByTestId("dhikr-count")).toHaveText("٣");
    await page.reload();
    await expect(page.getByTestId("dhikr-count")).toHaveText("٣");
    await page.getByTestId("dhikr-reset").click();
    await page.getByTestId("confirm-no").click();
    await expect(page.getByTestId("dhikr-count")).toHaveText("٣");
    await page.getByTestId("dhikr-reset").click();
    await page.getByTestId("confirm-yes").click();
    await expect(page.getByTestId("dhikr-count")).toHaveText("٠");
  });
});

test.describe("brand", () => {
  test("shows the مصحفك name on About and More, and in the page title", async ({ page }) => {
    await open(page, "/about");
    await expect(page).toHaveTitle(/مصحفك/);
    await expect(page.getByTestId("brand-lockup")).toContainText("مصحفك");
    await expect(page.getByTestId("brand-lockup")).toContainText("مصحفك معك");
    await page.goto("/more");
    await expect(page.getByTestId("brand-lockup")).toContainText("مصحفك");
    await expect(page.getByText("عن مصحفك")).toBeVisible();
  });

  test("the short surahs list opens An-Nas", async ({ page }) => {
    await open(page, "/more");
    await expect(page.getByTestId("short-surah-114")).toContainText("سورة الناس");
    await expect(page.getByTestId("short-surah-105")).toContainText("سورة الفيل");
    await page.getByTestId("short-surah-114").click();
    await expect(page).toHaveURL(/\/mushaf\/114/);
  });
});

test.describe("prayer", () => {
  test("shows six times, a countdown and the next prayer", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-17T09:00:00+03:00"));
    await open(page, "/adhan", { adhan_coords: { lat: 21.42, lng: 39.83 } });
    await expect(page.getByTestId("prayer-list").locator("li")).toHaveCount(6);
    await expect(page.getByTestId("prayer-countdown")).toBeVisible();
    await expect(page.locator('[aria-current="time"]')).toHaveCount(1);
    await page.getByTestId("next-day").click();
    await expect(page.locator('[aria-current="time"]')).toHaveCount(0);
  });
});

const PUBLIC_PAGES = [
  {
    path: "/support",
    testId: "support-page",
    title: "الدعم والمساعدة – مصحفك",
    sections: ["عن مصحفك", "الإبلاغ عن مشكلة", "الأسئلة الشائعة", "الخصوصية"],
  },
  {
    path: "/privacy",
    testId: "privacy-page",
    title: "سياسة الخصوصية – مصحفك",
    sections: [
      "الجهة المسؤولة والتواصل",
      "البيانات المحفوظة على جهازك",
      "الموقع ومواقيت الصلاة",
      "خدمات القرآن الكريم والبحث",
      "الإشعارات",
      "الاستضافة وسجلات الخادم",
      "بيانات من إصدارات سابقة",
      "مزوّدو الخدمات من أطراف أخرى",
      "الاحتفاظ بالبيانات وحذفها",
      "خياراتك وحقوقك",
      "تحديث هذه السياسة",
    ],
  },
];

test.describe("public pages", () => {
  for (const pg of PUBLIC_PAGES) {
    for (const path of [pg.path, `${pg.path}/`]) {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
        test(`${path} at ${viewport.width}px opens directly, without the app shell or splash`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await mockApi(page);
          const res = await page.goto(path);
          expect(res?.status()).toBe(200);
          await expect(page).toHaveTitle(pg.title);
          const root = page.getByTestId(pg.testId);
          await expect(root.getByRole("heading", { level: 1 })).toHaveText(pg.title);
          await expect(root).toContainText("مصحفك معك");
          for (const title of pg.sections) {
            await expect(root.getByRole("heading", { level: 2, name: title })).toBeVisible();
          }
          await expect(page.getByTestId("tabbar")).toHaveCount(0);
          // No splash covers the page: what sits on top in the middle of the screen is the page itself.
          expect(await page.evaluate((id) => !!document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest(`[data-testid=${id}]`), pg.testId)).toBe(true);
          expect(await root.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
          // Long content scrolls inside the page and nothing overflows sideways.
          expect(await root.evaluate((el) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
          // No leftover placeholder text.
          expect(await root.innerText()).not.toMatch(/example\.com|placeholder|TODO|lorem|XXX/i);
        });
      }
    }
  }

  test("support and privacy link to each other", async ({ page }) => {
    await mockApi(page);
    await page.goto("/support");
    await page.getByTestId("privacy-link").click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await page.getByTestId("support-link").click();
    await expect(page).toHaveURL(/\/support$/);
    await page.getByTestId("footer-privacy-link").click();
    await expect(page).toHaveURL(/\/privacy$/);
    await page.getByTestId("footer-support-link").click();
    await expect(page).toHaveURL(/\/support$/);
  });

  test("FAQ answers open, and every support email is a working mailto link when configured", async ({ page }) => {
    await mockApi(page);
    await page.goto("/support");
    const faq = page.locator("#faq details");
    await expect(faq).toHaveCount(6);
    await faq.first().locator("summary").click();
    await expect(faq.first()).toHaveAttribute("open", "");
    const email = APP_CONFIG.supportEmail;
    const links = [["/support", "support-email"], ["/support", "report-email"], ["/privacy", "privacy-email"]] as const;
    for (const [path, testId] of links) {
      await page.goto(path);
      const link = page.getByTestId(testId);
      if (email) {
        await expect(link).toHaveAttribute("href", new RegExp(`^mailto:${email.replace(/[.+]/g, "\\$&")}\\?subject=`));
        await expect(link).toContainText(email);
      } else {
        await expect(link).toHaveCount(0);
      }
    }
  });

  test("the privacy policy shows its update date and the configured operator", async ({ page }) => {
    await mockApi(page);
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-updated")).toContainText("آخر تحديث");
    await expect(page.getByTestId("operator-name")).toHaveCount(APP_CONFIG.operatorName ? 1 : 0);
  });
});
