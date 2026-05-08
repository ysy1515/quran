import cron from "node-cron";
import { sendPushToAll } from "../routes/push.js";
import { logger } from "./logger.js";

// Saudi Arabia time = UTC+3
// 12:00 PM KSA = 09:00 UTC  → cron: "0 9 * * *"
// 06:00 PM KSA = 15:00 UTC  → cron: "0 15 * * *"
// 09:00 PM KSA = 18:00 UTC  → cron: "0 18 * * *"

const QURAN_REMINDERS = [
  {
    cron: "0 9 * * *", // 12:00 PM KSA
    payload: {
      title: "📖 حان وقت الورد",
      body: "لا تنسَ ورد الظهر من القرآن الكريم — خصص 10 دقائق لتلاوة كلام الله",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: "quran-noon",
    },
  },
  {
    cron: "0 15 * * *", // 06:00 PM KSA
    payload: {
      title: "🌅 ورد المساء",
      body: "اجعل لك نصيباً من كتاب الله — ورد المساء ينتظرك",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: "quran-evening",
    },
  },
];

const DHIKR_REMINDER = {
  cron: "0 18 * * *", // 09:00 PM KSA
  payload: {
    title: "📿 أذكار المساء",
    body: "«مَن قَالَ سُبحانَ اللهِ وبِحَمدِهِ مائةَ مرةٍ حُطَّت عنه خطاياه» — سبّح الآن",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: "dhikr-night",
  },
};

export function startScheduler() {
  for (const reminder of QURAN_REMINDERS) {
    cron.schedule(reminder.cron, async () => {
      try {
        const result = await sendPushToAll("quran", reminder.payload);
        logger.info({ result, tag: reminder.payload.tag }, "Quran reminder sent");
      } catch (err) {
        logger.error(err, "Failed to send Quran reminder");
      }
    });
  }

  cron.schedule(DHIKR_REMINDER.cron, async () => {
    try {
      const result = await sendPushToAll("dhikr", DHIKR_REMINDER.payload);
      logger.info({ result }, "Dhikr reminder sent");
    } catch (err) {
      logger.error(err, "Failed to send Dhikr reminder");
    }
  });

  logger.info("Push notification scheduler started (KSA: 12PM, 6PM Quran | 9PM Dhikr)");
}
