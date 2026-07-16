import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../utils/currency.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/primary_button.dart';
import '../menu/menu_screen.dart';

/// A kiosk receipt screen, not a live order tracker: on a shared kiosk the
/// device has to free up for the next customer immediately after payment,
/// so this fetches the order once, shows a receipt, and auto-resets to the
/// menu shortly after - it does not poll for PREPARING/READY/COMPLETED the
/// way a customer's own phone would.
class OrderStatusScreen extends StatefulWidget {
  final String orderId;

  const OrderStatusScreen({super.key, required this.orderId});

  @override
  State<OrderStatusScreen> createState() => _OrderStatusScreenState();
}

class _OrderStatusScreenState extends State<OrderStatusScreen> {
  final _orderService = OrderService();
  Timer? _resetTimer;
  Timer? _countdownTimer;
  OrderSummary? _order;
  String? _error;
  int _countdown = kReceiptAutoReset.inSeconds;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final result = await _orderService.getOrderStatus(widget.orderId);
      if (!mounted) return;

      if (result.success && result.data != null) {
        setState(() {
          _order = result.data;
          _error = null;
        });
        _scheduleReset();
      } else {
        setState(() => _error = result.error ?? 'Could not load order status');
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Network error loading order status');
    }
  }

  void _scheduleReset() {
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    _countdown = kReceiptAutoReset.inSeconds;
    _resetTimer = Timer(kReceiptAutoReset, _backToMenu);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _countdown <= 1) {
        timer.cancel();
        return;
      }
      setState(() => _countdown -= 1);
    });
  }

  void _backToMenu() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MenuScreen()),
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
            : _Receipt(order: _order!, countdown: _countdown, onNewOrder: _backToMenu),
      ),
    );
  }
}

class _Receipt extends StatelessWidget {
  final OrderSummary order;
  final int countdown;
  final VoidCallback onNewOrder;

  const _Receipt({required this.order, required this.countdown, required this.onNewOrder});

  @override
  Widget build(BuildContext context) {
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
        const SizedBox(height: 28),
        PrimaryButton(label: 'New Order', onPressed: onNewOrder),
        const SizedBox(height: 12),
        Text(
          'Returning to menu in ${countdown}s',
          textAlign: TextAlign.center,
          style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
        ),
      ],
    );
  }
}
