import 'package:flutter/foundation.dart';

import '../services/kiosk_config_service.dart';

class KioskConfigProvider extends ChangeNotifier {
  final KioskConfigService _service;

  KioskConfigProvider({KioskConfigService? service})
      : _service = service ?? KioskConfigService();

  String? cafeSlug;
  String? cafeName;
  bool isLoaded = false;

  bool get isConfigured => cafeSlug != null && cafeSlug!.isNotEmpty;

  Future<void> load() async {
    cafeSlug = await _service.getCafeSlug();
    cafeName = await _service.getCafeName();
    isLoaded = true;
    notifyListeners();
  }

  Future<void> setCafe({required String slug, required String name}) async {
    await _service.saveCafe(slug: slug, name: name);
    cafeSlug = slug;
    cafeName = name;
    notifyListeners();
  }

  Future<void> reset() async {
    await _service.clear();
    cafeSlug = null;
    cafeName = null;
    notifyListeners();
  }
}
