package com.yahya.quran;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Channels must exist before any notification is posted to them, and a
        // notification posted to a missing channel is dropped by Android 8+.
        NotificationChannels.ensure(this);
        super.onCreate(savedInstanceState);
    }
}
