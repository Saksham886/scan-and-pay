import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../models/cart_line_item.dart';
import '../../state/cart_provider.dart';
import '../../utils/currency.dart';
import '../../widgets/idle_reset_guard.dart';
import '../../widgets/neo_pressable.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/veg_indicator.dart';
import '../checkout/checkout_screen.dart';
import '../menu/menu_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  void _resetToMenu(BuildContext context) {
    context.read<CartProvider>().clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MenuScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return IdleResetGuard(
      timeout: kIdleResetTimeout,
      onIdle: () => _resetToMenu(context),
      child: Scaffold(
        backgroundColor: CustomerColors.background,
        body: SafeArea(
          child: Column(
            children: [
              _Header(
                itemCount: cart.items.length,
                onClear: cart.isEmpty ? null : cart.clear,
              ),
              Container(
                height: 2,
                color: CustomerColors.border,
                margin: const EdgeInsets.symmetric(horizontal: 20),
              ),
              Expanded(
                child:
                    cart.isEmpty
                        ? const _EmptyCart()
                        : ListView.separated(
                          padding: const EdgeInsets.all(20),
                          itemCount: cart.items.length,
                          separatorBuilder:
                              (_, __) => const SizedBox(height: 12),
                          itemBuilder:
                              (context, index) =>
                                  _CartRow(item: cart.items[index], cart: cart),
                        ),
              ),
              if (!cart.isEmpty) _Footer(total: cart.totalPaise),
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
                  onTap:
                      () =>
                          item.quantity == 1
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
                  onTap:
                      () => cart.updateQuantity(
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

class _Footer extends StatelessWidget {
  final int total;

  const _Footer({required this.total});

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
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Proceed to Checkout',
            icon: Icons.arrow_forward,
            onPressed:
                () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                ),
          ),
        ],
      ),
    );
  }
}
