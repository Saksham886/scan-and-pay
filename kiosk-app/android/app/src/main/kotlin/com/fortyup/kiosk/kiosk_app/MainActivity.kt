package com.fortyup.kiosk.kiosk_app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

private const val PRINTER_CHANNEL = "com.fortyup.kiosk/printer"

class MainActivity : FlutterActivity() {
    private var printerBridge: PosPrinterBridge? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val bridge = PosPrinterBridge(this)
        printerBridge = bridge
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, PRINTER_CHANNEL)
            .setMethodCallHandler(bridge)
    }

    override fun onDestroy() {
        printerBridge?.dispose()
        super.onDestroy()
    }
}
