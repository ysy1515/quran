import cron from "node-cron";
import type { PushSubscription } from "@workspace/db";
import { listSubscriptions, sendPush, type PushPayload } from "../routes/push.js";
import { logger } from "./logger.js";

// Reminder times are stored per subscription as "HH:MM" Saudi time (UTC+3).
const KSA_OFFSET_HOURS = 3;

/** Converts a UTC Date to the "HH:MM" string it shows in Saudi Arabia. */
export function ksaClock(now: Date): string {
  const h = (now.getUTCHours() + KSA_OFFSET_HOURS) % 24;
  const m = now.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type Reminder = {
  key: "quran1" | "quran2" | "dhikr";
  due: (s: PushSubscription, clock: string) => boolean;
  payload: PushPayload;
};

const REMINDERS: Reminder[] = [
  {
    key: "quran1",
    due: (s, clock) => s.notifyQuran && s.notifQuran1 === clock,
    payload: {
      title: "📖 حان وقت الورد",
      body: "لا تنسَ ورد القرآن — خصص 10 دقائق لتلاوة كلام الله",
      tag: "quran-1",
    },
  },
  {
    key: "quran2",
    due: (s, clock) => s.notifyQuran && s.notifQuran2 === clock,
    payload: {
      title: "🌅 ورد المساء",
      body: "اجعل لك نصيباً من كتاب الله — ورد المساء ينتظرك",
      tag: "quran-2",
    },
  },
  {
    key: "dhikr",
    due: (s, clock) => s.notifyDhikr && s.notifDhikr === clock,
    payload: {
      title: "📿 أذكار المساء",
      body: "«مَن قَالَ سُبحانَ اللهِ وبِحَمدِهِ مائةَ مرةٍ حُطَّت عنه خطاياه» — سبّح الآن",
      tag: "dhikr",
    },
  },
];

/** Which subscribers are due for which reminder at this minute. */
export function dueReminders(subs: PushSubscription[], now: Date) {
  const clock = ksaClock(now);
  return REMINDERS.map((r) => ({ reminder: r, subs: subs.filter((s) => r.due(s, clock)) })).filter(
    (x) => x.subs.length > 0,
  );
}

export async function runSchedulerTick(now: Date = new Date()): Promise<void> {
  const subs = await listSubscriptions();
  for (const { reminder, subs: targets } of dueReminders(subs, now)) {
    const result = await sendPush(targets, reminder.payload);
    logger.info({ result, reminder: reminder.key }, "Reminder sent");
  }
}

export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      await runSchedulerTick();
    } catch (err) {
      logger.error({ err }, "Scheduler error");
    }
  });

  logger.info("Push notification scheduler started (per-subscriber times, checked every minute)");
}
