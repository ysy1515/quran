import { Router, type IRouter } from "express";
import { db, deviceTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const RegisterDeviceBody = z.object({
  token: z.string().min(10),
  platform: z.enum(["ios", "android", "web"]),
  deviceId: z.string().min(1),
  enabledPrayers: z.array(z.string()).optional(),
  muezzinId: z.string().optional(),
  reminderMinutes: z.number().int().min(0).max(60).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationName: z.string().optional(),
  calcMethod: z.string().optional(),
  madhab: z.string().optional(),
});

const UpdatePrefsBody = z.object({
  token: z.string().min(10),
  enabledPrayers: z.array(z.string()).optional(),
  muezzinId: z.string().optional(),
  reminderMinutes: z.number().int().min(0).max(60).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationName: z.string().optional(),
  calcMethod: z.string().optional(),
  madhab: z.string().optional(),
});

// POST /api/notifications/register-device
router.post("/register-device", async (req, res): Promise<void> => {
  const parsed = RegisterDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة", details: parsed.error.message });
    return;
  }

  const { token, platform, deviceId, enabledPrayers, muezzinId, reminderMinutes,
          locationLat, locationLng, locationName, calcMethod, madhab } = parsed.data;

  try {
    await db
      .insert(deviceTokensTable)
      .values({
        token,
        platform,
        deviceId,
        enabledPrayers: JSON.stringify(enabledPrayers ?? ["fajr", "dhuhr", "asr", "maghrib", "isha"]),
        muezzinId: muezzinId ?? "haram-ali-mulla",
        reminderMinutes: reminderMinutes ?? 0,
        locationLat,
        locationLng,
        locationName,
        calcMethod: calcMethod ?? "UmmAlQura",
        madhab: madhab ?? "Hanafi",
      })
      .onConflictDoUpdate({
        target: deviceTokensTable.token,
        set: {
          deviceId,
          enabledPrayers: JSON.stringify(enabledPrayers ?? ["fajr", "dhuhr", "asr", "maghrib", "isha"]),
          muezzinId: muezzinId ?? "haram-ali-mulla",
          reminderMinutes: reminderMinutes ?? 0,
          locationLat,
          locationLng,
          locationName,
          calcMethod: calcMethod ?? "UmmAlQura",
          madhab: madhab ?? "Hanafi",
          updatedAt: new Date(),
        },
      });

    res.status(200).json({ ok: true, message: "تم تسجيل الجهاز بنجاح" });
  } catch (err) {
    req.log.error({ err }, "Failed to register device token");
    res.status(500).json({ error: "فشل تسجيل الجهاز" });
  }
});

// POST /api/notifications/update-preferences
router.post("/update-preferences", async (req, res): Promise<void> => {
  const parsed = UpdatePrefsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات غير صالحة", details: parsed.error.message });
    return;
  }

  const { token, enabledPrayers, muezzinId, reminderMinutes,
          locationLat, locationLng, locationName, calcMethod, madhab } = parsed.data;

  try {
    const existing = await db
      .select({ id: deviceTokensTable.id })
      .from(deviceTokensTable)
      .where(eq(deviceTokensTable.token, token))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "الجهاز غير مسجّل" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (enabledPrayers !== undefined) updates.enabledPrayers = JSON.stringify(enabledPrayers);
    if (muezzinId !== undefined) updates.muezzinId = muezzinId;
    if (reminderMinutes !== undefined) updates.reminderMinutes = reminderMinutes;
    if (locationLat !== undefined) updates.locationLat = locationLat;
    if (locationLng !== undefined) updates.locationLng = locationLng;
    if (locationName !== undefined) updates.locationName = locationName;
    if (calcMethod !== undefined) updates.calcMethod = calcMethod;
    if (madhab !== undefined) updates.madhab = madhab;

    await db
      .update(deviceTokensTable)
      .set(updates)
      .where(eq(deviceTokensTable.token, token));

    res.json({ ok: true, message: "تم تحديث التفضيلات" });
  } catch (err) {
    req.log.error({ err }, "Failed to update device preferences");
    res.status(500).json({ error: "فشل تحديث التفضيلات" });
  }
});

// DELETE /api/notifications/unregister-device
router.delete("/unregister-device", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "مطلوب توكن الجهاز" });
    return;
  }

  try {
    await db.delete(deviceTokensTable).where(eq(deviceTokensTable.token, token));
    res.json({ ok: true, message: "تم إلغاء تسجيل الجهاز" });
  } catch (err) {
    req.log.error({ err }, "Failed to unregister device token");
    res.status(500).json({ error: "فشل إلغاء التسجيل" });
  }
});

export default router;
