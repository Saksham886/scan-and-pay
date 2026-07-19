import 'package:flutter/material.dart';

import '../../../config/customer_theme.dart';

/// Full-height left-rail category list, so every category is visible at a
/// glance on a big kiosk display instead of hiding most of them behind a
/// horizontally-scrolling tab strip.
class CategorySidebar extends StatelessWidget {
  final List<({String id, String name, int count})> categories;
  final String selectedCategoryId;
  final ValueChanged<String> onSelect;

  const CategorySidebar({
    super.key,
    required this.categories,
    required this.selectedCategoryId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 168,
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(right: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      child: SafeArea(
        right: false,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            for (final category in categories)
              _SidebarItem(
                label: category.name,
                count: category.count,
                selected: category.id == selectedCategoryId,
                onTap: () => onSelect(category.id),
              ),
          ],
        ),
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  const _SidebarItem({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? CustomerColors.accent : Colors.transparent,
          border: Border.all(color: selected ? CustomerColors.black : Colors.transparent, width: 2),
          boxShadow: selected ? neoShadow(offset: neoShadowSmOffset) : null,
        ),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 16,
              color: selected ? CustomerColors.black : CustomerColors.border,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label.toUpperCase(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: CustomerText.mono(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  height: 1.25,
                  color: selected ? CustomerColors.black : CustomerColors.muted,
                ),
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Text(
                '$count',
                style: CustomerText.mono(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: selected ? CustomerColors.black.withValues(alpha: 0.6) : CustomerColors.border,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
