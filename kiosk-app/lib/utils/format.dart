const _lowerWords = {
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor',
  'of', 'on', 'or', 'the', 'to', 'vs', 'with',
};

String toTitleCase(String raw) {
  final trimmed = raw.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (trimmed.isEmpty) return trimmed;

  final words = trimmed.toLowerCase().split(' ');
  final result = <String>[];

  for (var index = 0; index < words.length; index++) {
    final parts = words[index].split('-');
    final capitalizedParts = <String>[];
    for (var partIdx = 0; partIdx < parts.length; partIdx++) {
      final part = parts[partIdx];
      final isFirstOverall = index == 0 && partIdx == 0;
      final isLastOverall = index == words.length - 1 && partIdx == parts.length - 1;
      if (!isFirstOverall && !isLastOverall && _lowerWords.contains(part)) {
        capitalizedParts.add(part);
      } else if (part.isEmpty) {
        capitalizedParts.add(part);
      } else {
        capitalizedParts.add(part[0].toUpperCase() + part.substring(1));
      }
    }
    result.add(capitalizedParts.join('-'));
  }

  return result.join(' ');
}
