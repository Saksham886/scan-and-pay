import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/customer_theme.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../services/printer_service.dart';
import '../../state/kiosk_config_provider.dart';
import '../../utils/currency.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/neo_pressable.dart';
import '../../widgets/primary_button.dart';
import '../feedback/feedback_screen.dart';

/// A kiosk receipt screen, not a live order tracker: it fetches the order
/// once and shows a receipt, then waits for the customer to tap Continue -
/// it does not poll for PREPARING/READY/COMPLETED the way a customer's own
/// phone would.
class OrderStatusScreen extends StatefulWidget {
  final String orderId;

  const OrderStatusScreen({super.key, required this.orderId});

  @override
  State<OrderStatusScreen> createState() => _OrderStatusScreenState();
}

class _OrderStatusScreenState extends State<OrderStatusScreen> {
  final _orderService = OrderService();
  OrderSummary? _order;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final result = await _orderService.getOrderStatus(widget.orderId);
      if (!mounted) return;

      if (result.success && result.data != null) {
        // Last line of defence: this screen is a receipt, and a receipt is a
        // claim on food. Whatever routing mistake got us here, never present
        // one for an order that hasn't actually been paid for.
        if (!result.data!.status.isPaidOrBeyond) {
          setState(() {
            _order = null;
            _error = 'This order has not been paid for yet.';
          });
          return;
        }
        setState(() {
          _order = result.data;
          _error = null;
        });
      } else {
        setState(() => _error = result.error ?? 'Could not load order status');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Network error loading order status');
    }
  }

  void _goToFeedback() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => FeedbackScreen(orderId: widget.orderId)),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: SafeArea(
        child: _order == null
            ? (_error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: CustomerText.mono(color: CustomerColors.danger),
                      ),
                    ),
                  )
                : const LoadingView(message: 'Loading order...'))
            : _Receipt(order: _order!, onContinue: _goToFeedback),
      ),
    );
  }
}

class _Receipt extends StatefulWidget {
  final OrderSummary order;
  final VoidCallback onContinue;

  const _Receipt({required this.order, required this.onContinue});

  @override
  State<_Receipt> createState() => _ReceiptState();
}

enum _PrintStatus { idle, printing, success, error }

class _ReceiptState extends State<_Receipt> {
  final _printerService = PrinterService();
  _PrintStatus _printStatus = _PrintStatus.idle;
  String? _printError;
  PrinterStatus _printerStatus = PrinterStatus.unavailable;

  @override
  void initState() {
    super.initState();
    _refreshPrinterStatus();
  }

  Future<void> _refreshPrinterStatus() async {
    final status = await _printerService.getStatus();
    if (!mounted) return;
    setState(() => _printerStatus = status);
  }

  /// Shows every USB device Android currently sees, unfiltered - the
  /// diagnostic view for "is anything being detected at all" (e.g. plugging
  /// in an unrelated phone as a sanity check), separate from whether the
  /// printer connect flow would accept any of them.
  Future<void> _showUsbDevices() async {
    final devices = await _printerService.listDevices();
    unawaited(_refreshPrinterStatus());
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('USB devices detected'),
        content: SizedBox(
          width: double.maxFinite,
          child: devices.isEmpty
              ? const Text(
                  'Android reports no USB device attached at all. Check the '
                  'physical cable/port - this is before the printer logic '
                  'even gets involved.',
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final d in devices)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(d.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('VID:PID = ${d.idHex}'),
                            Text('USB printer-class device: ${d.isPrinterClass ? "yes" : "no"}'),
                            Text('Has a bulk-OUT endpoint: ${d.hasBulkOut ? "yes" : "no"}'),
                            Text('App already has permission: ${d.hasPermission ? "yes" : "no"}'),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close')),
        ],
      ),
    );
  }

  Future<void> _handlePrint() async {
    setState(() {
      _printStatus = _PrintStatus.printing;
      _printError = null;
    });

    final cafeName = context.read<KioskConfigProvider>().cafeName ?? '';
    final connect = await _printerService.connect();
    if (!connect.ok) {
      if (!mounted) return;
      setState(() {
        _printStatus = _PrintStatus.error;
        _printError = connect.error ?? 'Could not connect to the printer';
      });
      unawaited(_refreshPrinterStatus());
      return;
    }

    final print = await _printerService.printReceipt(order: widget.order, cafeName: cafeName);
    if (!mounted) return;
    setState(() {
      _printStatus = print.ok ? _PrintStatus.success : _PrintStatus.error;
      _printError = print.ok ? null : (print.error ?? 'Failed to print receipt');
    });
    unawaited(_refreshPrinterStatus());
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final onContinue = widget.onContinue;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
      children: [
        Center(
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                alignment: Alignment.center,
                decoration: BoxDecoration(border: Border.all(color: CustomerColors.accent.withValues(alpha: 0.6), width: 2)),
                child: const Icon(Icons.check_circle_outline, size: 36, color: CustomerColors.accent),
              ),
              const SizedBox(height: 16),
              Text(
                'ORDER #${order.orderNumber}',
                textAlign: TextAlign.center,
                style: CustomerText.display(fontSize: 24),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 2)),
                child: Text('Order Confirmed', style: CustomerText.mono(fontSize: 13)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Container(
          decoration: BoxDecoration(color: CustomerColors.surface, border: Border.all(color: CustomerColors.border, width: 2)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: const BoxDecoration(
                  color: CustomerColors.surfaceHover,
                  border: Border(bottom: BorderSide(color: CustomerColors.border, width: 2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.receipt_long_outlined, size: 15, color: CustomerColors.primary),
                    const SizedBox(width: 8),
                    Text('RECEIPT', style: CustomerText.mono(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    for (final item in order.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.quantity}x ${item.itemName}',
                                style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
                              ),
                            ),
                            Text(
                              paiseToCurrencyShort(item.subtotalPaise),
                              style: CustomerText.mono(fontSize: 13, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 10),
                    Container(height: 2, color: CustomerColors.border),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('TOTAL PAID', style: CustomerText.mono(fontWeight: FontWeight.w700)),
                        Text(
                          paiseToCurrencyShort(order.totalPaise),
                          style: CustomerText.display(fontSize: 18, color: CustomerColors.accent),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 2)),
          child: Column(
            children: [
              Text(
                'Please note your order number.',
                textAlign: TextAlign.center,
                style: CustomerText.mono(fontSize: 13, color: CustomerColors.foreground),
              ),
              const SizedBox(height: 4),
              Text(
                "We'll call it out when it's ready for pickup at the counter.",
                textAlign: TextAlign.center,
                style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Center(child: _PrinterStatusPill(status: _printerStatus, onTap: _showUsbDevices)),
        const SizedBox(height: 12),
        _PrintReceiptButton(
          status: _printStatus,
          error: _printError,
          onPressed: _handlePrint,
        ),
        const SizedBox(height: 20),
        PrimaryButton(label: 'Continue', onPressed: onContinue),
      ],
    );
  }
}

class _PrinterStatusPill extends StatelessWidget {
  final PrinterStatus status;
  final VoidCallback onTap;

  const _PrinterStatusPill({required this.status, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = status.connected ? CustomerColors.accent : CustomerColors.danger;
    final label = status.connected
        ? 'Printer: ${status.name ?? "USB printer"} — Connected'
        : 'Printer: Not Connected (tap for USB devices)';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          border: Border.all(color: color, width: 2),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(status.connected ? Icons.print_outlined : Icons.print_disabled_outlined, size: 14, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: CustomerText.mono(fontSize: 11, fontWeight: FontWeight.w700, color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PrintReceiptButton extends StatelessWidget {
  final _PrintStatus status;
  final String? error;
  final VoidCallback onPressed;

  const _PrintReceiptButton({required this.status, required this.error, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final printing = status == _PrintStatus.printing;
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: NeoPressable(
            onTap: printing ? null : onPressed,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: CustomerColors.surface,
                border: Border.all(color: CustomerColors.black, width: 2),
                borderRadius: BorderRadius.circular(999),
              ),
              child: printing
                  ? const SizedBox(
                      height: 18,
                      child: Center(
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: CustomerColors.foreground),
                        ),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'PRINT RECEIPT'.toUpperCase(),
                          style: CustomerText.mono(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 1),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.print_outlined, size: 18, color: CustomerColors.foreground),
                      ],
                    ),
            ),
          ),
        ),
        if (status == _PrintStatus.success) ...[
          const SizedBox(height: 8),
          Text('Receipt sent to printer', style: CustomerText.mono(fontSize: 12, color: CustomerColors.accent)),
        ] else if (status == _PrintStatus.error && error != null) ...[
          const SizedBox(height: 8),
          Text(error!, textAlign: TextAlign.center, style: CustomerText.mono(fontSize: 12, color: CustomerColors.danger)),
        ],
      ],
    );
  }
}
