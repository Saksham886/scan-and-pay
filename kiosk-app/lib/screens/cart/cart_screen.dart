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
import '../../widgets/neo_pressable.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/veg_indicator.dart';
import '../menu/menu_screen.dart';
import '../order_status/order_status_screen.dart';
import '../payment/payment_webview_screen.dart';
import '../payment/qr_payment_screen.dart';

/// Single review-and-pay screen.
///
/// Cart review, the optional kitchen note, and payment used to be split across
/// a Cart screen and a separate Checkout screen that re-summarised the very
/// same items. On an office kiosk where the customer just wants to pay and go,
/// that second confirmation was pure friction. This folds both into one:
/// review → (optionally) add a note → Pay. The order-creation, idempotent
/// replay handling and payment routing are the same logic the Checkout screen
/// ran, relocated here so the menu goes straight to this screen.
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _notesController = TextEditingController();
  final _orderService = OrderService();

  String? _submitError;
  bool _loading = false;
  bool _showNotes = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _resetToMenu() {
    if (_loading) return;
    context.read<CartProvider>().clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MenuScreen()),
      (route) => false,
    );
  }

  /// [isRetry] guards the single automatic re-submit below, so a server that
  /// keeps replaying stale orders can't put this into a loop.
  Future<void> _submit({bool isRetry = false}) async {
    setState(() => _submitError = null);

    final cart = context.read<CartProvider>();
    final cafeSlug = context.read<KioskConfigProvider>().cafeSlug;
    if (cafeSlug == null || cart.isEmpty) return;

    setState(() => _loading = true);

    final request = CreateOrderRequest(
      cafeSlug: cafeSlug,
      items: cart.items
          .map((i) => {'menuItemId': i.menuItemId, 'quantity': i.quantity})
          .toList(),
      notes: _notesController.text.trim().isEmpty
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

      final qrUrl = order.paymentQrImageUrl;
      final txn = order.merchantTxnId;
      if (qrUrl != null && qrUrl.isNotEmpty && txn != null && txn.isNotEmpty) {
        // Native single-QR flow (server flag RAZORPAY_USE_QR): render the QR
        // ourselves instead of opening Razorpay Standard Checkout in a WebView.
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => QrPaymentScreen(
              orderId: order.orderId,
              cafeSlug: cafeSlug,
              merchantTxnId: txn,
              qrImageUrl: qrUrl,
              amountPaise: order.totalPaise,
              orderNumber: order.orderNumber,
            ),
          ),
        );
      } else if (order.paymentRedirectUrl.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => PaymentWebViewScreen(
              paymentUrl: order.paymentRedirectUrl,
              orderId: order.orderId,
              cafeSlug: cafeSlug,
            ),
          ),
        );
      } else if (order.status?.isPaidOrBeyond == true) {
        // Genuinely nothing to collect - a fully subsidised order, already PAID.
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => OrderStatusScreen(orderId: order.orderId),
          ),
          (route) => route.isFirst,
        );
      } else {
        // No redirect URL / QR and not paid means the server replayed an
        // existing unpaid order against this cart's idempotency key - what
        // happens when a customer backs out of payment and tries again.
        // Dropping the key and re-submitting creates a fresh, payable order.
        cart.invalidateIdempotencyKey();
        if (!isRetry) {
          return _submit(isRetry: true);
        }
        setState(() {
          _submitError = 'That payment did not complete. Please try again.';
          _loading = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Network error. Please try again.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return IdleResetGuard(
      timeout: kIdleResetTimeout,
      onIdle: _resetToMenu,
      child: Scaffold(
        backgroundColor: CustomerColors.background,
        body: SafeArea(
          child: Column(
            children: [
              _Header(
                itemCount: cart.items.length,
                onClear: cart.isEmpty || _loading ? null : cart.clear,
              ),
              Container(
                height: 2,
                color: CustomerColors.border,
                margin: const EdgeInsets.symmetric(horizontal: 20),
              ),
              Expanded(
                child: cart.isEmpty
                    ? const _EmptyCart()
                    : ListView(
                        padding: const EdgeInsets.all(20),
                        children: [
                          for (var i = 0; i < cart.items.length; i++) ...[
                            if (i > 0) const SizedBox(height: 12),
                            _CartRow(item: cart.items[i], cart: cart),
                          ],
                          const SizedBox(height: 16),
                          _NotesSection(
                            controller: _notesController,
                            expanded: _showNotes,
                            onToggle: () =>
                                setState(() => _showNotes = !_showNotes),
                          ),
                          if (_submitError != null) ...[
                            const SizedBox(height: 16),
                            _ErrorBox(message: _submitError!),
                          ],
                        ],
                      ),
              ),
              if (!cart.isEmpty)
                _Footer(
                  total: cart.totalPaise,
                  loading: _loading,
                  onPay: _submit,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int itemCount;
  final VoidCallback? onClear;

  const _Header({required this.itemCount, required this.onClear});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Row(
        children: [
          _SquareIconButton(
            icon: Icons.arrow_back,
            onTap: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 12),
          Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: CustomerColors.primary, width: 2),
            ),
            child: const Icon(
              Icons.shopping_bag_outlined,
              size: 16,
              color: CustomerColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('YOUR CART', style: CustomerText.display(fontSize: 18)),
                Text(
                  '$itemCount ${itemCount == 1 ? "item" : "items"}',
                  style: CustomerText.mono(
                    fontSize: 12,
                    color: CustomerColors.muted,
                  ),
                ),
              ],
            ),
          ),
          if (onClear != null)
            NeoPressable(
              onTap: onClear,
              travel: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: CustomerColors.danger.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  'CLEAR',
                  style: CustomerText.mono(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: CustomerColors.danger,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SquareIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _SquareIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return NeoPressable(
      onTap: onTap,
      travel: 0,
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: CustomerColors.border, width: 2),
        ),
        child: Icon(icon, size: 18, color: CustomerColors.muted),
      ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80,
            height: 80,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: CustomerColors.border, width: 2),
            ),
            child: const Icon(
              Icons.shopping_bag_outlined,
              size: 32,
              color: CustomerColors.border,
            ),
          ),
          const SizedBox(height: 16),
          Text('CART IS EMPTY', style: CustomerText.display(fontSize: 16)),
          const SizedBox(height: 4),
          Text(
            'Add items from the menu to get started',
            style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
          ),
        ],
      ),
    );
  }
}

class _CartRow extends StatelessWidget {
  final CartLineItem item;
  final CartProvider cart;

  const _CartRow({required this.item, required this.cart});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: CustomerColors.surface,
        border: Border.all(color: CustomerColors.border, width: 2),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    VegIndicator(isVeg: item.isVeg, size: 14),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        item.name.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: CustomerText.display(
                          fontSize: 14,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Padding(
                  padding: const EdgeInsets.only(left: 20),
                  child: Text(
                    '${paiseToCurrencyShort(item.pricePaise)} each',
                    style: CustomerText.mono(
                      fontSize: 11,
                      color: CustomerColors.muted,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            decoration: BoxDecoration(
              color: CustomerColors.background,
              border: Border.all(color: CustomerColors.border, width: 2),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _StepIcon(
                  icon:
                      item.quantity == 1 ? Icons.delete_outline : Icons.remove,
                  danger: item.quantity == 1,
                  onTap: () => item.quantity == 1
                      ? cart.removeItem(item.menuItemId)
                      : cart.updateQuantity(
                          item.menuItemId,
                          item.quantity - 1,
                        ),
                ),
                Container(
                  width: 32,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    border: Border.symmetric(
                      vertical: BorderSide(
                        color: CustomerColors.border,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Text(
                    '${item.quantity}',
                    style: CustomerText.mono(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _StepIcon(
                  icon: Icons.add,
                  danger: false,
                  onTap: () => cart.updateQuantity(
                    item.menuItemId,
                    item.quantity + 1,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 64,
            child: Text(
              paiseToCurrencyShort(item.subtotalPaise),
              textAlign: TextAlign.right,
              style: CustomerText.mono(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: CustomerColors.accent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepIcon extends StatelessWidget {
  final IconData icon;
  final bool danger;
  final VoidCallback onTap;

  const _StepIcon({
    required this.icon,
    required this.danger,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        width: 44,
        height: 44,
        child: Icon(
          icon,
          size: 15,
          color: danger ? CustomerColors.danger : CustomerColors.muted,
        ),
      ),
    );
  }
}

/// Collapsed by default so it costs a hurried customer nothing; taps open into
/// the same instructions field the old Checkout screen carried.
class _NotesSection extends StatelessWidget {
  final TextEditingController controller;
  final bool expanded;
  final VoidCallback onToggle;

  const _NotesSection({
    required this.controller,
    required this.expanded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    if (!expanded) {
      return NeoPressable(
        onTap: onToggle,
        travel: 0,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: CustomerColors.border, width: 2),
          ),
          child: Row(
            children: [
              const Icon(Icons.add, size: 15, color: CustomerColors.primary),
              const SizedBox(width: 8),
              Text(
                'ADD A NOTE FOR THE KITCHEN',
                style: CustomerText.mono(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                  color: CustomerColors.muted,
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
      );
    }

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
                InkWell(
                  onTap: onToggle,
                  child: const Icon(
                    Icons.close,
                    size: 16,
                    color: CustomerColors.muted,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: TextField(
              controller: controller,
              maxLength: 500,
              maxLines: 2,
              autofocus: true,
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
                  borderSide: BorderSide(color: CustomerColors.border, width: 2),
                ),
                enabledBorder: const OutlineInputBorder(
                  borderRadius: BorderRadius.zero,
                  borderSide: BorderSide(color: CustomerColors.border, width: 2),
                ),
                focusedBorder: const OutlineInputBorder(
                  borderRadius: BorderRadius.zero,
                  borderSide: BorderSide(color: CustomerColors.accent, width: 2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  final String message;

  const _ErrorBox({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
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
              message,
              style: CustomerText.mono(
                fontSize: 13,
                color: CustomerColors.danger,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  final int total;
  final bool loading;
  final VoidCallback onPay;

  const _Footer({
    required this.total,
    required this.loading,
    required this.onPay,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(top: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'TOTAL AMOUNT',
                style: CustomerText.mono(
                  fontSize: 13,
                  letterSpacing: 1,
                  color: CustomerColors.muted,
                ),
              ),
              Text(
                paiseToCurrencyShort(total),
                style: CustomerText.display(
                  fontSize: 24,
                  color: CustomerColors.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.verified_user_outlined,
                size: 13,
                color: CustomerColors.accent,
              ),
              const SizedBox(width: 6),
              Text(
                'Secure payment',
                style: CustomerText.mono(
                  fontSize: 11,
                  color: CustomerColors.muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            label: 'Pay ${paiseToCurrencyShort(total)}',
            icon: Icons.arrow_forward,
            loading: loading,
            onPressed: onPay,
          ),
        ],
      ),
    );
  }
}
