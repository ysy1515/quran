package com.yahya.quran;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Notification channels used by the web layer (see src/lib/muezzins.ts).
 *
 * On Android 8+ the channel, not the notification, decides the sound, and a channel's
 * sound cannot be changed once it exists. So each adhan recording has its own channel,
 * and a changed recording must get a new channel ID (bump the _v suffix in both places).
 *
 * Sounds use USAGE_NOTIFICATION, so they follow the ringer mode, Do Not Disturb and the
 * notification volume like any other notification. Users can change or mute each channel
 * in the system settings; creating a channel again never overrides their choice.
 */
final class NotificationChannels {

    static final String PRAYER_DEFAULT = "prayer_default_v1";
    static final String REMINDERS = "reminders_v1";
    private static final int ADHAN_COUNT = 5;

    private NotificationChannels() {}

    static void ensure(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        AudioAttributes attributes = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();

        for (int n = 1; n <= ADHAN_COUNT; n++) {
            NotificationChannel channel = new NotificationChannel(
                "prayer_adhan_" + n + "_v1",
                "الأذان — المؤذن " + n,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("تنبيه وقت الصلاة مع الأذان كاملًا بصوت المؤذن " + n);
            channel.setSound(
                Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/raw/adhan_" + n),
                attributes
            );
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        // No setSound(): a new channel plays the device's default notification sound.
        NotificationChannel prayerDefault = new NotificationChannel(
            PRAYER_DEFAULT,
            "تنبيهات الصلاة — صوت الجهاز",
            NotificationManager.IMPORTANCE_HIGH
        );
        prayerDefault.setDescription("تنبيه وقت الصلاة والتنبيه قبل الأذان بصوت الإشعار الافتراضي");
        prayerDefault.enableVibration(true);
        manager.createNotificationChannel(prayerDefault);

        NotificationChannel reminders = new NotificationChannel(
            REMINDERS,
            "تذكيرات يومية",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        reminders.setDescription("الورد اليومي وأذكار الصباح والمساء وسورة الملك والبقرة");
        manager.createNotificationChannel(reminders);
    }
}
