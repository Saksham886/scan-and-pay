import 'package:flutter/material.dart';

import '../config/customer_theme.dart';

class VegIndicator extends StatelessWidget {
  final bool isVeg;
  final double size;

  const VegIndicator({super.key, required this.isVeg, this.size = 18});

  @override
  Widget build(BuildContext context) {
    final color = isVeg ? CustomerColors.vegGreen : CustomerColors.nonVegRed;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(border: Border.all(color: color, width: 1.5)),
      child: Container(
        width: size / 2,
        height: size / 2,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
    );
  }
}
