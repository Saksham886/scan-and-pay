class CartLineItem {
  final String menuItemId;
  final String name;
  final int pricePaise;
  final bool isVeg;
  final String? imageUrl;
  int quantity;

  CartLineItem({
    required this.menuItemId,
    required this.name,
    required this.pricePaise,
    required this.isVeg,
    this.imageUrl,
    this.quantity = 1,
  });

  int get subtotalPaise => pricePaise * quantity;
}
