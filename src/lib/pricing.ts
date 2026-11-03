/**
 * The whole-number percentage a product is reduced by, or null when there is no discount. Rounded down,
 * so the shop never claims more off than the customer actually saves.
 */
export function discountPercent(price: number, originalPrice?: number | null): number | null {
  if (originalPrice == null || !(originalPrice > price) || price < 0) return null;
  // The tiny allowance stops float error turning an exact 20% (2000 of 2500) into 19.999… and so 19.
  const percent = Math.floor(((originalPrice - price) / originalPrice) * 100 + 1e-9);
  return percent >= 1 ? percent : null;
}
