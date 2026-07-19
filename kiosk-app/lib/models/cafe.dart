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
