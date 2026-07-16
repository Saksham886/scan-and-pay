import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/menu_item.dart';
import '../../state/cart_provider.dart';
import '../../state/kiosk_config_provider.dart';
import '../../state/menu_provider.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/price_text.dart';
import '../cart/cart_screen.dart';
import '../setup/setup_screen.dart';
import 'widgets/category_tabs.dart';
import 'widgets/menu_item_card.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String? _selectedCategoryId;
  Timer? _holdTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final slug = context.read<KioskConfigProvider>().cafeSlug;
      if (slug != null) {
        context.read<MenuProvider>().load(slug);
      }
    });
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    super.dispose();
  }

  void _startHold() {
    _holdTimer = Timer(const Duration(seconds: 3), () {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SetupScreen()),
      );
    });
  }

  void _cancelHold() {
    _holdTimer?.cancel();
  }

  @override
  Widget build(BuildContext context) {
    final menu = context.watch<MenuProvider>();
    final cart = context.watch<CartProvider>();
    final cafeName = context.watch<KioskConfigProvider>().cafeName ?? 'Menu';

    final categories = menu.categories
        .where((c) => _selectedCategoryId == null || c.id == _selectedCategoryId)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTapDown: (_) => _startHold(),
          onTapUp: (_) => _cancelHold(),
          onTapCancel: _cancelHold,
          child: Text(cafeName),
        ),
      ),
      body: Column(
        children: [
          if (menu.categories.isNotEmpty)
            CategoryTabs(
              categories: menu.categories,
              selectedCategoryId: _selectedCategoryId,
              onSelect: (id) => setState(() => _selectedCategoryId = id),
            ),
          Expanded(child: _buildBody(menu, categories)),
        ],
      ),
      bottomNavigationBar: cart.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CartScreen()),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('View Cart (${cart.itemCount})'),
                        const SizedBox(width: 10),
                        const Text('·'),
                        const SizedBox(width: 10),
                        PriceText(cart.totalPaise),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildBody(MenuProvider menu, List<MenuCategoryWithItems> categories) {
    if (menu.isLoading && menu.categories.isEmpty) {
      return const LoadingView(message: 'Loading menu...');
    }
    if (menu.error != null && menu.categories.isEmpty) {
      return ErrorView(message: menu.error!, onRetry: menu.refresh);
    }
    if (categories.every((c) => c.items.isEmpty)) {
      return const Center(child: Text('No items available right now.'));
    }
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        for (final category in categories)
          if (category.items.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: Text(
                category.name,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
            for (final item in category.items) MenuItemCard(item: item),
          ],
      ],
    );
  }
}
