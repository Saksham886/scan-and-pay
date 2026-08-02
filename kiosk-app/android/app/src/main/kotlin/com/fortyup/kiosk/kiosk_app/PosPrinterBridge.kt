package com.fortyup.kiosk.kiosk_app

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import net.posprinter.utils.DataForSendToPrinterPos80

/** Character columns assumed for the 80mm receipt printer's default font. */
private const val LINE_WIDTH = 42

private const val ACTION_USB_PERMISSION = "com.fortyup.kiosk.kiosk_app.USB_PRINTER_PERMISSION"
private const val WRITE_TIMEOUT_MS = 5000

/**
 * Talks to the USB 80mm receipt printer directly via Android's UsbManager,
 * bypassing the vendor (ThinkPc/net.posprinter) SDK's own USB connect path -
 * that path hardcodes a whitelist of 8 vendor IDs which doesn't include this
 * printer's controller, so it refuses to connect no matter what device path
 * it's given. This only reuses the SDK's DataForSendToPrinterPos80 class,
 * which is a pure ESC/POS byte-array builder with no device I/O in it.
 */
class PosPrinterBridge(private val activity: Activity) : MethodChannel.MethodCallHandler {

    private val context: Context = activity
    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private val mainHandler = Handler(Looper.getMainLooper())

    private var device: UsbDevice? = null
    private var connection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var outEndpoint: UsbEndpoint? = null

    /** The connectUsb call that's waiting on the permission-request broadcast. */
    private var pendingPermissionResult: MethodChannel.Result? = null

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    val result = pendingPermissionResult
                    pendingPermissionResult = null
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    val dev: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    if (granted && dev != null && openConnection(dev)) {
                        result?.success(mapOf("ok" to true))
                    } else {
                        result?.success(mapOf("ok" to false, "error" to "USB permission denied"))
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val dev: UsbDevice? = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    if (dev != null && dev.deviceName == device?.deviceName) closeConnection()
                }
            }
        }
    }

    init {
        val filter = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(receiver, filter)
        }
    }

    fun dispose() {
        try {
            context.unregisterReceiver(receiver)
        } catch (_: IllegalArgumentException) {
            // Already unregistered - nothing to do.
        }
        closeConnection()
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "connectUsb" -> connectUsb(result)
            "printReceipt" -> printReceipt(call, result)
            "printerStatus" -> printerStatus(result)
            "listUsbDevices" -> listUsbDevices(result)
            else -> result.notImplemented()
        }
    }

    /**
     * Every USB device Android's UsbManager currently sees, completely
     * unfiltered - independent of whether connectUsb would accept it. Powers
     * a raw diagnostic view so "is anything being detected at all" can be
     * checked directly (e.g. by plugging in an unrelated phone as a sanity
     * check) instead of only ever seeing "connected"/"not connected".
     */
    private fun listUsbDevices(result: MethodChannel.Result) {
        val devices = usbManager.deviceList.values.map { dev ->
            val isPrinterClass = (0 until dev.interfaceCount).any { i ->
                dev.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_PRINTER
            }
            mapOf(
                "name" to (dev.productName ?: dev.deviceName),
                "vendorId" to dev.vendorId,
                "productId" to dev.productId,
                "isPrinterClass" to isPrinterClass,
                "hasBulkOut" to (findBulkOutEndpoint(dev) != null),
                "hasPermission" to usbManager.hasPermission(dev)
            )
        }
        result.success(mapOf("devices" to devices))
    }

    private fun connectUsb(result: MethodChannel.Result) {
        val dev = findPrinterDevice()
        if (dev == null) {
            result.success(mapOf("ok" to false, "error" to "No USB printer detected"))
            return
        }

        if (usbManager.hasPermission(dev)) {
            if (openConnection(dev)) {
                result.success(mapOf("ok" to true))
            } else {
                result.success(mapOf("ok" to false, "error" to "Could not open the USB printer"))
            }
            return
        }

        pendingPermissionResult = result

        // The intent must be explicit (package set) - on Android 14+, a
        // mutable PendingIntent built from a bare implicit intent throws
        // IllegalArgumentException instead of ever reaching UsbManager,
        // which is what was silently killing this request before any
        // dialog could appear. FLAG_MUTABLE itself can't be dropped: the
        // system needs to write EXTRA_DEVICE/EXTRA_PERMISSION_GRANTED into
        // this intent when it broadcasts the result.
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION).setPackage(context.packageName),
            flags
        )
        usbManager.requestPermission(dev, permissionIntent)
        // result completes later, from the receiver above, once the user
        // responds to (or the system auto-grants) the permission dialog.
    }

    /** Prefers the standard USB Printer class (7); falls back to any bulk-OUT device. */
    private fun findPrinterDevice(): UsbDevice? {
        val devices = usbManager.deviceList.values
        devices.firstOrNull { dev -> (0 until dev.interfaceCount).any { i -> dev.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_PRINTER } }
            ?.let { return it }
        return devices.firstOrNull { dev -> findBulkOutEndpoint(dev) != null }
    }

    private fun findBulkOutEndpoint(dev: UsbDevice): Pair<UsbInterface, UsbEndpoint>? {
        for (i in 0 until dev.interfaceCount) {
            val iface = dev.getInterface(i)
            for (e in 0 until iface.endpointCount) {
                val ep = iface.getEndpoint(e)
                if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                    return iface to ep
                }
            }
        }
        return null
    }

    private fun openConnection(dev: UsbDevice): Boolean {
        val (iface, out) = findBulkOutEndpoint(dev) ?: return false
        val conn = usbManager.openDevice(dev) ?: return false
        if (!conn.claimInterface(iface, true)) {
            conn.close()
            return false
        }
        device = dev
        connection = conn
        usbInterface = iface
        outEndpoint = out
        return true
    }

    private fun closeConnection() {
        try {
            usbInterface?.let { connection?.releaseInterface(it) }
        } catch (_: Exception) {
            // Already released/closed - nothing to do.
        }
        connection?.close()
        device = null
        connection = null
        usbInterface = null
        outEndpoint = null
    }

    private fun printerStatus(result: MethodChannel.Result) {
        val dev = device
        result.success(
            mapOf(
                "connected" to (connection != null && outEndpoint != null),
                "name" to (dev?.productName ?: dev?.deviceName)
            )
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun printReceipt(call: MethodCall, result: MethodChannel.Result) {
        val conn = connection
        val out = outEndpoint
        if (conn == null || out == null) {
            result.success(mapOf("ok" to false, "error" to "Printer not connected"))
            return
        }

        val args = call.arguments as? Map<String, Any?>
        if (args == null) {
            result.success(mapOf("ok" to false, "error" to "Invalid receipt data"))
            return
        }

        val commands = try {
            buildReceiptCommands(args)
        } catch (_: Exception) {
            result.success(mapOf("ok" to false, "error" to "Could not format receipt"))
            return
        }

        // bulkTransfer blocks waiting on hardware I/O - keep it off the
        // platform/UI thread, then hop back to post the MethodChannel result.
        Thread {
            var ok = true
            for (chunk in commands) {
                val sent = conn.bulkTransfer(out, chunk, chunk.size, WRITE_TIMEOUT_MS)
                if (sent < 0) {
                    ok = false
                    break
                }
            }
            val succeeded = ok
            mainHandler.post {
                if (succeeded) {
                    result.success(mapOf("ok" to true))
                } else {
                    result.success(mapOf("ok" to false, "error" to "Printer did not respond"))
                }
            }
        }.start()
    }

    @Suppress("UNCHECKED_CAST")
    private fun buildReceiptCommands(args: Map<String, Any?>): List<ByteArray> {
        val cafeName = (args["cafeName"] as? String)?.trim().takeUnless { it.isNullOrEmpty() } ?: "Receipt"
        val orderNumber = args["orderNumber"] as? String ?: ""
        val dateTime = args["dateTime"] as? String ?: ""
        val items = args["items"] as? List<Map<String, Any?>> ?: emptyList()
        val total = args["total"] as? String ?: ""
        val footer = args["footer"] as? String ?: "Thank you for ordering!"

        val divider = "-".repeat(LINE_WIDTH)
        val doubleDivider = "=".repeat(LINE_WIDTH)

        val receipt = StringBuilder()
            .append(divider).append('\n')
            .append(centerText(cafeName)).append('\n')
            .append(divider).append('\n')
            .append("Order #").append(orderNumber).append('\n')
        if (dateTime.isNotEmpty()) receipt.append(dateTime).append('\n')
        receipt.append(divider).append('\n')

        for (item in items) {
            val qty = asInt(item["qty"])
            val name = item["name"] as? String ?: ""
            val amount = item["amount"] as? String ?: ""
            receipt.append(formatItemLine(qty, name, amount)).append('\n')
        }

        receipt
            .append(divider).append('\n')
            .append(formatTotalLine(total)).append('\n')
            .append(doubleDivider).append('\n')
            .append(centerText(footer)).append('\n')
            .append('\n').append('\n')

        // Non-ASCII characters (e.g. a stray currency glyph) collapse to '?'
        // rather than throwing - this printer's default codepage isn't known.
        val textBytes = receipt.toString().toByteArray(Charsets.US_ASCII)

        return listOf(
            DataForSendToPrinterPos80.initializePrinter(),
            textBytes,
            DataForSendToPrinterPos80.printAndFeedLine(),
            DataForSendToPrinterPos80.selectCutPagerModerAndCutPager(66, 1)
        )
    }

    private fun asInt(value: Any?): Int = when (value) {
        is Int -> value
        is Long -> value.toInt()
        is Double -> value.toInt()
        else -> 1
    }

    private fun centerText(text: String): String {
        val clipped = if (text.length > LINE_WIDTH) text.substring(0, LINE_WIDTH) else text
        val padding = ((LINE_WIDTH - clipped.length) / 2).coerceAtLeast(0)
        return " ".repeat(padding) + clipped
    }

    /** "2x  Cappuccino              240.00" - qty/name left, amount right, fixed width. */
    private fun formatItemLine(qty: Int, name: String, amount: String): String {
        val qtyStr = "${qty}x".padEnd(5)
        val amountStr = amount.padStart(9)
        val maxNameLen = (LINE_WIDTH - qtyStr.length - amountStr.length).coerceAtLeast(1)
        val trimmedName = if (name.length > maxNameLen) {
            name.substring(0, (maxNameLen - 1).coerceAtLeast(0)) + "."
        } else {
            name.padEnd(maxNameLen)
        }
        return qtyStr + trimmedName + amountStr
    }

    private fun formatTotalLine(total: String): String {
        val label = "TOTAL"
        val amountStr = total.padStart((LINE_WIDTH - label.length).coerceAtLeast(0))
        return label + amountStr
    }
}
