import 'package:shared_preferences/shared_preferences.dart';

import '../config/constants.dart';

class KioskConfigService {
  Future<String?> getCafeSlug() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(kCafeSlugPrefKey);
  }

  Future<String?> getCafeName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(kCafeNamePrefKey);
  }

  Future<void> saveCafe({required String slug, required String name}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kCafeSlugPrefKey, slug);
    await prefs.setString(kCafeNamePrefKey, name);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(kCafeSlugPrefKey);
    await prefs.remove(kCafeNamePrefKey);
  }
}
