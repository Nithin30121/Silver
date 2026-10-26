import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, type PaymentMethod } from '../services/orderService';
import { X, Minus, Plus, Trash2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    cartCount,
    cartSubtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    navigateTo,
    showToast
  } = useShop();
  const { status, user } = useAuth();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'confirmation'>('cart');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    paymentMethod: 'upi'
  });
  const [orderId, setOrderId] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedSubtotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(cartSubtotal);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'authenticated' || !user) {
      closeDrawer();
      navigateTo('login');
      showToast('Please sign in before placing an order.');
      return;
    }
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const order = await createOrder({
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        paymentMethod: formData.paymentMethod.toUpperCase() as PaymentMethod,
        shippingFullName: formData.fullName,
        shippingEmail: formData.email,
        shippingPhone: formData.phone,
        shippingAddress: formData.address,
        shippingCity: formData.city,
        shippingState: formData.state,
        shippingPostalCode: formData.pincode,
      });
      setOrderId(order.orderNumber);
      setCheckoutStep('confirmation');
      clearCart();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'We could not create your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDrawer = () => {
    setIsCartOpen(false);
    setTimeout(() => setCheckoutStep('cart'), 400);
  };

  return (
    <div className={`drawer-backdrop ${isCartOpen ? 'open' : ''}`} onClick={closeDrawer}>
      <aside
        className={`drawer-panel ${isCartOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Shopping Bag Drawer"
      >
        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">
            {checkoutStep === 'cart' && `Shopping Bag (${cartCount})`}
            {checkoutStep === 'shipping' && 'Secure Checkout'}
            {checkoutStep === 'confirmation' && 'Order Request Recorded'}
          </h2>
          <button onClick={closeDrawer} aria-label="Close drawer" style={{ color: 'var(--color-soft-ivory)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-body">
          {checkoutStep === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <span className="eyebrow">YOUR BAG IS EMPTY</span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-soft-ivory)' }}>
                    No ornaments in your bag yet.
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-grey)', marginBottom: '2rem' }}>
                    Explore our certified 925 sterling silver archive to discover considered pieces.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      closeDrawer();
                      navigateTo('collection');
                    }}
                  >
                    Explore Collection
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Complimentary Shipping Progress */}
                  <div style={{ padding: '0.85rem', backgroundColor: '#14100E', fontSize: '0.75rem', textAlign: 'center', border: '1px solid rgba(184, 121, 81, 0.25)', color: 'var(--color-champagne)' }}>
                    <span>✨ Complimentary Insured Express Delivery unlocked!</span>
                  </div>

                  {/* Cart Item Rows */}
                  {cart.map((item, idx) => {
                    const itemTotal = new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(item.product.price * item.quantity);

                    return (
                      <div
                        key={`${item.product.id}-${item.selectedSize}-${idx}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr auto',
                          gap: '1rem',
                          paddingBottom: '1.25rem',
                          borderBottom: '1px solid rgba(184, 121, 81, 0.2)'
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: '80px',
                            height: '100px',
                            backgroundColor: '#100D0B',
                            border: '1px solid rgba(184, 121, 81, 0.2)',
                            overflow: 'hidden',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            closeDrawer();
                            navigateTo('product', { productId: item.product.id });
                          }}
                        >
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        {/* Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4
                              style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', cursor: 'pointer', color: 'var(--color-soft-ivory)' }}
                              onClick={() => {
                                closeDrawer();
                                navigateTo('product', { productId: item.product.id });
                              }}
                            >
                              {item.product.name}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-grey)' }}>
                              Size: {item.selectedSize}
                            </span>
                          </div>

                          {/* Quantity Adjuster */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#100D0B' }}>
                              <button
                                style={{ padding: '4px 8px', color: 'var(--color-soft-ivory)' }}
                                onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={12} />
                              </button>
                              <span style={{ fontSize: '0.75rem', padding: '0 6px', fontWeight: 600, color: 'var(--color-soft-ivory)' }}>
                                {item.quantity}
                              </span>
                              <button
                                style={{ padding: '4px 8px', color: 'var(--color-soft-ivory)' }}
                                onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <button
                              style={{ color: 'var(--color-muted-grey)' }}
                              onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Line Total */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-champagne)' }}>{itemTotal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Shipping Details Form */}
          {checkoutStep === 'shipping' && (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="eyebrow" style={{ margin: 0 }}>SHIPPING DESTINATION</span>
                <button
                  type="button"
                  className="btn-text"
                  style={{ fontSize: '0.7rem' }}
                  onClick={() => setCheckoutStep('cart')}
                >
                  Back to Bag
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Mehta"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              {checkoutError && (
                <p role="alert" style={{ margin: 0, color: '#f4a2a2', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  {checkoutError}
                </p>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Apartment, suite, unit, building, street"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', color: 'var(--color-soft-ivory)' }}>PIN Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 400001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid rgba(184, 121, 81, 0.3)', backgroundColor: '#14100E', color: 'var(--color-soft-ivory)', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginTop: '0.5rem' }}>
                <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>SELECT PAYMENT METHOD</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'upi', label: 'UPI (Instant Google Pay / PhonePe / Paytm)' },
                    { id: 'card', label: 'Credit / Debit Card (Visa, Mastercard, RuPay)' },
                    { id: 'cod', label: 'Cash on Delivery (Verified PIN)' }
                  ].map((method) => (
                    <label
                      key={method.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.65rem 0.85rem',
                        border: formData.paymentMethod === method.id ? '1px solid var(--color-metallic-copper)' : '1px solid rgba(184, 121, 81, 0.2)',
                        backgroundColor: formData.paymentMethod === method.id ? 'rgba(27, 23, 20, 0.9)' : 'transparent',
                        color: 'var(--color-soft-ivory)',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={formData.paymentMethod === method.id}
                        onChange={() => setFormData({ ...formData, paymentMethod: method.id })}
                        style={{ accentColor: 'var(--color-metallic-copper)' }}
                      />
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
                <p style={{ margin: '0.75rem 0 0', color: 'var(--color-muted-grey)', fontSize: '0.6875rem', lineHeight: 1.5 }}>
                  Payment details are confirmed separately; we never collect card numbers or CVV here.
                </p>
              </div>
            </form>
          )}

          {/* Confirmation Step */}
          {checkoutStep === 'confirmation' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 1.25rem' }} />
              <span className="eyebrow">ORDER REQUEST RECORDED</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>
                Thank You for Choosing SILVORA
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-grey)', marginBottom: '1.5rem' }}>
                Reference Order Number: <strong style={{ color: 'var(--color-rose-gold)' }}>{orderId}</strong>
              </p>
              <div style={{ padding: '1.25rem', backgroundColor: '#14100E', fontSize: '0.8125rem', textAlign: 'left', marginBottom: '2rem', border: '1px solid rgba(184, 121, 81, 0.25)', color: 'var(--color-soft-ivory)' }}>
                <p><strong>Customer:</strong> {formData.fullName || 'Valued Client'}</p>
                <p><strong>Destination:</strong> {formData.city || 'India'}, {formData.pincode}</p>
                <p><strong>Method:</strong> {formData.paymentMethod.toUpperCase()}</p>
                <p style={{ marginTop: '0.75rem', color: 'var(--color-champagne)' }}>
                  Your order is pending payment confirmation. We will confirm the payment and dispatch steps separately; no payment details were collected here.
                </p>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  closeDrawer();
                  navigateTo('collection');
                }}
              >
                Continue Browsing Collection
              </button>
            </div>
          )}
        </div>

        {/* Footer with Totals & CTAs */}
        {cart.length > 0 && checkoutStep !== 'confirmation' && (
          <div className="drawer-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Estimated Subtotal
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-champagne)' }}>{formattedSubtotal}</span>
            </div>

            <p style={{ fontSize: '0.6875rem', color: 'var(--color-muted-grey)', marginBottom: '1.25rem' }}>
              Taxes calculated at checkout. Complimentary insured transit included.
            </p>

            {checkoutStep === 'cart' ? (
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  if (status !== 'authenticated' || !user) {
                    closeDrawer();
                    navigateTo('login');
                    showToast('Please sign in before placing an order.');
                    return;
                  }
                  setCheckoutError(null);
                  setCheckoutStep('shipping');
                }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                className="btn-primary"
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Recording Order…' : 'Record Order Request'}</span>
                <ShieldCheck size={16} />
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};
