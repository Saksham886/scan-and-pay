import 'package:flutter/material.dart';

import '../../../config/customer_theme.dart';
import '../../../utils/currency.dart';
import '../../../widgets/neo_pressable.dart';

/// Matches floating-cart-button.tsx: fixed lime pill bar above the safe area.
class FloatingCartButton extends StatelessWidget {
  final int totalItems;
  final int totalPaise;
  final VoidCallback onTap;

  const FloatingCartButton({
    super.key,
    required this.totalItems,
    required this.totalPaise,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (totalItems == 0) return const SizedBox.shrink();

    return NeoPressable(
      onTap: onTap,
      travel: 4,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: CustomerColors.accent,
          border: Border.all(color: CustomerColors.black, width: 2),
          borderRadius: BorderRadius.circular(999),
          boxShadow: neoShadow(),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.shopping_bag_outlined, color: CustomerColors.black, size: 22),
                    Positioned(
                      top: -8,
                      right: -8,
                      child: Container(
                        width: 20,
                        height: 20,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: CustomerColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(color: CustomerColors.black, width: 2),
                        ),
                        child: Text(
                          '$totalItems',
                          style: CustomerText.mono(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$totalItems ${totalItems == 1 ? "item" : "items"} added'.toUpperCase(),
                      style: CustomerText.mono(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: CustomerColors.black,
                      ),
                    ),
                    Text(
                      'Tap to view cart',
                      style: CustomerText.mono(
                        fontSize: 10,
                        color: CustomerColors.black.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Row(
              children: [
                Text(
                  paiseToCurrencyShort(totalPaise),
                  style: CustomerText.mono(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: CustomerColors.black,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: CustomerColors.black.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_forward, size: 16, color: CustomerColors.black),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
