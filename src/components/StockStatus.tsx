import React from 'react';
import { CircleCheck, CircleSlash, Hourglass } from 'lucide-react';

/** Below this many pieces, the page says how many are left. */
export const FEW_LEFT = 3;

/** A piece's stock in words: out of stock, only a few left, or in stock. */
export const StockStatus: React.FC<{ quantity: number }> = ({ quantity }) => {
  if (quantity <= 0) {
    return (
      <div className="stock-status is-out" role="status">
        <CircleSlash size={16} aria-hidden="true" />
        <div>
          <strong>Out of stock</strong>
          <span>This piece has sold out. Save it to your wishlist and check back soon.</span>
        </div>
      </div>
    );
  }
  if (quantity <= FEW_LEFT) {
    return (
      <div className="stock-status is-low" role="status">
        <Hourglass size={16} aria-hidden="true" />
        <div><strong>Only {quantity} left</strong></div>
      </div>
    );
  }
  return (
    <div className="stock-status is-in" role="status">
      <CircleCheck size={16} aria-hidden="true" />
      <div><strong>In stock</strong></div>
    </div>
  );
};
