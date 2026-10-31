import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { drawerSlide } from '../lib/motion';
import { useAuth } from '../context/AuthContext';
import { createOrder, loadPaymentOptions, type OrderResponse, type PaymentMethod } from '../services/orderService';
import { payForOrder } from '../lib/razorpayCheckout';
import { formatTime, PAYMENT_METHODS } from '../lib/orderFormat';
import { createAddress, formatAddress, listAddresses, MAX_SAVED_ADDRESSES, type SavedAddress } from '../services/accountService';
import { INDIAN_STATES, normalisePin } from '../lib/addressValidation';
import { X, Minus, Plus, Trash2, ArrowRight, ShieldCheck, CheckCircle2, CreditCard, Sparkles } from 'lucide-react';

const NEW_ADDRESS = 'new';
const LATER_PAYMENT_CHOICES = [
  { id: 'upi', label: 'UPI (Instant Google Pay / PhonePe / Paytm)' },
  { id: 'card', label: 'Credit / Debit Card (Visa, Mastercard, RuPay)' },
  { id: 'cod', label: 'Cash on Delivery (Verified PIN)' }
];
const ONLINE_PAYMENT_CHOICES = [
  { id: 'online', label: 'Pay Online (UPI, Cards, Netbanking, Wallets)' },
  { id: 'cod', label: 'Cash on Delivery (Verified PIN)' }
];

/** How far an order that pays online has got: not yet paid, confirming with Razorpay, or paid. */
type PaymentStage = 'unpaid' | 'confirming' | 'paid';

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
  // Saved addresses for a signed-in customer; null until loaded (or when they could not be loaded).
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(NEW_ADDRESS);
  const [saveNewAddress, setSaveNewAddress] = useState(true);

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
  const [onlinePayments, setOnlinePayments] = useState(false);
  // The order being paid online; null for orders paid some other way.
  const [payingOrder, setPayingOrder] = useState<OrderResponse | null>(null);
  const [paymentStage, setPaymentStage] = useState<PaymentStage>('unpaid');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const fillFromAddress = (address: SavedAddress) => setFormData((current) => ({
    ...current,
    fullName: address.fullName,
    phone: address.phone,
    address: address.addressLine,
    city: address.city,
    state: address.state,
    pincode: address.postalCode
  }));

  const chooseAddress = (id: string) => {
    setSelectedAddressId(id);
    const address = savedAddresses?.find((candidate) => candidate.id === id);
    if (address) fillFromAddress(address);
    else setFormData((current) => ({ ...current, fullName: '', phone: '', address: '', city: '', state: '', pincode: '' }));
  };

  // Each time checkout opens, offer the customer's saved addresses, starting with their default.
  const isAtShipping = checkoutStep === 'shipping' && status === 'authenticated';
  useEffect(() => {
    if (!isAtShipping) return;
    let cancelled = false;
    listAddresses()
      .then((addresses) => {
        if (cancelled) return;
        setSavedAddresses(addresses);
        const preferred = addresses.find((address) => address.defaultAddress) ?? addresses[0];
        setSelectedAddressId(preferred ? preferred.id : NEW_ADDRESS);
        if (preferred) fillFromAddress(preferred);
      })
      // Checkout still works without them: the customer types the address instead.
      .catch(() => { if (!cancelled) { setSavedAddresses(null); setSelectedAddressId(NEW_ADDRESS); } });
    loadPaymentOptions()
      .then(({ online }) => {
        if (cancelled) return;
        setOnlinePayments(online);
        const choices = online ? ONLINE_PAYMENT_CHOICES : LATER_PAYMENT_CHOICES;
        setFormData((current) => choices.some((choice) => choice.id === current.paymentMethod)
          ? current : { ...current, paymentMethod: choices[0].id });
      })
      .catch(() => { /* Checkout still offers the other choices; the server has the final say. */ });
    return () => { cancelled = true; };
  }, [isAtShipping]);

  const usingSavedAddress = selectedAddressId !== NEW_ADDRESS && Boolean(savedAddresses?.some((address) => address.id === selectedAddressId));
  const canSaveAddress = savedAddresses !== null && savedAddresses.length < MAX_SAVED_ADDRESSES;

  const formattedSubtotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(cartSubtotal);

  const paymentChoices = onlinePayments ? ONLINE_PAYMENT_CHOICES : LATER_PAYMENT_CHOICES;
  const paysOnline = formData.paymentMethod === 'online';

  // Opens Razorpay's window. Closing it leaves the order saved, so the customer can pay again from here.
  const payNow = async (order: OrderResponse) => {
    setIsPaying(true);
    setPaymentError(null);
    try {
      const outcome = await payForOrder(order.id);
      if (outcome.kind === 'paid') setPaymentStage('paid');
      else if (outcome.kind === 'confirming') setPaymentStage('confirming');
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'We could not start the payment. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

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
        shippingPostalCode: normalisePin(formData.pincode),
      });
      setOrderId(order.orderNumber);
      setPayingOrder(paysOnline ? order : null);
      setPaymentStage('unpaid');
      setPaymentError(null);
      setCheckoutStep('confirmation');
      clearCart();
      if (paysOnline) void payNow(order);
      if (!usingSavedAddress && saveNewAddress && canSaveAddress) {
        // The order is already placed, so a problem saving the address is only mentioned, never blocking.
        createAddress({
          fullName: formData.fullName.trim(), phone: formData.phone.trim(), addressLine: formData.address.trim(),
          city: formData.city.trim(), state: formData.state.trim(), postalCode: normalisePin(formData.pincode)
        }).catch(() => showToast('Your order is placed, but we could not save the address to your account.'));
      }
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
      <motion.aside
        className="drawer-panel"
        {...drawerSlide(isCartOpen)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Shopping Bag Drawer"
      >
        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">
            {checkoutStep === 'cart' && `Shopping Bag (${cartCount})`}
            {checkoutStep === 'shipping' && 'Secure Checkout'}
            {checkoutStep === 'confirmation' && (payingOrder ? 'Your Order' : 'Order Request Recorded')}
          </h2>
          <button onClick={closeDrawer} aria-label="Close drawer" style={{ color: 'var(--color-text)' }}>
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
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                    No ornaments in your bag yet.
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', backgroundColor: '#121315', fontSize: '0.75rem', textAlign: 'center', border: '1px solid rgba(143, 146, 153, 0.25)', color: 'var(--color-silver-highlight)' }}>
                    <Sparkles size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span>Complimentary Insured Express Delivery unlocked!</span>
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
                          borderBottom: '1px solid rgba(143, 146, 153, 0.2)'
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: '80px',
                            height: '100px',
                            backgroundColor: '#0E0F11',
                            border: '1px solid rgba(143, 146, 153, 0.2)',
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
                              style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', cursor: 'pointer', color: 'var(--color-text)' }}
                              onClick={() => {
                                closeDrawer();
                                navigateTo('product', { productId: item.product.id });
                              }}
                            >
                              {item.product.name}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Size: {item.selectedSize}
                            </span>
                          </div>

                          {/* Quantity Adjuster */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(143, 146, 153, 0.3)', backgroundColor: '#0E0F11' }}>
                              <button
                                style={{ padding: '4px 8px', color: 'var(--color-text)' }}
                                onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={12} />
                              </button>
                              <span style={{ fontSize: '0.75rem', padding: '0 6px', fontWeight: 600, color: 'var(--color-text)' }}>
                                {item.quantity}
                              </span>
                              <button
                                style={{ padding: '4px 8px', color: 'var(--color-text)' }}
                                onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <button
                              style={{ color: 'var(--color-text-muted)' }}
                              onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Line Total */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-silver-highlight)' }}>{itemTotal}</span>
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

              {savedAddresses && savedAddresses.length > 0 && (
                <fieldset className="checkout-addresses">
                  <legend className="visually-hidden">Delivery address</legend>
                  {savedAddresses.map((address) => (
                    <label key={address.id} className={`checkout-address${selectedAddressId === address.id ? ' is-selected' : ''}`}>
                      <input type="radio" name="savedAddress" value={address.id} checked={selectedAddressId === address.id}
                        onChange={() => chooseAddress(address.id)} />
                      <span>
                        <strong>{address.fullName}</strong>{address.defaultAddress && <em> · Default</em>}
                        <span className="checkout-address-line">{formatAddress(address)}</span>
                        <span className="checkout-address-line">{address.phone}</span>
                      </span>
                    </label>
                  ))}
                  <label className={`checkout-address${selectedAddressId === NEW_ADDRESS ? ' is-selected' : ''}`}>
                    <input type="radio" name="savedAddress" value={NEW_ADDRESS} checked={selectedAddressId === NEW_ADDRESS}
                      onChange={() => chooseAddress(NEW_ADDRESS)} />
                    <span><strong>Deliver to a new address</strong></span>
                  </label>
                </fieldset>
              )}

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-email">Email *</label>
                <input id="checkout-email" className="checkout-input" type="email" required autoComplete="email"
                  placeholder="name@domain.com" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>

              {!usingSavedAddress && (
                <>
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="checkout-name">Full Name *</label>
                    <input id="checkout-name" className="checkout-input" type="text" required autoComplete="name" maxLength={120}
                      placeholder="e.g. Aarav Mehta" value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                  </div>

                  <div className="checkout-grid">
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-phone">Phone *</label>
                      <input id="checkout-phone" className="checkout-input" type="tel" inputMode="tel" required autoComplete="tel" maxLength={20}
                        placeholder="+91 98765 43210" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-state">State *</label>
                      <input id="checkout-state" className="checkout-input" type="text" required autoComplete="address-level1" maxLength={120}
                        list="checkout-indian-states" placeholder="e.g. Maharashtra" value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                      <datalist id="checkout-indian-states">{INDIAN_STATES.map((state) => <option key={state} value={state} />)}</datalist>
                    </div>
                  </div>

                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="checkout-street">Street Address *</label>
                    <input id="checkout-street" className="checkout-input" type="text" required autoComplete="street-address" maxLength={300}
                      placeholder="Flat or house number, building, street, area" value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>

                  <div className="checkout-grid">
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-city">City *</label>
                      <input id="checkout-city" className="checkout-input" type="text" required autoComplete="address-level2" maxLength={120}
                        placeholder="e.g. Mumbai" value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="checkout-pin">PIN Code *</label>
                      {/* Couriers deliver to Indian 6-digit PIN codes; spaces are allowed and removed before sending. */}
                      <input id="checkout-pin" className="checkout-input" type="text" inputMode="numeric" required autoComplete="postal-code"
                        pattern="\s*[1-9](\s*[0-9]){5}\s*" title="Please enter a 6-digit PIN code." maxLength={8}
                        placeholder="e.g. 400001" value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                    </div>
                  </div>

                  {canSaveAddress && (
                    <label className="checkout-save">
                      <input type="checkbox" checked={saveNewAddress} onChange={(e) => setSaveNewAddress(e.target.checked)} />
                      <span>Save this address to my account for next time</span>
                    </label>
                  )}
                </>
              )}

              {checkoutError && (
                <p role="alert" style={{ margin: 0, color: '#f4a2a2', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  {checkoutError}
                </p>
              )}

              {/* Payment Method Selector */}
              <div style={{ marginTop: '0.5rem' }}>
                <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>SELECT PAYMENT METHOD</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {paymentChoices.map((method) => (
                    <label
                      key={method.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.65rem 0.85rem',
                        border: formData.paymentMethod === method.id ? '1px solid var(--color-silver-deep)' : '1px solid rgba(143, 146, 153, 0.2)',
                        backgroundColor: formData.paymentMethod === method.id ? 'rgba(26, 27, 30, 0.9)' : 'transparent',
                        color: 'var(--color-text)',
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
                        style={{ accentColor: 'var(--color-silver-deep)' }}
                      />
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
                <p style={{ margin: '0.75rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.6875rem', lineHeight: 1.5 }}>
                  {onlinePayments
                    ? "Online payments happen in Razorpay's secure window; we never see your card number or CVV."
                    : 'Payment details are confirmed separately; we never collect card numbers or CVV here.'}
                </p>
              </div>
            </form>
          )}

          {/* Confirmation Step */}
          {checkoutStep === 'confirmation' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              {payingOrder && paymentStage === 'unpaid'
                ? <CreditCard size={48} style={{ display: 'block', color: 'var(--color-silver-accent)', margin: '0 auto 1.25rem' }} />
                : <CheckCircle2 size={48} style={{ display: 'block', color: 'var(--color-silver-accent)', margin: '0 auto 1.25rem' }} />}
              <span className="eyebrow">
                {!payingOrder ? 'ORDER REQUEST RECORDED' : paymentStage === 'paid' ? 'PAYMENT RECEIVED'
                  : paymentStage === 'confirming' ? 'CONFIRMING YOUR PAYMENT' : 'AWAITING PAYMENT'}
              </span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                {payingOrder && paymentStage === 'unpaid' ? 'Your Order Is Saved' : 'Thank You for Choosing SILVORA'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Reference Order Number: <strong style={{ color: 'var(--color-silver-accent)' }}>{orderId}</strong>
              </p>
              <div style={{ padding: '1.25rem', backgroundColor: '#121315', fontSize: '0.8125rem', textAlign: 'left', marginBottom: '2rem', border: '1px solid rgba(143, 146, 153, 0.25)', color: 'var(--color-text)' }}>
                <p><strong>Customer:</strong> {formData.fullName || 'Valued Client'}</p>
                <p><strong>Destination:</strong> {formData.city || 'India'}, {formData.pincode}</p>
                <p><strong>Method:</strong> {PAYMENT_METHODS[formData.paymentMethod.toUpperCase()] ?? formData.paymentMethod.toUpperCase()}</p>
                <p style={{ marginTop: '0.75rem', color: 'var(--color-silver-highlight)' }}>
                  {!payingOrder && 'Your order is pending payment confirmation. We will confirm the payment and dispatch steps separately; no payment details were collected here.'}
                  {payingOrder && paymentStage === 'paid' && "Your payment was received and your order is confirmed. We're getting it ready."}
                  {payingOrder && paymentStage === 'confirming' && "We're confirming your payment with Razorpay. Your order page will update shortly, so please don't pay again."}
                  {payingOrder && paymentStage === 'unpaid' && `This order isn't paid yet.${payingOrder.paymentDueAt ? ` Please pay by ${formatTime(payingOrder.paymentDueAt)}, or the pieces go back on sale.` : ''}`}
                </p>
              </div>
              {paymentError && (
                <p role="alert" style={{ margin: '0 0 1rem', color: '#f4a2a2', fontSize: '0.75rem', lineHeight: 1.5 }}>{paymentError}</p>
              )}
              {payingOrder && paymentStage === 'unpaid' && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                  disabled={isPaying}
                  onClick={() => void payNow(payingOrder)}
                >
                  <span>{isPaying ? 'Opening Payment…' : 'Pay Now'}</span>
                  <ShieldCheck size={16} />
                </button>
              )}
              <button
                className={payingOrder && paymentStage === 'unpaid' ? 'btn-secondary' : 'btn-primary'}
                style={{ width: '100%' }}
                onClick={() => {
                  closeDrawer();
                  navigateTo('account', { accountTab: 'orders', orderNumber: orderId });
                }}
              >
                Follow This Order in My Account
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
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
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Estimated Subtotal
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-silver-highlight)' }}>{formattedSubtotal}</span>
            </div>

            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
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
                  // Order emails go to the account's address unless the customer types another.
                  setFormData((current) => current.email ? current : { ...current, email: user.email ?? '' });
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
                <span>{isSubmitting ? 'Recording Order…' : paysOnline ? 'Continue to Payment' : onlinePayments ? 'Place Order' : 'Record Order Request'}</span>
                <ShieldCheck size={16} />
              </button>
            )}
          </div>
        )}
      </motion.aside>
    </div>
  );
};
