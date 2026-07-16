import 'package:flutter/material.dart';

import '../config/customer_theme.dart';
import '../utils/currency.dart';

class PriceText extends StatelessWidget {
  final int paise;
  final TextStyle? style;
  final bool short;

  const PriceText(this.paise, {super.key, this.style, this.short = true});

  @override
  Widget build(BuildContext context) {
    final text = short ? paiseToCurrencyShort(paise) : paiseToCurrency(paise);
    return Text(text, style: style ?? CustomerText.mono(fontWeight: FontWeight.w700));
  }
}
