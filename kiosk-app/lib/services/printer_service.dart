import 'package:flutter/services.dart';

import '../models/order.dart';

class PrinterResult {
  final bool ok;
  final String? error;

  const PrinterResult({required this.ok, this.error});
}

class PrinterStatus {
  final bool connected;
  final String? name;

  const PrinterStatus({required this.connected, this.name});

  static const unavailable = PrinterStatus(connected: false);
}

class UsbDeviceInfo {
  final String name;
  final int vendorId;
  final int productId;
  final bool isPrinterClass;
  final bool hasBulkOut;
  final bool hasPermission;

  const UsbDeviceInfo({
    required this.name,
    required this.vendorId,
    required this.productId,
    required this.isPrinterClass,
    required this.hasBulkOut,
    required this.hasPermission,
  });

  /// Vendor:product ID as the hex pair printer docs usually quote them in.
  String get idHex =>
      '${vendorId.toRadixString(16).padLeft(4, '0')}:${productId.toRadixString(16).padLeft(4, '0')}';

  factory UsbDeviceInfo.fromMap(Map raw) {
    return UsbDeviceInfo(
      name: raw['name'] as String? ?? 'Unknown device',
      vendorId: raw['vendorId'] as int? ?? 0,
      productId: raw['productId'] as int? ?? 0,
      isPrinterClass: raw['isPrinterClass'] == true,
      hasBulkOut: raw['hasBulkOut'] == true,
      hasPermission: raw['hasPermission'] == true,
    );
  }
}

/// Talks to the 80mm receipt printer over USB, through [PosPrinterBridge] on
/// the Android side (see android/.../PosPrinterBridge.kt). The vendor SDK's
/// own USB connect path hardcodes a whitelist of vendor IDs that doesn't
/// include this printer, so the bridge talks to the USB device directly via
/// Android's UsbManager and only reuses the SDK's ESC/POS byte builders.
/// There is no printer support on web/desktop, so every call there just
/// fails with a plain "not available" result instead of throwing.
class PrinterService {
  static const _channel = MethodChannel('com.fortyup.kiosk/printer');

  Future<PrinterStatus> getStatus() async {
    try {
      final raw = await _channel.invokeMethod<Map>('printerStatus');
      if (raw == null) return PrinterStatus.unavailable;
      return PrinterStatus(connected: raw['connected'] == true, name: raw['name'] as String?);
    } catch (_) {
      return PrinterStatus.unavailable;
    }
  }

  /// Raw, unfiltered list of every USB device Android currently sees -
  /// independent of whether [connect] would accept any of them. Diagnostic
  /// only: lets "is USB detection working at all in this environment"
  /// (e.g. plugging in an unrelated phone as a sanity check) be answered
  /// directly instead of only ever seeing a connected/not-connected pill.
  Future<List<UsbDeviceInfo>> listDevices() async {
    try {
      final raw = await _channel.invokeMethod<Map>('listUsbDevices');
      final devices = (raw?['devices'] as List? ?? []);
      return devices.map((d) => UsbDeviceInfo.fromMap(d as Map)).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<PrinterResult> connect() async {
    try {
      final raw = await _channel.invokeMethod<Map>('connectUsb');
      return _toResult(raw);
    } catch (e) {
      return PrinterResult(ok: false, error: _describeException(e));
    }
  }

  Future<PrinterResult> printReceipt({required OrderSummary order, required String cafeName}) async {
    try {
      final raw = await _channel.invokeMethod<Map>('printReceipt', {
        'cafeName': cafeName,
        'orderNumber': order.orderNumber,
        'dateTime': _formatDateTime(order.createdAt),
        'items': [
          for (final item in order.items)
            {
              'qty': item.quantity,
              'name': item.itemName,
              'amount': _formatAmount(item.subtotalPaise),
            },
        ],
        'total': _formatAmount(order.totalPaise),
        'footer': 'Please collect your order from the counter.',
      });
      return _toResult(raw);
    } catch (e) {
      return PrinterResult(ok: false, error: _describeException(e));
    }
  }

  PrinterResult _toResult(Map? raw) {
    if (raw == null) return const PrinterResult(ok: false, error: 'No response from printer');
    return PrinterResult(ok: raw['ok'] == true, error: raw['error'] as String?);
  }

  /// Distinguishes "this platform has no printer bridge at all" from "the
  /// bridge exists but threw" - the previous version reported both as the
  /// same generic message, which hid real bugs in the native Kotlin code
  /// behind a misleading "not available on this device".
  String _describeException(Object e) {
    if (e is MissingPluginException) return 'Printing is not available on this device';
    if (e is PlatformException) return 'Printer error: ${e.message ?? e.code}';
    return 'Printer error: $e';
  }

  /// Plain "Rs." prefix, not the on-screen "₹" glyph - the printer's
  /// codepage is unknown, and a mis-rendered rupee sign is worse than none.
  String _formatAmount(int paise) => 'Rs.${(paise / 100).toStringAsFixed(2)}';

  String _formatDateTime(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final d = dt.day.toString().padLeft(2, '0');
      final m = dt.month.toString().padLeft(2, '0');
      final h = (dt.hour % 12 == 0 ? 12 : dt.hour % 12).toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$d/$m/${dt.year} $h:$min $period';
    } catch (_) {
      return '';
    }
  }
}
