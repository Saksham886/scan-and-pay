package com.fortyup.kiosk.kiosk_app

import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    // Auto screen-pin on every resume so the kiosk locks itself down without
    // anyone having to trigger pinning manually from the Recents menu each
    // time the app (re)starts. Exiting still requires the standard Android
    // unpin gesture (hold Back + Overview), optionally gated by a device PIN
    // if "Ask for PIN before unpinning" is enabled in Settings > Security.
    override fun onResume() {
        super.onResume()
        try {
            startLockTask()
        } catch (e: SecurityException) {
            // Screen pinning unavailable/disabled on this device - app still
            // works normally, just without the lockdown.
        }
    }
}
