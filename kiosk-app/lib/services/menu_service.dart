import '../models/cafe.dart';
import '../models/menu_item.dart';
import 'api_client.dart';

class MenuService {
  final ApiClient _client;

  MenuService({ApiClient? client}) : _client = client ?? ApiClient();

  Future<ApiResult<CafeMenu>> getMenu(String cafeSlug) {
    return _client.getJson(
      '/api/cafes/$cafeSlug/menu',
      (data) => CafeMenu.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Lightweight cafe + active-menu check, powers the kiosk welcome screen
  /// without fetching the full menu.
  Future<ApiResult<CafeMeta>> getCafeMeta(String cafeSlug) {
    return _client.getJson(
      '/api/cafes/$cafeSlug/meta',
      (data) => CafeMeta.fromJson(data as Map<String, dynamic>),
    );
  }
}
