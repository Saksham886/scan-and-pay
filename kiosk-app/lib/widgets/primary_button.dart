import 'package:flutter/material.dart';

import '../config/customer_theme.dart';
import 'neo_pressable.dart';

/// Matches the lime pill CTA used for "Pay", "Proceed to Checkout", etc.
/// across the customer web app (bg-[#cdf200] border-2 border-black rounded-full neo-shadow).
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = loading || onPressed == null;
    return SizedBox(
      width: double.infinity,
      child: NeoPressable(
        onTap: disabled ? null : onPressed,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: disabled ? const Color(0xFF333345) : CustomerColors.accent,
            border: Border.all(color: CustomerColors.black, width: 2),
            borderRadius: BorderRadius.circular(999),
            boxShadow: disabled ? null : neoShadow(),
          ),
          child: loading
              ? SizedBox(
                  height: 20,
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: CustomerColors.black,
                      ),
                    ),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label.toUpperCase(),
                      style: CustomerText.mono(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: disabled ? CustomerColors.muted : CustomerColors.black,
                        letterSpacing: 1,
                      ),
                    ),
                    if (icon != null) ...[
                      const SizedBox(width: 8),
                      Icon(
                        icon,
                        size: 18,
                        color: disabled ? CustomerColors.muted : CustomerColors.black,
                      ),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}
