import React, { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, ExternalLink, Package, Printer, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { cancelOrder, loadOrder, loadOrderHistory, type OrderResponse } from '../../services/orderService';
import { formatDate, isSecureLink, money, PAYMENT_METHODS } from '../../lib/orderFormat';
import { OrderPrintSheet } from '../OrderPrintSheet';
import { AuthAlert } from './AuthUI';

/** How each order state reads to a customer; Processing is "being packed", not an internal step. */
const STATUS_TEXT: Record<string, { label: string; tone: 'waiting' | 'active' | 'done' | 'stopped'; message: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'waiting', message: "We've received your order and will confirm it once payment is arranged." },
  CONFIRMED: { label: 'Confirmed', tone: 'active', message: "Your order is confirmed and we're getting it ready." },
  PROCESSING: { label: 'Being packed', tone: 'active', message: "We're carefully packing your pieces." },
  SHIPPED: { label: 'On its way', tone: 'active', message: 'Your order has left us and is on its way to you.' },
  DELIVERED: { label: 'Delivered', tone: 'done', message: 'Your order has been delivered. We hope you love it.' },
  CANCELLED: { label: 'Cancelled', tone: 'stopped', message: 'This order was cancelled, and nothing more will happen with it.' },
};
const statusText = (status: string) => STATUS_TEXT[status] ?? { label: status, tone: 'waiting' as const, message: '' };

const PAYMENT_TEXT: Record<string, string> = { PENDING: 'Not paid yet', PAID: 'Paid', FAILED: 'Payment failed', REFUNDED: 'Refunded' };

/** The four steps a customer cares about, with the order states that complete each one. */
const STEPS = [
  { label: 'Placed', reachedBy: ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
  { label: 'Confirmed', reachedBy: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
  { label: 'Shipped', reachedBy: ['SHIPPED', 'DELIVERED'] },
  { label: 'Delivered', reachedBy: ['DELIVERED'] },
];

const pieceCount = (order: OrderResponse) => order.items?.reduce((total, item) => total + item.quantity, 0) ?? 0;
const pieces = (count: number) => `${count} ${count === 1 ? 'piece' : 'pieces'}`;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const { label, tone } = statusText(status);
  return <span className={`account-status account-status--${tone}`}>{label}</span>;
};

/** The signed-in customer's orders; choosing one opens its full details. */
export const AccountOrders: React.FC = () => {
  const { navigateTo, accountOrderNumber } = useShop();
  const [orders, setOrders] = useState<OrderResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Opening an order gives it its own address (/account/orders/SL-…), so the back button returns to the list.
  const showOrder = (orderNumber: string | null) =>
    navigateTo('account', { accountTab: 'orders', ...(orderNumber ? { orderNumber } : {}) });

  const load = useCallback(async () => {
    setError(null);
    try {
      setOrders(await loadOrderHistory());
    } catch (cause) {
      setError(errorMessage(cause, 'Your order history is temporarily unavailable.'));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadOrderHistory()
      .then((history) => { if (!cancelled) setOrders(history); })
      .catch((cause: unknown) => { if (!cancelled) setError(errorMessage(cause, 'Your order history is temporarily unavailable.')); });
    return () => { cancelled = true; };
  }, []);

  const replaceOrder = (updated: OrderResponse) =>
    setOrders((current) => current?.map((order) => order.id === updated.id ? updated : order) ?? current);

  const openOrder = orders?.find((order) => order.orderNumber === accountOrderNumber);
  if (openOrder) return <OrderDetails order={openOrder} onBack={() => showOrder(null)} onChange={replaceOrder} />;

  if (error && !orders) {
    return (
      <AuthAlert kind="error" actions={<button type="button" className="auth-link" onClick={() => void load()}>Try again</button>}>
        {error}
      </AuthAlert>
    );
  }
  if (!orders) return <p className="auth-loading"><span className="auth-spinner" aria-hidden="true" /> Loading your orders…</p>;

  if (orders.length === 0) {
    return (
      <div className="account-empty">
        <Package size={22} aria-hidden="true" />
        <p>You haven't placed an order yet. Orders you place while signed in will appear here, where you can follow them.</p>
        <button type="button" className="auth-link" onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}>
          Explore the collection
        </button>
      </div>
    );
  }

  return (
    <>
      {accountOrderNumber && (
        <AuthAlert kind="info">We couldn't find order {accountOrderNumber} among the orders in this account. Your recent orders are below.</AuthAlert>
      )}
      <ul className="account-order-list">
        {orders.map((order) => (
          <li key={order.id}>
            <button type="button" className="account-order" onClick={() => showOrder(order.orderNumber)}
              aria-label={`Order ${order.orderNumber}, ${statusText(order.status).label}. View details`}>
              <span className="account-order-main">
                <strong>{order.orderNumber}</strong>
                <span className="account-muted">
                  {formatDate(order.createdAt)} · {pieces(pieceCount(order))} · {money(order.totalAmount)}
                </span>
              </span>
              <StatusBadge status={order.status} />
              <ChevronRight size={16} className="account-order-chevron" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};

interface OrderDetailsProps {
  order: OrderResponse;
  onBack: () => void;
  onChange: (order: OrderResponse) => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onBack, onChange }) => {
  const { products, navigateTo, showToast } = useShop();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const stopPrinting = useCallback(() => setIsPrinting(false), []);

  // The list may be a few minutes old, so fetch the latest status (the shop may have shipped it).
  const showLatest = useEffectEvent((latest: OrderResponse) => onChange(latest));
  useEffect(() => {
    let cancelled = false;
    loadOrder(order.id).then((latest) => { if (!cancelled) showLatest(latest); }).catch(() => { /* keep showing the list's copy */ });
    return () => { cancelled = true; };
  }, [order.id]);

  const handleCancel = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      onChange(await cancelOrder(order.id));
      setConfirmingCancel(false);
      showToast('Your order has been cancelled.');
    } catch (cause) {
      setError(errorMessage(cause, 'We could not cancel this order. Please try again.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const { message } = statusText(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const reachedAt = (states: string[]) => order.statusHistory?.find((entry) => states.includes(entry.status))?.createdAt;
  const tracking = [order.trackingCarrier, order.trackingNumber].filter(Boolean);
  const hasTracking = tracking.length > 0 || isSecureLink(order.trackingUrl);
  const cityLine = [order.shippingCity, [order.shippingState, order.shippingPostalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const isOpen = !isCancelled && order.status !== 'DELIVERED';

  return (
    <article className="account-order-details" aria-labelledby="account-order-title">
      <button type="button" className="auth-link account-back" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" /> All orders
      </button>

      <header className="account-order-header">
        <div>
          <h3 id="account-order-title" className="account-subtitle">Order {order.orderNumber}</h3>
          <p className="account-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>
      {message && <p className="account-note">{message}</p>}

      {!isCancelled && (
        <ol className="account-tracker" aria-label="Order progress">
          {STEPS.map((step) => {
            const done = step.reachedBy.includes(order.status);
            const at = done ? reachedAt(step.reachedBy) : undefined;
            return (
              <li key={step.label} className={done ? 'is-done' : ''}>
                <span className="account-tracker-dot" aria-hidden="true">{done && <Check size={11} />}</span>
                <span className="account-tracker-label">{step.label}</span>
                <span className="account-tracker-date">{at ? formatDate(at) : done ? '' : 'Not yet'}</span>
                <span className="visually-hidden">{done ? 'done' : 'not yet'}</span>
              </li>
            );
          })}
        </ol>
      )}

      {hasTracking && (
        <div className="account-tracking">
          <p className="account-detail-label">Courier tracking</p>
          {order.trackingCarrier && <p>{order.trackingCarrier}</p>}
          {order.trackingNumber && <p>Tracking number: <strong className="account-copyable">{order.trackingNumber}</strong></p>}
          {isSecureLink(order.trackingUrl) && (
            <a className="auth-link" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
              Track your parcel <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      <h4 className="account-detail-label">Pieces</h4>
      <ul className="account-items">
        {order.items?.map((item, index) => {
          const product = item.productId ? products.find((candidate) => candidate.id === item.productId) : undefined;
          return (
            <li key={`${item.productId ?? 'item'}-${index}`} className="account-item">
              {product?.images[0] ? <img src={product.images[0]} alt="" className="account-item-image" /> : <span className="account-item-image" aria-hidden="true" />}
              <span className="account-item-text">
                {product ? (
                  <button type="button" className="account-item-name" onClick={() => navigateTo('product', { productId: product.id })}>{item.productName}</button>
                ) : <span className="account-item-name">{item.productName}</span>}
                <span className="account-muted">{item.quantity} × {money(item.unitPrice)}{item.productSku ? ` · ${item.productSku}` : ''}</span>
              </span>
              <span className="account-item-total">{money(item.lineTotal)}</span>
            </li>
          );
        })}
      </ul>
      <dl className="account-totals">
        {order.subtotal !== undefined && <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>}
        {order.shippingAmount !== undefined && <div><dt>Delivery</dt><dd>{Number(order.shippingAmount) === 0 ? 'Free' : money(order.shippingAmount)}</dd></div>}
        <div className="is-total"><dt>Total</dt><dd>{money(order.totalAmount)}</dd></div>
      </dl>

      <div className="account-order-columns">
        <div>
          <p className="account-detail-label">Delivering to</p>
          <p><strong>{order.shippingFullName}</strong></p>
          {order.shippingAddress && <p>{order.shippingAddress}</p>}
          {cityLine && <p>{cityLine}</p>}
          {order.shippingPhone && <p className="account-muted">{order.shippingPhone}</p>}
        </div>
        <div>
          <p className="account-detail-label">Payment</p>
          <p>{PAYMENT_METHODS[order.paymentMethod] ?? order.paymentMethod}</p>
          <p className="account-muted">{PAYMENT_TEXT[order.paymentStatus] ?? order.paymentStatus}</p>
        </div>
      </div>

      {error && <AuthAlert kind="error">{error}</AuthAlert>}

      {confirmingCancel ? (
        <div className="account-confirm" role="group" aria-labelledby="cancel-order-question">
          <p id="cancel-order-question"><strong>Cancel this order?</strong> The pieces go back on sale and this can't be undone.</p>
          <div className="account-name-actions">
            <button type="button" className="btn-primary account-danger-button" onClick={() => void handleCancel()} disabled={isCancelling}>
              {isCancelling && <span className="auth-spinner" aria-hidden="true" />}
              <span>{isCancelling ? 'Cancelling…' : 'Yes, Cancel Order'}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmingCancel(false)} disabled={isCancelling}>Keep Order</button>
          </div>
        </div>
      ) : (
        <div className="auth-actions account-order-actions">
          <button type="button" className="btn-secondary" onClick={() => setIsPrinting(true)}>
            <Printer size={15} aria-hidden="true" />
            <span>Download Summary</span>
          </button>
          {order.canCancel && (
            <button type="button" className="btn-secondary" onClick={() => { setError(null); setConfirmingCancel(true); }}>
              <X size={15} aria-hidden="true" />
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      )}

      {isOpen && !order.canCancel && (
        <p className="account-help">
          {order.paymentStatus === 'PAID' && order.status !== 'SHIPPED'
            ? 'To cancel a paid order, please contact us so we can arrange your refund.'
            : 'This order has shipped, so it can no longer be cancelled online.'}
        </p>
      )}
      <p className="account-help">
        Choose "Save as PDF" in the print window to keep a copy. Questions about this order?{' '}
        <button type="button" className="auth-link" onClick={() => navigateTo('contact', { orderNumber: order.orderNumber })}>Contact us</button>
      </p>

      {isPrinting && <OrderPrintSheet order={order} kind="summary" onDone={stopPrinting} />}
    </article>
  );
};
