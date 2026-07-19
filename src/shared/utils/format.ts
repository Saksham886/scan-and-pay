const LOWER_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor",
  "of", "on", "or", "the", "to", "vs", "with",
]);

export function toTitleCase(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word, index, arr) => {
      return word
        .split("-")
        .map((part, partIdx) => {
          const isFirstOverall = index === 0 && partIdx === 0;
          const isLastOverall = index === arr.length - 1 && partIdx === word.split("-").length - 1;
          if (!isFirstOverall && !isLastOverall && LOWER_WORDS.has(part)) {
            return part;
          }
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("-");
    })
    .join(" ");
}
