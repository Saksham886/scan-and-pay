String paiseToCurrency(int paise) {
  return '₹${(paise / 100).toStringAsFixed(2)}';
}

String paiseToCurrencyShort(int paise) {
  final rupees = paise / 100;
  if (rupees == rupees.floorToDouble()) {
    return '₹${rupees.floor()}';
  }
  return '₹${rupees.toStringAsFixed(2)}';
}
