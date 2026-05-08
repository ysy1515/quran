import cron from "node-cron";
import { sendPushToAll } from "../routes/push.js";
import { logger } from "./logger.js";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Read current notification times from DB (KSA = UTC+3)
async function getNotifTimes() {
  try {
    const [s] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.sessionId, "default"))
      .limit(1);
    return {
      quran1: s?.notifQuran1 ?? "12:00",
      quran2: s?.notifQuran2 ?? "18:00",
      dhikr: s?.notifDhikr ?? "21:00",
    };
  } catch {
    return { quran1: "12:00", quran2: "18:00", dhikr: "21:00" };
  }
}

// Convert KSA time "HH:MM" to UTC "HH:MM" (subtract 3 hours)
function ksaToUtc(ksaTime: string): { h: number; m: number } {
  const [hStr, mStr] = ksaTime.split(":");
  let h = parseInt(hStr, 10) - 3;
  const m = parseInt(mStr, 10);
  if (h < 0) h += 24;
  return { h, m };
}

export function startScheduler() {
  // Run every minute — check if current UTC time matches any notification time
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const utcH = now.getUTCHours();
      const utcM = now.getUTCMinutes();

      const times = await getNotifTimes();

      const quran1 = ksaToUtc(times.quran1);
      const quran2 = ksaToUtc(times.quran2);
      const dhikr  = ksaToUtc(times.dhikr);

      if (utcH === quran1.h && utcM === quran1.m) {
        const result = await sendPushToAll("quran", {
          title: "📖 حان وقت الورد",
          body: "لا تنسَ ورد القرآن — خصص 10 دقائق لتلاوة كلام الله",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: "quran-1",
        });
        logger.info({ result, time: times.quran1 }, "Quran reminder 1 sent");
      }

      if (utcH === quran2.h && utcM === quran2.m) {
        const result = await sendPushToAll("quran", {
          title: "🌅 ورد المساء",
          body: "اجعل لك نصيباً من كتاب الله — ورد المساء ينتظرك",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: "quran-2",
        });
        logger.info({ result, time: times.quran2 }, "Quran reminder 2 sent");
      }

      if (utcH === dhikr.h && utcM === dhikr.m) {
        const result = await sendPushToAll("dhikr", {
          title: "📿 أذكار المساء",
          body: "«مَن قَالَ سُبحانَ اللهِ وبِحَمدِهِ مائةَ مرةٍ حُطَّت عنه خطاياه» — سبّح الآن",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: "dhikr",
        });
        logger.info({ result, time: times.dhikr }, "Dhikr reminder sent");
      }
    } catch (err) {
      logger.error(err, "Scheduler error");
    }
  });

  logger.info("Push notification scheduler started (checks every minute, reads times from DB)");
}
