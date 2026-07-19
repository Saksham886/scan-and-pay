import 'package:flutter/material.dart';

import '../config/customer_theme.dart';

class LoadingView extends StatelessWidget {
  final String? message;

  const LoadingView({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: CustomerColors.border, width: 4),
            ),
            child: const CircularProgressIndicator(
              strokeWidth: 4,
              color: CustomerColors.primary,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message!,
              style: CustomerText.mono(fontSize: 14, color: CustomerColors.muted),
            ),
          ],
        ],
      ),
    );
  }
}
