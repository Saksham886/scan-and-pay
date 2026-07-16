import 'package:flutter/material.dart';

import '../../../models/menu_item.dart';

class CategoryTabs extends StatelessWidget {
  final List<MenuCategoryWithItems> categories;
  final String? selectedCategoryId;
  final ValueChanged<String?> onSelect;

  const CategoryTabs({
    super.key,
    required this.categories,
    required this.selectedCategoryId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        children: [
          _Chip(
            label: 'All',
            selected: selectedCategoryId == null,
            onTap: () => onSelect(null),
          ),
          for (final category in categories)
            _Chip(
              label: category.name,
              selected: selectedCategoryId == category.id,
              onTap: () => onSelect(category.id),
            ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _Chip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        labelStyle: const TextStyle(fontSize: 16),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    );
  }
}
