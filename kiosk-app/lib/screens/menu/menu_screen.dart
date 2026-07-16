import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/customer_theme.dart';
import '../../models/menu_item.dart';
import '../../state/cart_provider.dart';
import '../../state/kiosk_config_provider.dart';
import '../../state/menu_provider.dart';
import '../../utils/format.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';
import '../cart/cart_screen.dart';
import '../setup/setup_screen.dart';
import 'widgets/category_sidebar.dart';
import 'widgets/floating_cart_button.dart';
import 'widgets/menu_item_card.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _activeCategory = 'all';
  String _searchQuery = '';
  final _searchController = TextEditingController();
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
    _searchController.dispose();
    super.dispose();
  }

  void _startHold() {
    _holdTimer = Timer(const Duration(seconds: 3), () {
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SetupScreen()));
    });
  }

  void _cancelHold() => _holdTimer?.cancel();

  @override
  Widget build(BuildContext context) {
    final menu = context.watch<MenuProvider>();
    final cart = context.watch<CartProvider>();
    final cafeName = menu.cafe?.name ?? context.watch<KioskConfigProvider>().cafeName ?? 'Menu';

    final visibleCategories = menu.categories.where((c) => c.items.isNotEmpty).toList();
    final isSearching = _searchQuery.trim().isNotEmpty;

    final filteredCategories = isSearching
        ? <MenuCategoryWithItems>[]
        : (_activeCategory == 'all'
            ? visibleCategories
            : visibleCategories.where((c) => c.id == _activeCategory).toList());

    final searchResults = isSearching
        ? visibleCategories.expand((c) => c.items).where((item) {
            final q = _searchQuery.trim().toLowerCase();
            return item.name.toLowerCase().contains(q) ||
                (item.description?.toLowerCase().contains(q) ?? false);
          }).toList()
        : <MenuItemPublic>[];

    final showMenu = !(menu.isLoading && menu.categories.isEmpty) && menu.error == null;

    return Scaffold(
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showMenu)
            CategorySidebar(
              categories: [
                (id: 'all', name: 'All', count: 0),
                for (final c in visibleCategories)
                  (id: c.id, name: toTitleCase(c.name), count: c.items.length),
              ],
              selectedCategoryId: _activeCategory,
              onSelect: (id) => setState(() {
                _activeCategory = id;
                if (_searchQuery.isNotEmpty) {
                  _searchQuery = '';
                  _searchController.clear();
                }
              }),
            ),
          Expanded(
            child: Stack(
              children: [
                if (menu.isLoading && menu.categories.isEmpty)
                  const LoadingView(message: 'Loading menu...')
                else if (menu.error != null && menu.categories.isEmpty)
                  ErrorView(message: menu.error!, onRetry: menu.refresh)
                else
                  CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: _Hero(cafeName: cafeName, onHold: _startHold, onHoldCancel: _cancelHold),
                      ),
                      SliverToBoxAdapter(
                        child: _SearchBar(
                          controller: _searchController,
                          onChanged: (v) => setState(() => _searchQuery = v),
                        ),
                      ),
                      if (isSearching)
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                          sliver: searchResults.isEmpty
                              ? SliverToBoxAdapter(child: _NoResults(query: _searchQuery))
                              : SliverList.list(
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 12),
                                      child: Text(
                                        '${searchResults.length} ${searchResults.length == 1 ? "result" : "results"} for "$_searchQuery"',
                                        style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
                                      ),
                                    ),
                                    _ItemsGrid(items: searchResults),
                                  ],
                                ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
                          sliver: SliverList.list(
                            children: [
                              for (final category in filteredCategories)
                                if (category.items.isNotEmpty) ...[
                                  _CategoryHeading(name: toTitleCase(category.name), count: category.items.length),
                                  const SizedBox(height: 12),
                                  _ItemsGrid(items: category.items),
                                  const SizedBox(height: 16),
                                ],
                            ],
                          ),
                        ),
                    ],
                  ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 16,
                  child: SafeArea(
                    top: false,
                    child: FloatingCartButton(
                      totalItems: cart.itemCount,
                      totalPaise: cart.totalPaise,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CartScreen()),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  final String cafeName;
  final VoidCallback onHold;
  final VoidCallback onHoldCancel;

  const _Hero({required this.cafeName, required this.onHold, required this.onHoldCancel});

  @override
  Widget build(BuildContext context) {
    final cafe = context.select<MenuProvider, dynamic>((m) => m.cafe);

    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(
          bottom: BorderSide(color: CustomerColors.primary, width: 2),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(color: CustomerColors.accent, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'NOW SERVING',
                    style: CustomerText.mono(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 2,
                      color: CustomerColors.accent.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTapDown: (_) => onHold(),
                onTapUp: (_) => onHoldCancel(),
                onTapCancel: onHoldCancel,
                child: Text(
                  cafeName.toUpperCase(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: CustomerText.display(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -1),
                ),
              ),
              if (cafe?.address != null || (cafe?.openingTime != null && cafe?.closingTime != null)) ...[
                const SizedBox(height: 10),
                if (cafe?.address != null)
                  _HeroDetail(icon: Icons.place_outlined, text: cafe.address as String),
                if (cafe?.openingTime != null && cafe?.closingTime != null) ...[
                  const SizedBox(height: 4),
                  _HeroDetail(
                    icon: Icons.access_time,
                    text: '${cafe.openingTime} – ${cafe.closingTime}',
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroDetail extends StatelessWidget {
  final IconData icon;
  final String text;

  const _HeroDetail({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 13, color: CustomerColors.primary),
        ),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
          ),
        ),
      ],
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchBar({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: CustomerColors.headerBackground,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Container(
        decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 2)),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          style: CustomerText.mono(fontSize: 14, color: CustomerColors.foreground),
          decoration: InputDecoration(
            filled: true,
            fillColor: CustomerColors.surface,
            hintText: 'Search the menu...',
            hintStyle: CustomerText.mono(fontSize: 14, color: CustomerColors.border),
            prefixIcon: const Icon(Icons.search, size: 18, color: CustomerColors.muted),
            suffixIcon: controller.text.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.close, size: 16, color: CustomerColors.muted),
                    onPressed: () {
                      controller.clear();
                      onChanged('');
                    },
                  ),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ),
    );
  }
}

class _CategoryHeading extends StatelessWidget {
  final String name;
  final int count;

  const _CategoryHeading({required this.name, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          name.toUpperCase(),
          style: CustomerText.display(fontSize: 16, letterSpacing: -0.3),
        ),
        const SizedBox(width: 10),
        Expanded(child: Container(height: 2, color: CustomerColors.border)),
        const SizedBox(width: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 1)),
          child: Text('$count', style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted)),
        ),
      ],
    );
  }
}

/// Single column on narrow (phone) panes; a 2-column grid once the content
/// pane is wide enough (kiosk tablets) that a single column would waste
/// most of the horizontal space.
class _ItemsGrid extends StatelessWidget {
  final List<MenuItemPublic> items;

  const _ItemsGrid({required this.items});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 16.0;
        final columns = constraints.maxWidth >= 560 ? 2 : 1;
        if (columns == 1) {
          return Column(
            children: [for (final item in items) MenuItemCard(item: item)],
          );
        }
        final cardWidth = (constraints.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          children: [
            for (final item in items) SizedBox(width: cardWidth, child: MenuItemCard(item: item)),
          ],
        );
      },
    );
  }
}

class _NoResults extends StatelessWidget {
  final String query;

  const _NoResults({required this.query});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            alignment: Alignment.center,
            decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 2)),
            child: const Icon(Icons.search_off, size: 24, color: CustomerColors.border),
          ),
          const SizedBox(height: 16),
          Text('No dishes found', style: CustomerText.display(fontSize: 16)),
          const SizedBox(height: 4),
          Text('Try a different search', style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted)),
        ],
      ),
    );
  }
}
