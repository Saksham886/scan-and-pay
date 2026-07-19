import 'dart:async';

import 'package:flutter/foundation.dart';

import '../config/constants.dart';
import '../models/cafe.dart';
import '../models/menu_item.dart';
import '../services/menu_service.dart';

class MenuProvider extends ChangeNotifier {
  final MenuService _service;
  Timer? _refreshTimer;
  String? _cafeSlug;

  MenuProvider({MenuService? service}) : _service = service ?? MenuService();

  CafePublic? cafe;
  List<MenuCategoryWithItems> categories = [];
  bool isLoading = false;
  String? error;

  Future<void> load(String cafeSlug) async {
    _cafeSlug = cafeSlug;
    isLoading = true;
    error = null;
    notifyListeners();
    await _fetch();
    _startAutoRefresh();
  }

  Future<void> refresh() => _fetch();

  Future<void> _fetch() async {
    if (_cafeSlug == null) return;
    try {
      final result = await _service.getMenu(_cafeSlug!);
      if (result.success && result.data != null) {
        cafe = result.data!.cafe;
        categories = result.data!.categories;
        error = null;
      } else {
        error = result.error ?? 'Failed to load menu';
      }
    } catch (_) {
      error = 'Network error loading menu';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void _startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(kMenuRefreshInterval, (_) => _fetch());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
