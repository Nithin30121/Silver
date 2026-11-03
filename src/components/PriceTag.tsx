import React from 'react';
import { discountPercent } from '../lib/pricing';

const rupees = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

/**
 * A product's price. With a discount, the original price sits crossed out above it with the % off.
 * Screen readers hear "was" and "now", since a line through text isn't read out.
 */
export const PriceTag: React.FC<{ price: number; originalPrice?: number; size?: 'card' | 'page' | 'modal' }> = ({ price, originalPrice, size = 'card' }) => {
  const percent = discountPercent(price, originalPrice);
  return (
    <div className={`price-tag is-${size}`}>
      {percent !== null && originalPrice !== undefined && (
        <span className="price-tag-was">
          <span className="visually-hidden">Was </span>
          <s>{rupees(originalPrice)}</s>
          <span className="price-tag-off">{percent}% off</span>
        </span>
      )}
      <span className="price-tag-now">
        {percent !== null && <span className="visually-hidden">Now </span>}
        {rupees(price)}
      </span>
    </div>
  );
};
