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
}
