import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../models/cart_line_item.dart';
import '../models/menu_item.dart';

class CartProvider extends ChangeNotifier {
  final List<CartLineItem> _items = [];
  String? _idempotencyKey;
  static const _uuid = Uuid();

  List<CartLineItem> get items => List.unmodifiable(_items);
  bool get isEmpty => _items.isEmpty;
  int get itemCount => _items.fold(0, (sum, i) => sum + i.quantity);
  int get totalPaise => _items.fold(0, (sum, i) => sum + i.subtotalPaise);

  void addItem(MenuItemPublic item) {
    final idx = _items.indexWhere((i) => i.menuItemId == item.id);
    if (idx != -1) {
      _items[idx].quantity += 1;
    } else {
      _items.add(CartLineItem(
        menuItemId: item.id,
        name: item.name,
        pricePaise: item.pricePaise,
        isVeg: item.isVeg,
        imageUrl: item.imageUrl,
      ));
    }
    _idempotencyKey = null;
    notifyListeners();
  }

  void updateQuantity(String menuItemId, int quantity) {
    final idx = _items.indexWhere((i) => i.menuItemId == menuItemId);
    if (idx == -1) return;
    if (quantity <= 0) {
      _items.removeAt(idx);
    } else {
      _items[idx].quantity = quantity;
    }
    _idempotencyKey = null;
    notifyListeners();
  }

  void removeItem(String menuItemId) {
    _items.removeWhere((i) => i.menuItemId == menuItemId);
    _idempotencyKey = null;
    notifyListeners();
  }

  void clear() {
    _items.clear();
    _idempotencyKey = null;
    notifyListeners();
  }

  /// Reused across retries of the same checkout attempt (WebView back-out,
  /// "Retry Payment"); only reset when the cart contents actually change.
  String getOrCreateIdempotencyKey() {
    return _idempotencyKey ??= _uuid.v4();
  }

  /// Called when the server rejects an order outright (422/409) so a
  /// subsequent retry gets a fresh key instead of repeating a bad request.
  void invalidateIdempotencyKey() {
    _idempotencyKey = null;
  }
}
