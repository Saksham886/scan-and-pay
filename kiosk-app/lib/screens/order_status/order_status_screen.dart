import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/price_text.dart';
import '../../widgets/primary_button.dart';
import '../menu/menu_screen.dart';

class OrderStatusScreen extends StatefulWidget {
  final String orderId;

  const OrderStatusScreen({super.key, required this.orderId});

  @override
  State<OrderStatusScreen> createState() => _OrderStatusScreenState();
}

class _OrderStatusScreenState extends State<OrderStatusScreen> {
  final _orderService = OrderService();
  Timer? _pollTimer;
  Timer? _resetTimer;
  OrderSummary? _order;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
    _pollTimer = Timer.periodic(kOrderStatusPollInterval, (_) => _fetch());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _resetTimer?.cancel();
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
        if (result.data!.status.isTerminal) {
          _pollTimer?.cancel();
          _scheduleReset();
        }
      } else if (!result.isTransientError) {
        setState(() => _error = result.error ?? 'Could not load order status');
      }
    } catch (_) {
      // Transient network hiccup - the next 5s poll tick retries automatically.
    }
  }

  void _scheduleReset() {
    _resetTimer?.cancel();
    _resetTimer = Timer(kOrderStatusAutoReset, _backToMenu);
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
      appBar: AppBar(
        title: const Text('Order Status'),
        automaticallyImplyLeading: false,
      ),
      body: _order == null
          ? (_error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.redAccent)))
              : const LoadingView(message: 'Loading order...'))
          : _buildOrder(_order!),
    );
  }

  Widget _buildOrder(OrderSummary order) {
    final status = order.status;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Order #${order.orderNumber}',
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          _StatusBadge(status: status),
          const SizedBox(height: 24),
          Expanded(
            child: Card(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  for (final item in order.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text('${item.itemName} x${item.quantity}')),
                          PriceText(item.subtotalPaise),
                        ],
                      ),
                    ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                      PriceText(
                        order.totalPaise,
                        short: false,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (status.isTerminal)
            PrimaryButton(label: 'New Order', onPressed: _backToMenu),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final OrderStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = switch (status) {
      OrderStatus.created || OrderStatus.paymentPending => (
          'Processing',
          Colors.grey,
          Icons.hourglass_top,
        ),
      OrderStatus.paid => ('Paid', Colors.blue, Icons.check_circle_outline),
      OrderStatus.preparing => ('Preparing', Colors.orange, Icons.restaurant),
      OrderStatus.ready => ('Ready for Pickup', Colors.green, Icons.done_all),
      OrderStatus.completed => ('Completed', Colors.green, Icons.check_circle),
      OrderStatus.cancelled => ('Cancelled', Colors.redAccent, Icons.cancel),
      OrderStatus.failed => ('Failed', Colors.redAccent, Icons.error),
    };

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
