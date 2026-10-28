// Fake Store prices are USD. Currency becomes config once the real product source is chosen.
const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(amount: number): string {
  return priceFormat.format(amount);
}

/** "men's clothing" → "Men's clothing" */
export function formatCategoryName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
