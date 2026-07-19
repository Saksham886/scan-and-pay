import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../config/customer_theme.dart';
import '../../../models/menu_item.dart';
import '../../../state/cart_provider.dart';
import '../../../utils/format.dart';
import '../../../widgets/neo_pressable.dart';
import '../../../widgets/price_text.dart';
import '../../../widgets/veg_indicator.dart';

class MenuItemCard extends StatelessWidget {
  final MenuItemPublic item;

  const MenuItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final inCartItem = cart.items.where((i) => i.menuItemId == item.id).toList();
    final quantity = inCartItem.isEmpty ? 0 : inCartItem.first.quantity;
    final inCart = quantity > 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: CustomerColors.primary.withValues(alpha: 0.06),
        border: Border.all(
          color: inCart ? CustomerColors.accent : CustomerColors.border,
          width: 2,
        ),
        boxShadow: inCart ? neoShadow(offset: neoShadowSmOffset) : neoShadow(),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    VegIndicator(isVeg: item.isVeg, size: 18),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        toTitleCase(item.name).toUpperCase(),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: CustomerText.display(fontSize: 15, letterSpacing: -0.3, height: 1.15),
                      ),
                    ),
                    if (inCart) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: CustomerColors.accent,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check, size: 10, color: CustomerColors.black),
                            const SizedBox(width: 2),
                            Text(
                              '$quantity',
                              style: CustomerText.mono(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: CustomerColors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                if (item.description != null && item.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted, height: 1.4),
                  ),
                ],
                const SizedBox(height: 8),
                PriceText(
                  item.pricePaise,
                  style: CustomerText.mono(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: inCart ? CustomerColors.accent : CustomerColors.foreground,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          _ImageAndControls(item: item, quantity: quantity, cart: cart),
        ],
      ),
    );
  }
}

class _ImageAndControls extends StatelessWidget {
  final MenuItemPublic item;
  final int quantity;
  final CartProvider cart;

  const _ImageAndControls({required this.item, required this.quantity, required this.cart});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 88,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.topCenter,
        children: [
          Container(
            width: 88,
            height: 80,
            clipBehavior: Clip.hardEdge,
            decoration: BoxDecoration(
              border: Border.all(color: CustomerColors.border, width: 2),
              color: CustomerColors.surface,
            ),
            child: item.imageUrl != null
                ? Image.network(
                    item.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _placeholder(),
                  )
                : _placeholder(),
          ),
          Positioned(
            bottom: -14,
            child: quantity == 0
                ? _AddPill(onTap: () => cart.addItem(item))
                : _QuantityStepper(item: item, quantity: quantity, cart: cart),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Center(
      child: Text(item.isVeg ? '\u{1F96C}' : '\u{1F357}', style: const TextStyle(fontSize: 28)),
    );
  }
}

class _AddPill extends StatelessWidget {
  final VoidCallback onTap;

  const _AddPill({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return NeoPressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: CustomerColors.accent,
          border: Border.all(color: CustomerColors.black, width: 2),
          borderRadius: BorderRadius.circular(999),
          boxShadow: neoShadow(offset: neoShadowSmOffset),
        ),
        child: Text(
          'ADD',
          style: CustomerText.mono(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: CustomerColors.black,
            letterSpacing: 1,
          ),
        ),
      ),
    );
  }
}

class _QuantityStepper extends StatelessWidget {
  final MenuItemPublic item;
  final int quantity;
  final CartProvider cart;

  const _QuantityStepper({required this.item, required this.quantity, required this.cart});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CustomerColors.accent,
        border: Border.all(color: CustomerColors.black, width: 2),
        borderRadius: BorderRadius.circular(999),
        boxShadow: neoShadow(offset: neoShadowSmOffset),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepperButton(
            icon: Icons.remove,
            onTap: () => quantity == 1
                ? cart.removeItem(item.id)
                : cart.updateQuantity(item.id, quantity - 1),
          ),
          SizedBox(
            width: 26,
            child: Text(
              '$quantity',
              textAlign: TextAlign.center,
              style: CustomerText.mono(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: CustomerColors.black,
              ),
            ),
          ),
          _StepperButton(
            icon: Icons.add,
            onTap: () => cart.updateQuantity(item.id, quantity + 1),
          ),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _StepperButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      customBorder: const CircleBorder(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Icon(icon, size: 15, color: CustomerColors.black),
      ),
    );
  }
}
