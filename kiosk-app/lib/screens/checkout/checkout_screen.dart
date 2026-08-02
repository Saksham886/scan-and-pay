import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../models/cart_line_item.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../state/cart_provider.dart';
import '../../state/kiosk_config_provider.dart';
import '../../utils/currency.dart';
import '../../widgets/idle_reset_guard.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/veg_indicator.dart';
import '../menu/menu_screen.dart';
import '../order_status/order_status_screen.dart';
import '../payment/payment_webview_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

/// Kiosk orders are anonymous: name, phone and email were the bulk of the
/// time a customer spent at this screen, they were then retyped again on the
/// payment page, and nothing in the kiosk flow needs them â€” the order number
/// on screen and on the printed receipt is what the counter goes by.
class _CheckoutScreenState extends State<CheckoutScreen> {
  final _notesController = TextEditingController();
  final _orderService = OrderService();

  String? _submitError;
  bool _loading = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitError = null);

    final cart = context.read<CartProvider>();
    final cafeSlug = context.read<KioskConfigProvider>().cafeSlug;
    if (cafeSlug == null || cart.isEmpty) return;

    setState(() => _loading = true);

    final request = CreateOrderRequest(
      cafeSlug: cafeSlug,
      items:
          cart.items
              .map((i) => {'menuItemId': i.menuItemId, 'quantity': i.quantity})
              .toList(),
      notes:
          _notesController.text.trim().isEmpty
              ? null
              : _notesController.text.trim(),
      idempotencyKey: cart.getOrCreateIdempotencyKey(),
    );

    try {
      final result = await _orderService.createOrder(request);
      if (!mounted) return;

      if (!result.success || result.data == null) {
        if (result.statusCode == 422 || result.statusCode == 409) {
          cart.invalidateIdempotencyKey();
        }
        setState(() {
          _submitError = result.error ?? 'Failed to create order';
          _loading = false;
        });
        return;
      }

      final order = result.data!;
      setState(() => _loading = false);

      if (order.paymentRedirectUrl.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder:
                (_) => PaymentWebViewScreen(
                  paymentUrl: order.paymentRedirectUrl,
                  orderId: order.orderId,
                  cafeSlug: cafeSlug,
                ),
          ),
        );
      } else {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => OrderStatusScreen(orderId: order.orderId),
          ),
          (route) => route.isFirst,
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Network error. Please try again.';
        _loading = false;
      });
    }
  }

  void _resetToMenu() {
    if (!mounted || _loading) return;
    context.read<CartProvider>().clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MenuScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final cafeName = context.watch<KioskConfigProvider>().cafeName ?? '';

    return IdleResetGuard(
      timeout: kIdleResetTimeout,
      onIdle: _resetToMenu,
      child: Scaffold(
        backgroundColor: CustomerColors.background,
        body: SafeArea(
          child: Column(
            children: [
              _Header(cafeName: cafeName),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _OrderSummaryCard(
                      items: cart.items,
                      total: cart.totalPaise,
                    ),
                    const SizedBox(height: 16),
                    _SpecialInstructionsCard(notesController: _notesController),
                    if (_submitError != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: CustomerColors.danger.withValues(alpha: 0.1),
                          border: Border.all(
                            color: CustomerColors.danger.withValues(alpha: 0.4),
                            width: 2,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '!',
                              style: CustomerText.mono(
                                fontWeight: FontWeight.w700,
                                color: CustomerColors.danger,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _submitError!,
                                style: CustomerText.mono(
                                  fontSize: 13,
                                  color: CustomerColors.danger,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.verified_user_outlined,
                          size: 14,
                          color: CustomerColors.accent,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Secure payment',
                          style: CustomerText.mono(
                            fontSize: 12,
                            color: CustomerColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              _PayBar(
                loading: _loading,
                total: cart.totalPaise,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String cafeName;

  const _Header({required this.cafeName});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(
          bottom: BorderSide(color: CustomerColors.border, width: 2),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          InkWell(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: CustomerColors.border, width: 2),
              ),
              child: const Icon(
                Icons.arrow_back,
                size: 18,
                color: CustomerColors.muted,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('CHECKOUT', style: CustomerText.display(fontSize: 18)),
                if (cafeName.isNotEmpty)
                  Text(
                    cafeName,
                    style: CustomerText.mono(
                      fontSize: 12,
                      color: CustomerColors.muted,
                    ),
                  ),
              ],
            ),
          ),
          const Icon(
            Icons.verified_user_outlined,
            size: 16,
            color: CustomerColors.accent,
          ),
        ],
      ),
    );
  }
}

class _OrderSummaryCard extends StatelessWidget {
  final List<CartLineItem> items;
  final int total;

  const _OrderSummaryCard({required this.items, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CustomerColors.surface,
        border: Border.all(color: CustomerColors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: CustomerColors.surfaceHover,
              border: Border(
                bottom: BorderSide(color: CustomerColors.border, width: 2),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.receipt_long_outlined,
                  size: 15,
                  color: CustomerColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'ORDER SUMMARY',
                  style: CustomerText.mono(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                for (final item in items) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        VegIndicator(isVeg: item.isVeg, size: 14),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            item.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: CustomerText.mono(
                              fontSize: 13,
                              color: CustomerColors.muted,
                            ),
                          ),
                        ),
                        Text(
                          'x${item.quantity}',
                          style: CustomerText.mono(
                            fontSize: 13,
                            color: CustomerColors.muted,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          paiseToCurrencyShort(item.subtotalPaise),
                          style: CustomerText.mono(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                DottedDivider(),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'TOTAL',
                      style: CustomerText.mono(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      paiseToCurrencyShort(total),
                      style: CustomerText.display(
                        fontSize: 20,
                        color: CustomerColors.accent,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class DottedDivider extends StatelessWidget {
  const DottedDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(height: 2, color: CustomerColors.border);
  }
}

class _SpecialInstructionsCard extends StatelessWidget {
  final TextEditingController notesController;

  const _SpecialInstructionsCard({required this.notesController});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CustomerColors.surface,
        border: Border.all(color: CustomerColors.border, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: CustomerColors.surfaceHover,
              border: Border(
                bottom: BorderSide(color: CustomerColors.border, width: 2),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.edit_note,
                  size: 15,
                  color: CustomerColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'SPECIAL INSTRUCTIONS',
                  style: CustomerText.mono(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
                const Spacer(),
                Text(
                  'Optional',
                  style: CustomerText.mono(
                    fontSize: 11,
                    color: CustomerColors.muted,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                TextField(
                  controller: notesController,
                  maxLength: 500,
                  maxLines: 2,
                  style: CustomerText.mono(
                    fontSize: 13,
                    color: CustomerColors.foreground,
                  ),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: CustomerColors.background,
                    hintText: 'Any special requests...',
                    hintStyle: CustomerText.mono(
                      fontSize: 13,
                      color: CustomerColors.border,
                    ),
                    counterStyle: CustomerText.mono(
                      fontSize: 10,
                      color: CustomerColors.border,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    border: const OutlineInputBorder(
                      borderRadius: BorderRadius.zero,
                      borderSide: BorderSide(
                        color: CustomerColors.border,
                        width: 2,
                      ),
                    ),
                    enabledBorder: const OutlineInputBorder(
                      borderRadius: BorderRadius.zero,
                      borderSide: BorderSide(
                        color: CustomerColors.border,
                        width: 2,
                      ),
                    ),
                    focusedBorder: const OutlineInputBorder(
                      borderRadius: BorderRadius.zero,
                      borderSide: BorderSide(
                        color: CustomerColors.accent,
                        width: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PayBar extends StatelessWidget {
  final bool loading;
  final int total;
  final VoidCallback onPressed;

  const _PayBar({
    required this.loading,
    required this.total,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(top: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      padding: const EdgeInsets.all(16),
      child: PrimaryButton(
        label: 'Pay ${paiseToCurrencyShort(total)}',
        icon: Icons.arrow_forward,
        loading: loading,
        onPressed: onPressed,
      ),
    );
  }
}
