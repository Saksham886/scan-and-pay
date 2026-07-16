import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/menu_item.dart';
import '../../../state/cart_provider.dart';
import '../../../widgets/price_text.dart';
import '../../../widgets/veg_indicator.dart';

class MenuItemCard extends StatelessWidget {
  final MenuItemPublic item;

  const MenuItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final inCart = cart.items.where((i) => i.menuItemId == item.id).toList();
    final quantity = inCart.isEmpty ? 0 : inCart.first.quantity;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.imageUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  item.imageUrl!,
                  width: 72,
                  height: 72,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholderIcon(),
                ),
              )
            else
              _placeholderIcon(),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      VegIndicator(isVeg: item.isVeg),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item.name,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  if (item.description != null && item.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      PriceText(
                        item.pricePaise,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      quantity == 0
                          ? FilledButton(
                              onPressed: () => cart.addItem(item),
                              child: const Text('Add'),
                            )
                          : _QuantityStepper(item: item, quantity: quantity, cart: cart),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholderIcon() {
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(Icons.restaurant, color: Colors.white38),
    );
  }
}

class _QuantityStepper extends StatelessWidget {
  final MenuItemPublic item;
  final int quantity;
  final CartProvider cart;

  const _QuantityStepper({
    required this.item,
    required this.quantity,
    required this.cart,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.filledTonal(
          onPressed: () => cart.updateQuantity(item.id, quantity - 1),
          icon: const Icon(Icons.remove),
        ),
        SizedBox(
          width: 32,
          child: Text(
            '$quantity',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        IconButton.filledTonal(
          onPressed: () => cart.addItem(item),
          icon: const Icon(Icons.add),
        ),
      ],
    );
  }
}
