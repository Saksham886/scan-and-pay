export function paiseToCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function paiseToCurrencyShort(paise: number): string {
  const rupees = paise / 100;
  if (rupees === Math.floor(rupees)) {
    return `₹${rupees}`;
  }
  return `₹${rupees.toFixed(2)}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
