import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { OrderResponse } from '../services/orderService';
import { formatDate, humanize, money, PAYMENT_METHODS } from '../lib/orderFormat';
import '../styles/print.css';

export type OrderPrintKind = 'slip' | 'summary';

/**
 * A printable order page drawn outside the app; print styles hide everything else while it exists,
 * and the browser's print dialog can save it as a PDF. React escapes every value, so customer-typed
 * text can't become markup on the printed page. A packing slip leaves out prices.
 */
export const OrderPrintSheet: React.FC<{ order: OrderResponse; kind: OrderPrintKind; onDone: () => void }> = ({ order, kind, onDone }) => {
  useEffect(() => {
    window.addEventListener('afterprint', onDone);
    // Wait a frame so the sheet is on the page before the print dialog takes its snapshot.
    const frame = window.requestAnimationFrame(() => window.print());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', onDone);
    };
  }, [onDone]);
  const isSlip = kind === 'slip';
  const cityLine = [order.shippingCity, [order.shippingState, order.shippingPostalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const tracking = [order.trackingCarrier, order.trackingNumber].filter(Boolean).join(' · ');
  return createPortal(
    <div className="print-sheet">
      <header className="print-sheet-header">
        <div>
          <p className="print-sheet-brand">SILVORA</p>
          <h1>{isSlip ? 'Packing slip' : 'Order summary'}</h1>
        </div>
        <dl>
          <div><dt>Order</dt><dd>{order.orderNumber}</dd></div>
          <div><dt>Placed</dt><dd>{formatDate(order.createdAt)}</dd></div>
          {!isSlip && <div><dt>Payment</dt><dd>{PAYMENT_METHODS[order.paymentMethod] ?? order.paymentMethod} · {humanize(order.paymentStatus)}</dd></div>}
          {!isSlip && <div><dt>Status</dt><dd>{humanize(order.status)}</dd></div>}
        </dl>
      </header>
      <section className="print-sheet-address">
        <h2>Ship to</h2>
        <p><strong>{order.shippingFullName}</strong></p>
        {order.shippingAddress && <p>{order.shippingAddress}</p>}
        {cityLine && <p>{cityLine}</p>}
        {order.shippingPhone && <p>{order.shippingPhone}</p>}
        {!isSlip && order.shippingEmail && <p>{order.shippingEmail}</p>}
        {tracking && <p className="print-sheet-tracking">Courier: {tracking}</p>}
      </section>
      <table>
        <thead>
          <tr>
            <th>Item</th><th>SKU</th><th className="is-right">Qty</th>
            {isSlip ? <th className="is-right">Packed</th> : <><th className="is-right">Price</th><th className="is-right">Total</th></>}
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, index) => (
            <tr key={`${item.productId ?? 'item'}-${index}`}>
              <td>{item.productName}</td>
              <td>{item.productSku || '—'}</td>
              <td className="is-right">{item.quantity}</td>
              {isSlip ? <td className="is-right"><span className="print-sheet-box" /></td>
                : <><td className="is-right">{money(item.unitPrice)}</td><td className="is-right">{money(item.lineTotal)}</td></>}
            </tr>
          ))}
        </tbody>
        {!isSlip && (
          <tfoot>
            {order.subtotal !== undefined && <tr><td colSpan={4}>Subtotal</td><td className="is-right">{money(order.subtotal)}</td></tr>}
            {order.shippingAmount !== undefined && (
              <tr><td colSpan={4}>Shipping</td><td className="is-right">{Number(order.shippingAmount) === 0 ? 'Free' : money(order.shippingAmount)}</td></tr>
            )}
            <tr className="is-total"><td colSpan={4}>Total</td><td className="is-right">{money(order.totalAmount)}</td></tr>
          </tfoot>
        )}
      </table>
      <p className="print-sheet-note">
        {isSlip ? 'Thank you for shopping with SILVORA.' : 'This order summary is not a GST tax invoice.'}
      </p>
    </div>,
    document.body
  );
};
