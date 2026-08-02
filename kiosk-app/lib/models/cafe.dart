class CafePublic {
  final String id;
  final String name;
  final String slug;
  final String? address;
  final String? phone;
  final String? imageUrl;
  final String? openingTime;
  final String? closingTime;

  CafePublic({
    required this.id,
    required this.name,
    required this.slug,
    this.address,
    this.phone,
    this.imageUrl,
    this.openingTime,
    this.closingTime,
  });

  factory CafePublic.fromJson(Map<String, dynamic> json) {
    return CafePublic(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      imageUrl: json['imageUrl'] as String?,
      openingTime: json['openingTime'] as String?,
      closingTime: json['closingTime'] as String?,
    );
  }
}

class ActiveMenuMeta {
  final String id;
  final String type;
  final bool isSubsidised;

  ActiveMenuMeta({
    required this.id,
    required this.type,
    required this.isSubsidised,
  });

  factory ActiveMenuMeta.fromJson(Map<String, dynamic> json) {
    return ActiveMenuMeta(
      id: json['id'] as String,
      type: json['type'] as String,
      isSubsidised: json['isSubsidised'] == true,
    );
  }
}

class CafeMeta {
  final CafePublic cafe;
  final ActiveMenuMeta? activeMenu;

  CafeMeta({required this.cafe, this.activeMenu});

  factory CafeMeta.fromJson(Map<String, dynamic> json) {
    return CafeMeta(
      cafe: CafePublic.fromJson(json['cafe'] as Map<String, dynamic>),
      activeMenu: json['activeMenu'] == null
          ? null
          : ActiveMenuMeta.fromJson(json['activeMenu'] as Map<String, dynamic>),
    );
  }
}
