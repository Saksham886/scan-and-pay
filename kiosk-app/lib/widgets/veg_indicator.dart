import 'package:flutter/material.dart';

class VegIndicator extends StatelessWidget {
  final bool isVeg;

  const VegIndicator({super.key, required this.isVeg});

  @override
  Widget build(BuildContext context) {
    final color = isVeg ? Colors.green : Colors.red;
    return Container(
      width: 16,
      height: 16,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 1.5),
        borderRadius: BorderRadius.circular(2),
      ),
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
    );
  }
}
