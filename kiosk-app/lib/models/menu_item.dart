import 'cafe.dart';

class MenuItemPublic {
  final String id;
  final String name;
  final String? description;
  final int pricePaise;
  final String? imageUrl;
  final bool isAvailable;
  final bool isVeg;
  final String? categoryId;

  MenuItemPublic({
    required this.id,
    required this.name,
    this.description,
    required this.pricePaise,
    this.imageUrl,
    required this.isAvailable,
    required this.isVeg,
    this.categoryId,
  });

  factory MenuItemPublic.fromJson(Map<String, dynamic> json) {
    return MenuItemPublic(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      pricePaise: json['pricePaise'] as int,
      imageUrl: json['imageUrl'] as String?,
      isAvailable: json['isAvailable'] == true,
      isVeg: json['isVeg'] == true,
      categoryId: json['categoryId'] as String?,
    );
  }
}

class MenuCategoryWithItems {
  final String id;
  final String name;
  final int sortOrder;
  final List<MenuItemPublic> items;

  MenuCategoryWithItems({
    required this.id,
    required this.name,
    required this.sortOrder,
    required this.items,
  });

  factory MenuCategoryWithItems.fromJson(Map<String, dynamic> json) {
    return MenuCategoryWithItems(
      id: json['id'] as String,
      name: json['name'] as String,
      sortOrder: json['sortOrder'] as int,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => MenuItemPublic.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CafeMenu {
  final CafePublic cafe;
  final List<MenuCategoryWithItems> categories;

  CafeMenu({required this.cafe, required this.categories});

  factory CafeMenu.fromJson(Map<String, dynamic> json) {
    return CafeMenu(
      cafe: CafePublic.fromJson(json['cafe'] as Map<String, dynamic>),
      categories: (json['categories'] as List<dynamic>? ?? [])
          .map((e) => MenuCategoryWithItems.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
