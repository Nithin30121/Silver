import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  ArrowRight, Boxes, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Download, Eye, EyeOff, FolderTree, History, ImagePlus,
  Inbox, LayoutDashboard, LoaderCircle, LogOut, Mail, Menu, Moon, Package, Pencil, Plus, Printer, RefreshCw, Search, ShoppingBag, Store, Sun,
  TrendingUp, TriangleAlert, Users, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toAccountError } from '../../services/authService';
import type { CatalogueCategory } from '../../types';
import type { ApiProduct } from '../../services/catalogService';
import type { OrderResponse } from '../../services/orderService';
import { formatDate, humanize, isSecureLink, money, PAYMENT_METHODS } from '../../lib/orderFormat';
import { OrderPrintSheet, type OrderPrintKind } from '../OrderPrintSheet';
import {
  AdminApiError, createCategory, createProduct, downloadAdminCsv, getAdminCategories, getAdminCustomers, getAdminIdentity,
  getAdminOrders, getAdminProducts, getCustomerOrders, getEmailStatus, getMessages, getSalesSummary, getStockMovements, setCategoryActive,
  setMessageStatus, setProductActive, updateCategory, updateOrderStatus, updateProduct, uploadProductImages, type AdminCustomer,
  type AdminOrderPage, type CategoryInput, type ContactMessage, type CustomerPage, type CustomerRole, type MessagePage,
  type MessageStatus, type ProductInput, type SalesSummary, type StockMovement, type StockReason
} from '../../services/adminService';
import '../../styles/admin.css';

type Section = 'overview' | 'products' | 'categories' | 'inventory' | 'orders' | 'customers' | 'messages';
type Theme = 'light' | 'dark';
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type Notify = (kind: 'success' | 'error', text: string) => void;
type FlatCategory = CatalogueCategory & { depth: number; path: string; trail: string };

const LOW_STOCK = 3;
const CUSTOMER_PAGE_SIZE = 25;
const ORDER_PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 25;
const THEME_KEY = 'silvora_admin_theme';

const SECTIONS: Record<Section, { title: string; description: string; icon: React.ReactNode }> = {
  overview: { title: 'Overview', description: 'A quick look at how your shop is doing.', icon: <LayoutDashboard size={18} /> },
  products: { title: 'Products', description: 'Add, edit and publish the pieces in your shop.', icon: <Package size={18} /> },
  categories: { title: 'Categories', description: 'Organise how products are grouped in the shop menu.', icon: <FolderTree size={18} /> },
  inventory: { title: 'Inventory', description: 'Watch stock levels and restock before pieces sell out.', icon: <Boxes size={18} /> },
  orders: { title: 'Orders', description: 'Review customer orders and move them along.', icon: <ShoppingBag size={18} /> },
  customers: { title: 'Customers', description: 'See who shops with you.', icon: <Users size={18} /> },
  messages: { title: 'Messages', description: 'Questions people send through the contact form.', icon: <Inbox size={18} /> },
};
const NAV_GROUPS: Array<{ label: string; items: Section[] }> = [
  { label: '', items: ['overview'] },
  { label: 'Catalogue', items: ['products', 'categories', 'inventory'] },
  { label: 'Sales', items: ['orders', 'customers', 'messages'] },
];

const ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
// Mirrors the backend's allowed order moves, so the list only offers changes the server will accept.
const NEXT_ORDER_STATUSES: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};
const ORDER_TONES: Record<string, Tone> = {
  PENDING_PAYMENT: 'warning', CONFIRMED: 'info', PROCESSING: 'info', SHIPPED: 'info', DELIVERED: 'success', CANCELLED: 'danger'
};
const PAYMENT_TONES: Record<string, Tone> = { PENDING: 'warning', PAID: 'success', FAILED: 'danger', REFUNDED: 'neutral' };
// Statuses the server emails customers about; Processing is internal.
const EMAIL_STATUSES = new Set(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
const STOCK_REASONS: Record<StockReason, string> = {
  INITIAL: 'Starting stock', MANUAL: 'Updated by hand', SALE: 'Sold', CANCELLATION: 'Order cancelled'
};
// Suggestions for the courier box; any other courier can be typed in.
const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ekart', 'Xpressbees', 'Shadowfax', 'Shiprocket'];
const CATEGORY_TYPES: Record<CatalogueCategory['categoryType'], string> = {
  audience: 'Audience', collection: 'Collection', items: 'Items', landing_page: 'Landing page'
};

const emptyProduct = (): ProductInput => ({
  name: '', slug: '', sku: '', description: '', price: 0, imageUrl: '', weightGrams: null,
  stockQuantity: 0, isActive: true, categoryIds: []
});
const emptyCategory = (): CategoryInput => ({
  name: '', slug: '', parentId: null, categoryType: 'collection', description: '', imageUrl: '', displayOrder: 0, isActive: true
});

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const formatDateTime = (value?: string) => value
  ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '—';
const formatTime = (value: Date) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(value);
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
/** "Asha Rao" becomes "AR"; an email address falls back to its first letters. */
const initialsOf = (name: string) => name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
const productImage = (product: ApiProduct) => product.images[0]?.imageUrl || product.imageUrl || '';

/** Lists every category depth-first with its depth, its slug path and its name trail (Men › Rings). */
const flatten = (categories: CatalogueCategory[], depth = 0, path = '', trail = ''): FlatCategory[] =>
  categories.flatMap((category) => {
    const item = { ...category, depth, path: `${path}/${category.slug}`, trail: trail ? `${trail} › ${category.name}` : category.name };
    return [item, ...flatten(category.children, depth + 1, item.path, item.trail)];
  });

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage can be unavailable in private windows */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const AdminDashboard: React.FC = () => {
  const { status, user, signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [identity, setIdentity] = useState<{ fullName: string; email: string } | null>(null);
  // The result of the server's role check, remembered per account so switching accounts re-checks.
  const [access, setAccess] = useState<{ userId: string; allowed: boolean; error: string } | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productTotal, setProductTotal] = useState<number | null>(null);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [customerTotal, setCustomerTotal] = useState<number | null>(null);
  // undefined while loading, null when this server doesn't offer the figure yet.
  const [summary, setSummary] = useState<SalesSummary | null | undefined>(undefined);
  const [recentMovements, setRecentMovements] = useState<StockMovement[] | null | undefined>(undefined);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [newMessages, setNewMessages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<CatalogueCategory | null | undefined>(undefined);
  const [viewingOrder, setViewingOrder] = useState<OrderResponse | undefined>(undefined);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const userId = status === 'authenticated' ? user?.id ?? null : null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getAdminIdentity()
      .then((admin) => { if (!cancelled) { setIdentity(admin); setAccess({ userId, allowed: true, error: '' }); } })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAccess({ userId, allowed: false, error: error instanceof Error ? error.message : 'Unable to verify administrative access.' });
        }
      });
    return () => { cancelled = true; };
  }, [userId]);
  const accessState = status === 'anonymous' ? 'signed-out'
    : !userId || access?.userId !== userId ? 'checking'
    : access.allowed ? 'allowed' : 'denied';

  const refreshNewMessages = () => {
    getMessages({ status: 'NEW', size: 1 }).then((page) => setNewMessages(page.total)).catch(() => setNewMessages(null));
  };

  const reload = async () => {
    setIsLoading(true);
    setLoadError('');
    // Loaded separately so a server without these newer features doesn't stop the rest of the dashboard loading.
    getAdminCustomers({ role: 'customer', size: 1 })
      .then((page) => setCustomerTotal(page.total))
      .catch(() => setCustomerTotal(null));
    getSalesSummary().then(setSummary).catch(() => setSummary(null));
    getStockMovements(undefined, 6).then((result) => setRecentMovements(result.movements)).catch(() => setRecentMovements(null));
    getEmailStatus().then((result) => setEmailEnabled(result.enabled)).catch(() => setEmailEnabled(null));
    refreshNewMessages();
    try {
      const [productResult, categoryResult, orderResult] = await Promise.all([
        getAdminProducts(), getAdminCategories(), getAdminOrders({ size: 5 })
      ]);
      setProducts(productResult.products);
      setProductTotal(productResult.total);
      setCategories(categoryResult);
      setRecentOrders(orderResult.orders);
      setOrderTotal(orderResult.total);
      setLoadedAt(new Date());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (accessState === 'allowed') void reload(); }, [accessState]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const lowStock = useMemo(() => products.filter((product) => product.stockQuantity <= LOW_STOCK)
    .sort((a, b) => a.stockQuantity - b.stockQuantity), [products]);
  const flatCategories = useMemo(() => flatten(categories), [categories]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* the choice just won't be remembered */ }
  };
  const themeToggle = <ThemeToggle theme={theme} onToggle={toggleTheme} />;

  if (accessState === 'signed-out') return <DashboardShell theme={theme}><AdminSignIn /></DashboardShell>;
  if (accessState === 'checking') {
    return (
      <DashboardShell theme={theme}>
        <AuthCard><div className="admin-checking"><LoaderCircle size={22} className="is-spinning" /> Checking your access…</div></AuthCard>
      </DashboardShell>
    );
  }
  if (accessState === 'denied') {
    return <DashboardShell theme={theme}><AccessDenied message={access?.error ?? ''} onSwitchAccount={() => void signOut().catch(() => undefined)} /></DashboardShell>;
  }

  const loaded = loadedAt !== null;
  const notify: Notify = (kind, text) => setNotice({ kind, text });
  const navigate = (next: Section) => {
    setSection(next);
    setEditingProduct(undefined);
    setEditingCategory(undefined);
    setViewingOrder(undefined);
    setMenuOpen(false);
  };
  const navCounts: Partial<Record<Section, { value: number; tone?: Tone }>> = {
    ...(productTotal !== null && { products: { value: productTotal } }),
    ...(loaded && { categories: { value: flatCategories.length } }),
    ...(lowStock.length > 0 && { inventory: { value: lowStock.length, tone: 'warning' as const } }),
    ...(orderTotal !== null && { orders: { value: orderTotal } }),
    ...(customerTotal !== null && { customers: { value: customerTotal } }),
    ...(newMessages ? { messages: { value: newMessages, tone: 'info' as const } } : {}),
  };
  const displayName = identity?.fullName || identity?.email || 'Administrator';
  const initials = initialsOf(displayName);

  return (
    <DashboardShell theme={theme}>
      <div className={`admin-layout ${menuOpen ? 'is-menu-open' : ''}`}>
        <aside className="admin-sidebar" id="admin-sidebar">
          <div className="admin-sidebar-top">
            <a className="admin-brand" href="/">SILVORA <span>Admin</span></a>
            <button className="admin-icon-button admin-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
          </div>
          <nav className="admin-nav" aria-label="Admin navigation">
            {NAV_GROUPS.map((group) => (
              <div className="admin-nav-group" key={group.label || 'main'}>
                {group.label && <span className="admin-nav-label">{group.label}</span>}
                {group.items.map((item) => {
                  const count = navCounts[item];
                  return (
                    <button key={item} className={`admin-nav-button ${section === item ? 'is-active' : ''}`}
                      aria-current={section === item ? 'page' : undefined} onClick={() => navigate(item)}>
                      {SECTIONS[item].icon}
                      <span>{SECTIONS[item].title}</span>
                      {count && <span className={`admin-nav-count ${count.tone ? `is-${count.tone}` : ''}`}>{count.value}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <a href="/" target="_blank" rel="noreferrer" className="admin-nav-button"><Store size={18} /><span>View shop</span></a>
            <div className="admin-user-card">
              <span className="admin-avatar" aria-hidden="true">{initials || 'A'}</span>
              <span className="admin-user-text"><strong>{displayName}</strong>{identity?.fullName && <small>{identity.email}</small>}</span>
              <button className="admin-icon-button" title="Sign out" aria-label="Sign out"
                onClick={() => void signOut().then(() => window.location.assign('/')).catch(() => undefined)}><LogOut size={17} /></button>
            </div>
          </div>
        </aside>
        <div className="admin-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />

        <div className="admin-main">
          <div className="admin-mobilebar">
            <button className="admin-icon-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"
              aria-expanded={menuOpen} aria-controls="admin-sidebar"><Menu size={20} /></button>
            <a className="admin-brand" href="/">SILVORA <span>Admin</span></a>
            {themeToggle}
          </div>

          <main className="admin-content">
            <header className="admin-page-header">
              <div className="admin-page-title">
                <h1>{SECTIONS[section].title}</h1>
                <p>{SECTIONS[section].description}</p>
              </div>
              <div className="admin-page-actions">
                {loadedAt && <span className="admin-updated">Updated {formatTime(loadedAt)}</span>}
                <button className="admin-button is-secondary" onClick={() => void reload()} disabled={isLoading}>
                  <RefreshCw size={15} className={isLoading ? 'is-spinning' : ''} /> {isLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <span className="admin-desktop-only">{themeToggle}</span>
                {(section === 'overview' || section === 'products') && (
                  <button className="admin-button is-primary" onClick={() => setEditingProduct(null)}><Plus size={16} /> Add product</button>
                )}
                {section === 'categories' && (
                  <button className="admin-button is-primary" onClick={() => setEditingCategory(null)}><Plus size={16} /> Add category</button>
                )}
              </div>
            </header>

            {loadError && <div className="admin-alert" role="alert"><CircleAlert size={18} /><span>{loadError}</span></div>}

            {section === 'overview' && (
              <Overview products={products} productTotal={productTotal} recentOrders={recentOrders} orderTotal={orderTotal}
                customerTotal={customerTotal} summary={summary} recentMovements={recentMovements} lowStock={lowStock} loaded={loaded}
                onNavigate={navigate} onEditProduct={setEditingProduct} onViewOrder={setViewingOrder} />
            )}
            {section === 'products' && (
              <ProductManager products={products} categories={flatCategories} loaded={loaded} onEdit={setEditingProduct}
                onChanged={() => void reload()} notify={notify} />
            )}
            {section === 'categories' && (
              <CategoryManager categories={flatCategories} loaded={loaded} onEdit={setEditingCategory} onChanged={() => void reload()} notify={notify} />
            )}
            {section === 'inventory' && <Inventory products={products} loaded={loaded} refreshedAt={loadedAt} onEdit={setEditingProduct} />}
            {section === 'orders' && <OrderManager refreshedAt={loadedAt} onView={setViewingOrder} notify={notify} />}
            {section === 'customers' && <CustomerManager refreshedAt={loadedAt} onViewOrder={setViewingOrder} notify={notify} />}
            {section === 'messages' && <MessageManager refreshedAt={loadedAt} emailEnabled={emailEnabled} notify={notify} onChanged={refreshNewMessages} />}
          </main>
        </div>
      </div>

      {editingProduct !== undefined && (
        <ProductForm product={editingProduct} categories={categories} onClose={() => setEditingProduct(undefined)}
          onSaved={() => { setEditingProduct(undefined); notify('success', 'Product saved.'); void reload(); }} />
      )}
      {editingCategory !== undefined && (
        <CategoryForm category={editingCategory} categories={flatCategories} onClose={() => setEditingCategory(undefined)}
          onSaved={() => { setEditingCategory(undefined); notify('success', 'Category saved.'); void reload(); }} />
      )}
      {viewingOrder && (
        <OrderDetails order={viewingOrder} emailEnabled={emailEnabled} onClose={() => setViewingOrder(undefined)} notify={notify}
          onSaved={() => { setViewingOrder(undefined); void reload(); }} />
      )}
      {notice && (
        <div className={`admin-toast is-${notice.kind}`} role="status">
          {notice.kind === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          <span>{notice.text}</span>
          <button className="admin-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}
    </DashboardShell>
  );
};

const DashboardShell: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => (
  <div className="admin-page" data-theme={theme}>{children}</div>
);

const ThemeToggle: React.FC<{ theme: Theme; onToggle: () => void }> = ({ theme, onToggle }) => {
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button className="admin-icon-button is-bordered" onClick={onToggle} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
};

const AuthCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="admin-auth">
    <div className="admin-auth-card">
      <a className="admin-brand is-large" href="/">SILVORA <span>Admin</span></a>
      {children}
    </div>
  </div>
);

const AccessDenied: React.FC<{ message: string; onSwitchAccount: () => void }> = ({ message, onSwitchAccount }) => (
  <AuthCard>
    <span className="admin-auth-icon is-danger"><CircleAlert size={22} /></span>
    <h1>You don't have access</h1>
    <p>{message || 'This account is not an administrator.'}</p>
    <div className="admin-auth-actions">
      <button className="admin-button is-primary is-block" onClick={onSwitchAccount}>Sign in with another account</button>
      <a href="/" className="admin-button is-secondary is-block">Back to the shop</a>
    </div>
  </AuthCard>
);

/** Signing in here keeps the admin on /admin; the server then decides whether the account is an administrator. */
const AdminSignIn: React.FC = () => {
  const { isConfigured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(toAccountError(cause, 'Sign-in').message);
      setPassword('');
      setBusy(false);
    }
  };
  return (
    <AuthCard>
      <h1>Sign in to your dashboard</h1>
      <p>Use your administrator account. Customer accounts can't open the dashboard.</p>
      <form className="admin-form" onSubmit={submit}>
        <Field label="Email address" wide>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isConfigured} />
        </Field>
        <Field label="Password" wide>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!isConfigured} />
        </Field>
        {!isConfigured && <FormError text="Sign-in is not configured for this site." />}
        {error && <FormError text={error} />}
        <button className="admin-button is-primary is-block is-wide" disabled={busy || !isConfigured}>
          {busy ? <><LoaderCircle size={16} className="is-spinning" /> Signing in…</> : 'Sign in'}
        </button>
      </form>
      <a href="/" className="admin-link admin-auth-back">Back to the shop</a>
    </AuthCard>
  );
};

/* ---------- Shared building blocks ---------- */

const Badge: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`admin-badge is-${tone}`}>{children}</span>
);
const LiveBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Live' : 'Hidden'}</Badge>
);
const StockLevel: React.FC<{ quantity: number }> = ({ quantity }) => quantity === 0
  ? <Badge tone="danger">Out of stock</Badge>
  : quantity <= LOW_STOCK ? <Badge tone="warning">{quantity} left</Badge>
    : <span className="admin-num">{quantity}</span>;

const Thumb: React.FC<{ product: ApiProduct }> = ({ product }) => {
  const src = productImage(product);
  return src
    ? <img className="admin-thumb" src={src} alt="" loading="lazy" />
    : <span className="admin-thumb is-empty" aria-hidden="true"><Package size={16} /></span>;
};

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <section className="admin-card">
    <header className="admin-card-header"><h2>{title}</h2>{action}</header>
    {children}
  </section>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="admin-empty">
    <span className="admin-empty-icon">{icon}</span>
    <strong>{title}</strong>
    <p>{text}</p>
    {action}
  </div>
);

const LoadingRows: React.FC = () => (
  <div className="admin-skeleton" aria-label="Loading">{[0, 1, 2, 3].map((row) => <span key={row} />)}</div>
);

const SearchBox: React.FC<{ value: string; placeholder: string; onChange: (value: string) => void; onSubmit?: (value: string) => void }> = ({ value, placeholder, onChange, onSubmit }) => (
  <form className="admin-search" role="search" onSubmit={(event) => { event.preventDefault(); onSubmit?.(value); }}>
    <Search size={16} aria-hidden="true" />
    <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(event) => onChange(event.target.value)} />
    {value && (
      <button type="button" className="admin-search-clear" aria-label="Clear search" onClick={() => { onChange(''); onSubmit?.(''); }}><X size={14} /></button>
    )}
  </form>
);

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string; count?: number }>; onChange: (value: T) => void; label: string }) {
  return (
    <div className="admin-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'is-active' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}{option.count !== undefined && <span>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Overview ---------- */

const Overview: React.FC<{
  products: ApiProduct[]; productTotal: number | null; recentOrders: OrderResponse[]; orderTotal: number | null; customerTotal: number | null;
  summary: SalesSummary | null | undefined; recentMovements: StockMovement[] | null | undefined; lowStock: ApiProduct[]; loaded: boolean;
  onNavigate: (section: Section) => void; onEditProduct: (product: ApiProduct) => void; onViewOrder: (order: OrderResponse) => void;
}> = ({ products, productTotal, recentOrders, orderTotal, customerTotal, summary, recentMovements, lowStock, loaded, onNavigate, onEditProduct, onViewOrder }) => {
  const liveCount = products.filter((product) => product.isActive).length;
  const byStatus = summary?.ordersByStatus ?? {};
  const toShip = (byStatus.CONFIRMED ?? 0) + (byStatus.PROCESSING ?? 0);
  return (
    <>
      <div className="admin-stats">
        <StatCard icon={<Package size={18} />} label="Products" value={productTotal ?? '—'} onClick={() => onNavigate('products')}
          note={loaded ? `${liveCount} live · ${products.length - liveCount} hidden` : 'In your catalogue'} />
        <StatCard icon={<ShoppingBag size={18} />} label="Orders" value={orderTotal ?? '—'} onClick={() => onNavigate('orders')}
          note={summary && orderTotal ? `${toShip} to ship · ${byStatus.PENDING_PAYMENT ?? 0} awaiting payment` : 'All time'} />
        <StatCard icon={<TriangleAlert size={18} />} label="Low stock" value={loaded ? lowStock.length : '—'} onClick={() => onNavigate('inventory')}
          note={`${LOW_STOCK} or fewer pieces left`} tone={lowStock.length > 0 ? 'warning' : undefined} />
        <StatCard icon={<Users size={18} />} label="Customers" value={customerTotal ?? '—'} note="Shopper accounts" onClick={() => onNavigate('customers')} />
      </div>

      {summary && <SalesStrip summary={summary} />}

      <div className="admin-overview-grid">
        <Panel title="Recent orders" action={<button className="admin-link" onClick={() => onNavigate('orders')}>View all <ArrowRight size={14} /></button>}>
          {!loaded ? <LoadingRows /> : recentOrders.length === 0
            ? <EmptyState icon={<ShoppingBag size={20} />} title="No orders yet" text="Orders appear here as soon as customers check out." />
            : (
              <ul className="admin-mini-list">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <button onClick={() => onViewOrder(order)}>
                      <span className="admin-mini-main">
                        <strong>{order.orderNumber}</strong>
                        <small>{order.shippingFullName || order.shippingEmail || 'Customer'} · {formatDate(order.createdAt)}</small>
                      </span>
                      <span className="admin-mini-side">
                        <strong className="admin-num">{money(order.totalAmount)}</strong>
                        <Badge tone={ORDER_TONES[order.status] ?? 'neutral'}>{humanize(order.status)}</Badge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Panel>

        <Panel title="Best sellers" action={<span className="admin-hint">All time</span>}>
          {summary === undefined ? <LoadingRows /> : summary === null ? <NotOnServerYet />
            : summary.bestSellers.length === 0
              ? <EmptyState icon={<TrendingUp size={20} />} title="No sales yet" text="Your best-selling pieces appear here once orders come in." />
              : (
                <ul className="admin-mini-list">
                  {summary.bestSellers.map((item, index) => (
                    <li key={item.productId ?? item.name}>
                      <div className="admin-mini-row">
                        <span className="admin-mini-main has-thumb">
                          <span className="admin-rank" aria-hidden="true">{index + 1}</span>
                          <span><strong>{item.name}</strong><small>{item.sku || 'No SKU'}</small></span>
                        </span>
                        <span className="admin-mini-side is-stacked">
                          <strong className="admin-num">{item.quantity} sold</strong>
                          <small className="admin-num">{money(item.orderValue)}</small>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
        </Panel>

        <Panel title="Low stock" action={<button className="admin-link" onClick={() => onNavigate('inventory')}>View inventory <ArrowRight size={14} /></button>}>
          {!loaded ? <LoadingRows /> : lowStock.length === 0
            ? <EmptyState icon={<CircleCheck size={20} />} title="Stock looks healthy" text={`No product has ${LOW_STOCK} or fewer pieces left.`} />
            : (
              <ul className="admin-mini-list">
                {lowStock.slice(0, 5).map((product) => (
                  <li key={product.id}>
                    <button onClick={() => onEditProduct(product)}>
                      <span className="admin-mini-main has-thumb">
                        <Thumb product={product} />
                        <span><strong>{product.name}</strong><small>{product.sku || 'No SKU'}</small></span>
                      </span>
                      <span className="admin-mini-side"><StockLevel quantity={product.stockQuantity} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </Panel>

        <Panel title="Stock changes" action={<button className="admin-link" onClick={() => onNavigate('inventory')}>View all <ArrowRight size={14} /></button>}>
          {recentMovements === undefined ? <LoadingRows /> : recentMovements === null ? <NotOnServerYet />
            : recentMovements.length === 0
              ? <EmptyState icon={<History size={20} />} title="No stock changes yet" text="Sales, cancellations and stock edits are listed here as they happen." />
              : <StockChangeList movements={recentMovements} showProduct />}
        </Panel>
      </div>
    </>
  );
};

const SalesStrip: React.FC<{ summary: SalesSummary }> = ({ summary }) => {
  const month = summary.thisMonth;
  const average = month.orderCount > 0 ? Number(month.orderValue) / month.orderCount : null;
  const orders = (count: number) => `${count} ${count === 1 ? 'order' : 'orders'}`;
  return (
    <section className="admin-card admin-sales">
      <header className="admin-card-header">
        <h2>Sales</h2>
        <span className="admin-hint">Leaves out cancelled orders · {summary.timeZone.replace('_', ' ')} time</span>
      </header>
      <dl className="admin-sales-grid">
        <div><dt>This week</dt><dd><strong className="admin-num">{money(summary.thisWeek.orderValue)}</strong><small>{orders(summary.thisWeek.orderCount)}</small></dd></div>
        <div><dt>This month</dt><dd><strong className="admin-num">{money(month.orderValue)}</strong><small>{orders(month.orderCount)}</small></dd></div>
        <div><dt>Average order</dt><dd><strong className="admin-num">{average === null ? '—' : money(average)}</strong><small>This month</small></dd></div>
        <div><dt>Marked as paid</dt><dd><strong className="admin-num">{money(month.paidValue)}</strong><small>This month</small></dd></div>
      </dl>
    </section>
  );
};

const NotOnServerYet: React.FC = () => (
  <EmptyState icon={<CircleAlert size={20} />} title="Not available yet" text="Deploy the latest backend to see this." />
);

/** "−2" or "+3", with a true minus sign. */
const signed = (value: number) => value > 0 ? `+${value}` : `−${Math.abs(value)}`;

const StockChangeList: React.FC<{ movements: StockMovement[]; showProduct?: boolean }> = ({ movements, showProduct }) => (
  <ul className="admin-mini-list">
    {movements.map((movement) => {
      const detail = [
        showProduct ? STOCK_REASONS[movement.reason] : null,
        movement.orderNumber,
        movement.reason !== 'SALE' && movement.actorName ? `by ${movement.actorName}` : null,
        formatDateTime(movement.createdAt),
      ].filter(Boolean).join(' · ');
      return (
        <li key={movement.id}>
          <div className="admin-mini-row">
            <span className="admin-mini-main">
              <strong>{showProduct ? movement.productName : STOCK_REASONS[movement.reason]}</strong>
              <small>{detail}</small>
            </span>
            <span className="admin-mini-side is-stacked">
              <strong className={`admin-num admin-stock-change ${movement.quantityChange > 0 ? 'is-up' : 'is-down'}`}>{signed(movement.quantityChange)}</strong>
              <small className="admin-num">{movement.quantityAfter} left</small>
            </span>
          </div>
        </li>
      );
    })}
  </ul>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; note: string; tone?: Tone; onClick: () => void }> = ({ icon, label, value, note, tone, onClick }) => (
  <button className={`admin-stat ${tone ? `is-${tone}` : ''}`} onClick={onClick}>
    <span className="admin-stat-top"><span className="admin-stat-label">{label}</span><span className="admin-stat-icon">{icon}</span></span>
    <strong className="admin-num">{value}</strong>
    <small>{note}</small>
  </button>
);

/* ---------- Products ---------- */

const ProductManager: React.FC<{
  products: ApiProduct[]; categories: FlatCategory[]; loaded: boolean;
  onEdit: (product: ApiProduct | null) => void; onChanged: () => void; notify: Notify;
}> = ({ products, categories, loaded, onEdit, onChanged, notify }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'hidden'>('all');
  const trails = useMemo(() => new Map(categories.map((category) => [category.id, category.trail])), [categories]);
  const liveCount = products.filter((product) => product.isActive).length;
  // Every product is loaded, so searching happens here as you type.
  const needle = search.trim().toLowerCase();
  const visible = products.filter((product) => (filter === 'all' || (filter === 'live') === product.isActive)
    && (!needle || [product.name, product.sku, product.slug].some((value) => value?.toLowerCase().includes(needle))));
  return (
    <section className="admin-card">
      <div className="admin-card-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name or SKU" />
        <Segmented label="Filter products" value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'All', count: products.length },
          { value: 'live', label: 'Live', count: liveCount },
          { value: 'hidden', label: 'Hidden', count: products.length - liveCount },
        ]} />
      </div>
      {!loaded ? <LoadingRows /> : visible.length === 0 ? (
        products.length === 0 && !search
          ? <EmptyState icon={<Package size={20} />} title="No products yet" text="Add your first piece to start selling it in the shop."
              action={<button className="admin-button is-primary" onClick={() => onEdit(null)}><Plus size={16} /> Add product</button>} />
          : <EmptyState icon={<Search size={20} />} title="No matching products" text="Try a different search or filter." />
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>SKU</th><th className="is-right">Price</th><th>Stock</th><th>Status</th><th><span className="admin-sr-only">Actions</span></th></tr></thead>
            <tbody>
              {visible.map((product) => (
                <ProductRow key={product.id} product={product} onEdit={() => onEdit(product)} onChanged={onChanged} notify={notify}
                  categoryText={product.categoryIds.map((id) => trails.get(id)).filter(Boolean).join(', ')} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const ProductRow: React.FC<{ product: ApiProduct; categoryText: string; onEdit: () => void; onChanged: () => void; notify: Notify }> = ({ product, categoryText, onEdit, onChanged, notify }) => {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await setProductActive(product.id, !product.isActive);
      notify('success', product.isActive ? `“${product.name}” is now hidden from the shop.` : `“${product.name}” is now live in the shop.`);
      onChanged();
    } catch (error) {
      notify('error', errorText(error, 'Unable to update product status.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr>
      <td data-label="Product">
        <div className="admin-product-cell">
          <Thumb product={product} />
          <span><button className="admin-row-title" onClick={onEdit}>{product.name}</button><small>{categoryText || 'No category'}</small></span>
        </div>
      </td>
      <td data-label="SKU" className="admin-mono">{product.sku || '—'}</td>
      <td data-label="Price" className="admin-num is-right">{money(product.price)}</td>
      <td data-label="Stock"><StockLevel quantity={product.stockQuantity} /></td>
      <td data-label="Status"><LiveBadge isActive={product.isActive} /></td>
      <td className="admin-row-actions">
        <button className="admin-button is-ghost is-small" onClick={onEdit}><Pencil size={14} /> Edit</button>
        <button className="admin-button is-ghost is-small" onClick={() => void toggle()} disabled={busy}>
          {product.isActive ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Publish</>}
        </button>
      </td>
    </tr>
  );
};

const ProductForm: React.FC<{ product: ApiProduct | null; categories: CatalogueCategory[]; onClose: () => void; onSaved: () => void }> = ({ product, categories, onClose, onSaved }) => {
  const formId = useId();
  const [form, setForm] = useState<ProductInput>(() => product ? ({ name: product.name, slug: product.slug, sku: product.sku || '', description: product.description || '', price: Number(product.price), imageUrl: product.imageUrl || '', weightGrams: product.weightGrams === null ? null : Number(product.weightGrams), stockQuantity: product.stockQuantity, isActive: product.isActive, categoryIds: [...product.categoryIds] }) : emptyProduct());
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Once the product exists, saving again updates it, so retrying a failed photo upload never creates a duplicate.
  const [savedId, setSavedId] = useState<string | null>(product?.id ?? null);
  const [changed, setChanged] = useState(false);
  const update = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const close = changed ? onSaved : onClose;
  const toggleCategory = (id: string) => update('categoryIds', form.categoryIds.includes(id) ? form.categoryIds.filter((item) => item !== id) : [...form.categoryIds, id]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    let id = savedId;
    try { id = (id ? await updateProduct(id, form) : await createProduct(form)).id; setSavedId(id); setChanged(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save product.'); setSaving(false); return; }
    try { if (files.length) await uploadProductImages(id, files); onSaved(); }
    catch (cause) { setError(`The product was saved, but its photos were not. ${cause instanceof Error ? cause.message : ''} Fix the photo and click Save product to try again; the product will not be duplicated.`); }
    finally { setSaving(false); }
  };
  const existingPhotos = product?.images.filter((image) => image.imageUrl) ?? [];

  return (
    <Modal title={savedId ? 'Edit product' : 'Add product'} subtitle={savedId ? form.name : 'Fill in the details, then save to add it to your catalogue.'} onClose={close} size="large"
      footer={<>
        {error && <FormError text={error} />}
        <button type="button" className="admin-button is-secondary" onClick={close}>{changed ? 'Close' : 'Cancel'}</button>
        <button type="submit" form={formId} className="admin-button is-primary" disabled={saving}>
          {saving ? <><LoaderCircle size={16} className="is-spinning" /> Saving…</> : 'Save product'}
        </button>
      </>}>
      <form id={formId} className="admin-form" onSubmit={submit}>
        <FormSection title="Basic details" description="What customers see on the product page.">
          <Field label="Product name">
            <input required autoFocus value={form.name} onChange={(e) => { update('name', e.target.value); if (!product) update('slug', slugify(e.target.value)); }} />
          </Field>
          <Field label="URL slug" hint="Lowercase letters, numbers and dashes. Filled in from the name.">
            <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} />
          </Field>
          <Field label="Description" wide><textarea value={form.description} onChange={(e) => update('description', e.target.value)} /></Field>
        </FormSection>

        <FormSection title="Price and stock">
          <Field label="Price">
            <span className="admin-affix"><span>₹</span><input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => update('price', Number(e.target.value))} /></span>
          </Field>
          <Field label="Stock quantity" hint={`${LOW_STOCK} or fewer counts as low stock.`}>
            <input required min="0" type="number" value={form.stockQuantity} onChange={(e) => update('stockQuantity', Number(e.target.value))} />
          </Field>
          <Field label="SKU" hint="Your own stock code. Optional."><input value={form.sku} onChange={(e) => update('sku', e.target.value)} /></Field>
          <Field label="Weight" hint="Optional.">
            <span className="admin-affix is-suffix"><input min="0" step="0.001" type="number" value={form.weightGrams ?? ''} onChange={(e) => update('weightGrams', e.target.value === '' ? null : Number(e.target.value))} /><span>grams</span></span>
          </Field>
        </FormSection>

        <FormSection title="Photos" description="JPEG, PNG or WebP, up to 5 MB each. They upload securely when you save.">
          {existingPhotos.length > 0 && (
            <div className="admin-photo-strip is-wide">
              {existingPhotos.map((image) => <img key={image.id} src={image.imageUrl ?? ''} alt={image.altText || ''} />)}
            </div>
          )}
          <label className="admin-dropzone is-wide">
            <ImagePlus size={22} aria-hidden="true" />
            <strong>{files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} ready to upload` : existingPhotos.length ? 'Add more photos' : 'Choose photos to upload'}</strong>
            <small>{files.length ? files.map((file) => file.name).join(', ') : 'You can pick several at once.'}</small>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </label>
          <Field label="Image link" hint="Optional. Shown only when the product has no uploaded photo." wide>
            <input type="url" value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://" />
          </Field>
        </FormSection>

        <FormSection title="Categories" description="Choose where this product appears in the shop.">
          {categories.length === 0 ? <p className="admin-hint is-wide">No categories exist yet.</p> : (
            <div className="admin-category-picker is-wide">
              {categories.map((root) => (
                <fieldset key={root.id} className="admin-category-group">
                  <legend>{root.name}</legend>
                  <div className="admin-chip-row">
                    {flatten([root]).map((category) => (
                      <label key={category.id} className={`admin-chip ${form.categoryIds.includes(category.id) ? 'is-checked' : ''} ${category.isActive ? '' : 'is-muted'}`}>
                        <input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} />
                        {category.depth === 0 ? `${category.name} (top level)` : category.trail.split(' › ').slice(1).join(' › ')}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title="Visibility">
          <Switch checked={form.isActive} onChange={(value) => update('isActive', value)} label="Show in shop"
            description="Hidden products stay saved, but customers can't see or buy them." />
        </FormSection>
      </form>
    </Modal>
  );
};

/* ---------- Categories ---------- */

const CategoryManager: React.FC<{ categories: FlatCategory[]; loaded: boolean; onEdit: (category: CatalogueCategory | null) => void; onChanged: () => void; notify: Notify }> = ({ categories, loaded, onEdit, onChanged, notify }) => (
  <section className="admin-card">
    {!loaded ? <LoadingRows /> : categories.length === 0
      ? <EmptyState icon={<FolderTree size={20} />} title="No categories yet" text="Categories group your products in the shop menu."
          action={<button className="admin-button is-primary" onClick={() => onEdit(null)}><Plus size={16} /> Add category</button>} />
      : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead><tr><th>Category</th><th>Type</th><th>URL slug</th><th className="is-right">Order</th><th>Status</th><th><span className="admin-sr-only">Actions</span></th></tr></thead>
            <tbody>{categories.map((category) => <CategoryRow key={category.id} category={category} onEdit={() => onEdit(category)} onChanged={onChanged} notify={notify} />)}</tbody>
          </table>
        </div>
      )}
  </section>
);

const CategoryRow: React.FC<{ category: FlatCategory; onEdit: () => void; onChanged: () => void; notify: Notify }> = ({ category, onEdit, onChanged, notify }) => {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await setCategoryActive(category.id, !category.isActive);
      notify('success', category.isActive ? `“${category.name}” is now hidden.` : `“${category.name}” is now live.`);
      onChanged();
    } catch (error) {
      notify('error', errorText(error, 'Unable to update category.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr className={category.depth === 0 ? 'is-group-row' : ''}>
      <td data-label="Category">
        <span className="admin-tree" style={{ '--depth': category.depth } as React.CSSProperties}>
          {category.depth > 0 && <span className="admin-tree-branch" aria-hidden="true" />}
          <button className="admin-row-title" onClick={onEdit}>{category.name}</button>
        </span>
      </td>
      <td data-label="Type"><span className="admin-tag">{CATEGORY_TYPES[category.categoryType]}</span></td>
      <td data-label="URL slug" className="admin-mono">{category.path}</td>
      <td data-label="Order" className="admin-num is-right">{category.displayOrder}</td>
      <td data-label="Status"><LiveBadge isActive={category.isActive} /></td>
      <td className="admin-row-actions">
        <button className="admin-button is-ghost is-small" onClick={onEdit}><Pencil size={14} /> Edit</button>
        <button className="admin-button is-ghost is-small" disabled={busy} onClick={() => void toggle()}>
          {category.isActive ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Publish</>}
        </button>
      </td>
    </tr>
  );
};

const CategoryForm: React.FC<{ category: CatalogueCategory | null; categories: FlatCategory[]; onClose: () => void; onSaved: () => void }> = ({ category, categories, onClose, onSaved }) => {
  const formId = useId();
  const [form, setForm] = useState<CategoryInput>(() => category ? ({ name: category.name, slug: category.slug, parentId: category.parentId, categoryType: category.categoryType === 'landing_page' ? 'collection' : category.categoryType, description: category.description, imageUrl: category.imageUrl || '', displayOrder: category.displayOrder, isActive: category.isActive }) : emptyCategory());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const options = categories.filter((item) => item.id !== category?.id);
  const update = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try { if (category) await updateCategory(category.id, form); else await createCategory(form); onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save category.'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={category ? 'Edit category' : 'Add category'} subtitle={category ? category.name : 'New categories appear in the shop menu once they are live.'} onClose={onClose}
      footer={<>
        {error && <FormError text={error} />}
        <button type="button" className="admin-button is-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form={formId} className="admin-button is-primary" disabled={saving}>
          {saving ? <><LoaderCircle size={16} className="is-spinning" /> Saving…</> : 'Save category'}
        </button>
      </>}>
      <form id={formId} className="admin-form" onSubmit={submit}>
        <FormSection title="Details">
          <Field label="Name"><input required autoFocus value={form.name} onChange={(e) => { update('name', e.target.value); if (!category) update('slug', slugify(e.target.value)); }} /></Field>
          <Field label="URL slug" hint="Lowercase letters, numbers and dashes."><input required value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} /></Field>
          <Field label="Parent category">
            <select value={form.parentId || ''} onChange={(e) => update('parentId', e.target.value || null)}>
              <option value="">None (top level)</option>
              {options.map((item) => <option key={item.id} value={item.id}>{'— '.repeat(item.depth)}{item.name}</option>)}
            </select>
          </Field>
          <Field label="Category type">
            <select value={form.categoryType} onChange={(e) => update('categoryType', e.target.value as CategoryInput['categoryType'])}>
              <option value="audience">Audience</option><option value="collection">Collection</option><option value="items">Items</option>
            </select>
          </Field>
          <Field label="Display order" hint="Lower numbers show first."><input min="0" type="number" value={form.displayOrder} onChange={(e) => update('displayOrder', Number(e.target.value))} /></Field>
          <Field label="Image link" hint="Optional."><input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://" /></Field>
          <Field label="Description" wide><textarea value={form.description} onChange={(e) => update('description', e.target.value)} /></Field>
        </FormSection>
        <FormSection title="Visibility">
          <Switch checked={form.isActive} onChange={(value) => update('isActive', value)} label="Show in shop" description="Hidden categories disappear from the shop menu." />
        </FormSection>
      </form>
    </Modal>
  );
};

/* ---------- Inventory ---------- */

const Inventory: React.FC<{ products: ApiProduct[]; loaded: boolean; refreshedAt: Date | null; onEdit: (product: ApiProduct) => void }> = ({ products, loaded, refreshedAt, onEdit }) => {
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [historyFor, setHistoryFor] = useState<ApiProduct | null>(null);
  const [changes, setChanges] = useState<{ movements?: StockMovement[]; error?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getStockMovements(undefined, 20)
      .then((result) => { if (!cancelled) setChanges({ movements: result.movements }); })
      .catch((cause: unknown) => { if (!cancelled) setChanges({ error: unavailableText(cause, 'Unable to load stock changes.') }); });
    return () => { cancelled = true; };
  }, [refreshedAt]);

  const sorted = useMemo(() => [...products].sort((a, b) => a.stockQuantity - b.stockQuantity), [products]);
  const lowCount = products.filter((product) => product.stockQuantity > 0 && product.stockQuantity <= LOW_STOCK).length;
  const outCount = products.filter((product) => product.stockQuantity === 0).length;
  const units = products.reduce((sum, product) => sum + product.stockQuantity, 0);
  const visible = sorted.filter((product) => filter === 'all'
    || (filter === 'out' ? product.stockQuantity === 0 : product.stockQuantity > 0 && product.stockQuantity <= LOW_STOCK));
  return (
    <>
      <div className="admin-summary">
        <div><span>Pieces in stock</span><strong className="admin-num">{loaded ? units : '—'}</strong></div>
        <div className={lowCount ? 'is-warning' : ''}><span>Low stock</span><strong className="admin-num">{loaded ? lowCount : '—'}</strong></div>
        <div className={outCount ? 'is-danger' : ''}><span>Out of stock</span><strong className="admin-num">{loaded ? outCount : '—'}</strong></div>
      </div>
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <p className="admin-hint">Lowest stock first. To change a quantity, choose Update stock.</p>
          <Segmented label="Filter stock" value={filter} onChange={setFilter} options={[
            { value: 'all', label: 'All', count: products.length },
            { value: 'low', label: 'Low', count: lowCount },
            { value: 'out', label: 'Out', count: outCount },
          ]} />
        </div>
        {!loaded ? <LoadingRows /> : visible.length === 0
          ? <EmptyState icon={<Boxes size={20} />} title={products.length ? 'Nothing here' : 'No products yet'}
              text={products.length ? 'No product matches this filter.' : 'Stock levels appear once you add products.'} />
          : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>Product</th><th>SKU</th><th>Status</th><th>In stock</th><th><span className="admin-sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {visible.map((product) => (
                    <tr key={product.id}>
                      <td data-label="Product"><div className="admin-product-cell"><Thumb product={product} /><span><strong>{product.name}</strong></span></div></td>
                      <td data-label="SKU" className="admin-mono">{product.sku || '—'}</td>
                      <td data-label="Status"><LiveBadge isActive={product.isActive} /></td>
                      <td data-label="In stock"><StockLevel quantity={product.stockQuantity} /></td>
                      <td className="admin-row-actions">
                        <button className="admin-button is-ghost is-small" onClick={() => setHistoryFor(product)}><History size={14} /> History</button>
                        <button className="admin-button is-secondary is-small" onClick={() => onEdit(product)}>Update stock</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <section className="admin-card admin-section-gap">
        <header className="admin-card-header"><h2>Recent stock changes</h2><span className="admin-hint">Newest first</span></header>
        {!changes ? <LoadingRows /> : changes.error
          ? <div className="admin-card-message"><div className="admin-alert" role="alert"><CircleAlert size={18} /><span>{changes.error}</span></div></div>
          : !changes.movements?.length
            ? <EmptyState icon={<History size={20} />} title="No stock changes yet" text="Sales, cancellations and stock edits are listed here as they happen." />
            : <StockChangeList movements={changes.movements} showProduct />}
      </section>

      {historyFor && <StockHistory product={historyFor} onClose={() => setHistoryFor(null)} />}
    </>
  );
};

const StockHistory: React.FC<{ product: ApiProduct; onClose: () => void }> = ({ product, onClose }) => {
  const [history, setHistory] = useState<{ movements: StockMovement[]; total: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    getStockMovements(product.id, 50)
      .then((result) => { if (!cancelled) setHistory(result); })
      .catch((cause: unknown) => { if (!cancelled) setError(unavailableText(cause, 'Unable to load stock history.')); });
    return () => { cancelled = true; };
  }, [product.id]);
  return (
    <Modal title={`Stock history: ${product.name}`} subtitle={`${product.stockQuantity} in stock now`} onClose={onClose}
      footer={<button type="button" className="admin-button is-secondary" onClick={onClose}>Close</button>}>
      {error ? <FormError text={error} /> : !history ? <LoadingRows /> : history.movements.length === 0
        ? <EmptyState icon={<History size={20} />} title="No changes recorded yet"
            text="Stock history starts from the day this feature was switched on. New sales and edits will appear here." />
        : (
          <>
            <div className="admin-bordered"><StockChangeList movements={history.movements} /></div>
            {history.total > history.movements.length && <p className="admin-muted admin-table-note">Showing the latest {history.movements.length} of {history.total} changes.</p>}
          </>
        )}
    </Modal>
  );
};

/** A 404 from these newer endpoints means the server hasn't been updated yet. */
const unavailableText = (cause: unknown, fallback: string) => cause instanceof AdminApiError && cause.status === 404
  ? "Your server doesn't have this yet. Deploy the latest backend, then refresh."
  : errorText(cause, fallback);

/* ---------- Orders ---------- */

type OrderFilters = { query: string; status: string; page: number };

const OrderManager: React.FC<{ refreshedAt: Date | null; onView: (order: OrderResponse) => void; notify: Notify }> = ({ refreshedAt, onView, notify }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<OrderFilters>({ query: '', status: '', page: 0 });
  // Remembers which filters a result belongs to, so new filters show loading rows instead of stale orders.
  const [result, setResult] = useState<{ filters: OrderFilters; page?: AdminOrderPage; error?: string } | null>(null);
  useSearchAsYouType(query, setFilters);

  useEffect(() => {
    let cancelled = false;
    getAdminOrders({ query: filters.query, status: filters.status || undefined, page: filters.page, size: ORDER_PAGE_SIZE })
      .then((page) => { if (!cancelled) setResult({ filters, page }); })
      .catch((cause: unknown) => { if (!cancelled) setResult({ filters, error: errorText(cause, 'Unable to load orders.') }); });
    return () => { cancelled = true; };
  }, [filters, refreshedAt]);

  const isLoading = result?.filters !== filters;
  const data = result?.page;
  return (
    <section className="admin-card">
      <div className="admin-card-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search order number, name, email or phone"
          onSubmit={(value) => setFilters((current) => ({ ...current, query: value.trim(), page: 0 }))} />
        <div className="admin-toolbar-group">
          <label className="admin-select-inline">
            <span>Status</span>
            <select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value, page: 0 }))}>
              <option value="">All orders</option>
              {ORDER_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <DownloadButton notify={notify} title="Download the orders that match your search and status as a spreadsheet"
            onDownload={() => downloadAdminCsv('orders', { query: filters.query, status: filters.status }, `silvora-orders-${today()}.csv`)} />
        </div>
      </div>
      {isLoading ? <LoadingRows /> : result?.error ? (
        <div className="admin-card-message"><div className="admin-alert" role="alert"><CircleAlert size={18} /><span>{result.error}</span></div></div>
      ) : !data || data.orders.length === 0 ? (
        filters.query || filters.status
          ? <EmptyState icon={<Search size={20} />} title="No matching orders" text="Try a different search or status." />
          : <EmptyState icon={<ShoppingBag size={20} />} title="No orders yet" text="Orders appear here as soon as customers check out." />
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th className="is-right">Total</th><th>Payment</th><th>Status</th><th><span className="admin-sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.orders.map((order) => {
                  const pieces = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
                  return (
                    <tr key={order.id}>
                      <td data-label="Order"><button className="admin-row-title" onClick={() => onView(order)}>{order.orderNumber}</button><small>{formatDate(order.createdAt)}</small></td>
                      <td data-label="Customer"><span className="admin-cell-text">{order.shippingFullName || '—'}</span><small>{order.shippingEmail}</small></td>
                      <td data-label="Items">
                        <span className="admin-cell-text">{pieces} {pieces === 1 ? 'piece' : 'pieces'}</span>
                        <small className="admin-truncate">{order.items?.map((item) => item.productName).join(', ')}</small>
                      </td>
                      <td data-label="Total" className="admin-num is-right">{money(order.totalAmount)}</td>
                      <td data-label="Payment"><Badge tone={PAYMENT_TONES[order.paymentStatus] ?? 'neutral'}>{humanize(order.paymentStatus)}</Badge></td>
                      <td data-label="Status"><Badge tone={ORDER_TONES[order.status] ?? 'neutral'}>{humanize(order.status)}</Badge></td>
                      <td className="admin-row-actions"><button className="admin-button is-secondary is-small" onClick={() => onView(order)}>Manage</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={filters.page} pageSize={ORDER_PAGE_SIZE} shown={data.orders.length} total={data.total} totalPages={data.totalPages}
            onPage={(page) => setFilters((current) => ({ ...current, page }))} />
        </>
      )}
    </section>
  );
};

/** Applies a typed search after a short pause, so each keystroke doesn't call the server. */
function useSearchAsYouType<T extends { query: string; page: number }>(query: string, setFilters: React.Dispatch<React.SetStateAction<T>>) {
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => current.query === query.trim() ? current : { ...current, query: query.trim(), page: 0 }), 350);
    return () => window.clearTimeout(timer);
  }, [query, setFilters]);
}

const Pagination: React.FC<{ page: number; pageSize: number; shown: number; total: number; totalPages: number; note?: string; onPage: (page: number) => void }> = ({ page, pageSize, shown, total, totalPages, note, onPage }) => (
  <footer className="admin-pagination">
    <span>Showing {page * pageSize + 1}–{page * pageSize + shown} of {total}{note && ` · ${note}`}</span>
    {totalPages > 1 && (
      <span className="admin-pagination-buttons">
        <button className="admin-button is-secondary is-small" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /> Previous</button>
        <button className="admin-button is-secondary is-small" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={15} /></button>
      </span>
    )}
  </footer>
);

const DownloadButton: React.FC<{ title: string; onDownload: () => Promise<void>; notify: Notify }> = ({ title, onDownload, notify }) => {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onDownload();
    } catch (cause) {
      notify('error', errorText(cause, 'Unable to download the spreadsheet.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className="admin-button is-secondary" onClick={() => void run()} disabled={busy} title={title}>
      {busy ? <LoaderCircle size={15} className="is-spinning" /> : <Download size={15} />} Download CSV
    </button>
  );
};

/** Today's date as 2026-10-27, for download file names. */
const today = () => new Date().toLocaleDateString('en-CA');

const OrderDetails: React.FC<{ order: OrderResponse; emailEnabled: boolean | null; onClose: () => void; onSaved: () => void; notify: Notify }> = ({ order, emailEnabled, onClose, onSaved, notify }) => {
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [emailCustomer, setEmailCustomer] = useState(true);
  const [tracking, setTracking] = useState({
    carrier: order.trackingCarrier ?? '', number: order.trackingNumber ?? '', url: order.trackingUrl ?? ''
  });
  const [printing, setPrinting] = useState<OrderPrintKind | null>(null);
  const stopPrinting = useCallback(() => setPrinting(null), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const statusOptions = [order.status, ...(NEXT_ORDER_STATUSES[order.status] ?? [])];
  const isClosed = statusOptions.length === 1;
  // Tracking belongs to shipped orders; it is sent only while its fields are on screen.
  const showsTracking = status === 'SHIPPED' || status === 'DELIVERED';
  const trackingChanged = tracking.carrier.trim() !== (order.trackingCarrier ?? '')
    || tracking.number.trim() !== (order.trackingNumber ?? '') || tracking.url.trim() !== (order.trackingUrl ?? '');
  const trackingLinkProblem = tracking.url.trim() && !isSecureLink(tracking.url.trim())
    ? 'Paste the full tracking link, starting with https://' : '';
  const unchanged = status === order.status && paymentStatus === order.paymentStatus && !(showsTracking && trackingChanged);
  const customerHearsAboutIt = status !== order.status && EMAIL_STATUSES.has(status);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updateOrderStatus(order.id, status, paymentStatus, emailCustomer, showsTracking ? {
        carrier: tracking.carrier.trim(), number: tracking.number.trim(), url: tracking.url.trim()
      } : undefined);
      notify('success', customerHearsAboutIt && emailCustomer && emailEnabled
        ? `Order ${order.orderNumber} updated. The customer will get an email.`
        : `Order ${order.orderNumber} updated.`);
      onSaved();
    } catch (cause) {
      setError(errorText(cause, 'Unable to update order.'));
      setBusy(false);
    }
  };
  const address = [order.shippingAddress, order.shippingCity, [order.shippingState, order.shippingPostalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return (
    <Modal title={`Order ${order.orderNumber}`} subtitle={`Placed ${formatDateTime(order.createdAt)}`} onClose={onClose} size="large"
      footer={<>
        {error && <FormError text={error} />}
        <span className="admin-modal-footer-start">
          <button type="button" className="admin-button is-ghost" onClick={() => setPrinting('slip')}><Printer size={15} /> Packing slip</button>
          <button type="button" className="admin-button is-ghost" onClick={() => setPrinting('summary')}><Printer size={15} /> Order summary</button>
        </span>
        <button type="button" className="admin-button is-secondary" onClick={onClose}>Close</button>
        <button type="button" className="admin-button is-primary" disabled={busy || unchanged || Boolean(trackingLinkProblem)} onClick={() => void save()}>
          {busy ? <><LoaderCircle size={16} className="is-spinning" /> Saving…</> : 'Save changes'}
        </button>
      </>}>
      <dl className="admin-order-facts">
        <div><dt>Order</dt><dd><Badge tone={ORDER_TONES[order.status] ?? 'neutral'}>{humanize(order.status)}</Badge></dd></div>
        <div><dt>Payment</dt><dd><Badge tone={PAYMENT_TONES[order.paymentStatus] ?? 'neutral'}>{humanize(order.paymentStatus)}</Badge></dd></div>
        <div><dt>Method</dt><dd>{PAYMENT_METHODS[order.paymentMethod] ?? order.paymentMethod}</dd></div>
      </dl>
      <div className="admin-detail-grid">
        <div className="admin-detail">
          <h3>Customer</h3>
          <p><strong>{order.shippingFullName || '—'}</strong></p>
          {order.shippingEmail && <p><a className="admin-link" href={`mailto:${order.shippingEmail}`}>{order.shippingEmail}</a></p>}
          {order.shippingPhone && <p>{order.shippingPhone}</p>}
        </div>
        <div className="admin-detail">
          <h3>Ship to</h3>
          <p>{address || '—'}</p>
        </div>
      </div>

      <h3 className="admin-subheading">Items</h3>
      <div className="admin-table-scroll is-bordered">
        <table className="admin-table is-compact">
          <thead><tr><th>Product</th><th className="is-right">Qty</th><th className="is-right">Price</th><th className="is-right">Total</th></tr></thead>
          <tbody>
            {order.items?.map((item, index) => (
              <tr key={`${item.productId ?? 'item'}-${index}`}>
                <td data-label="Product"><span className="admin-cell-text">{item.productName}</span>{item.productSku && <small>{item.productSku}</small>}</td>
                <td data-label="Qty" className="admin-num is-right">{item.quantity}</td>
                <td data-label="Price" className="admin-num is-right">{money(item.unitPrice)}</td>
                <td data-label="Total" className="admin-num is-right">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>Order total</td><td className="admin-num is-right">{money(order.totalAmount)}</td></tr></tfoot>
        </table>
      </div>

      <h3 className="admin-subheading">Update order</h3>
      <div className="admin-form is-flat">
        <Field label="Order status" hint={isClosed ? 'This order is closed, so its status can no longer change.' : 'Only the next allowed steps are listed.'}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isClosed}>
            {statusOptions.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
          </select>
        </Field>
        <Field label="Payment status">
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            {PAYMENT_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
          </select>
        </Field>
        {showsTracking && <>
          <Field label="Courier" hint="Optional. Shown to the customer with the tracking number.">
            <input value={tracking.carrier} maxLength={80} list="admin-couriers" placeholder="e.g. Delhivery"
              onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} />
            <datalist id="admin-couriers">{COURIERS.map((courier) => <option key={courier} value={courier} />)}</datalist>
          </Field>
          <Field label="Tracking number" hint="Optional. Customers see it on their order page.">
            <input value={tracking.number} maxLength={80} onChange={(e) => setTracking({ ...tracking, number: e.target.value })} />
          </Field>
          <Field label="Tracking link" hint="Optional. The courier's tracking page for this parcel." error={trackingLinkProblem}>
            <input type="url" inputMode="url" value={tracking.url} maxLength={500} placeholder="https://"
              onChange={(e) => setTracking({ ...tracking, url: e.target.value })} />
          </Field>
        </>}
        {status === 'CANCELLED' && order.status !== 'CANCELLED' && (
          <p className="admin-callout is-warning is-wide"><TriangleAlert size={16} /> Cancelling returns this order's pieces to stock. It can't be undone.</p>
        )}
        {customerHearsAboutIt && emailEnabled !== null && (
          <Switch checked={emailEnabled && emailCustomer} disabled={!emailEnabled} onChange={setEmailCustomer}
            label="Email the customer about this change"
            description={emailEnabled ? `Sent to ${order.shippingEmail || 'the customer'} after you save.`
              : 'Customer emails are off until an email service is set up on the server.'} />
        )}
      </div>
      {printing && <OrderPrintSheet order={order} kind={printing} onDone={stopPrinting} />}
    </Modal>
  );
};

/* ---------- Messages ---------- */

type MessageFilter = MessageStatus | 'all';
type MessageFilters = { status: MessageFilter; page: number };
const MESSAGE_FILTERS: Array<{ value: MessageFilter; label: string }> = [
  { value: 'NEW', label: 'New' }, { value: 'DONE', label: 'Done' }, { value: 'all', label: 'All' }
];

/** A short preview: the subject, or the start of the message when there is none. */
const messageTitle = (message: ContactMessage) =>
  message.subject || (message.message.length > 70 ? `${message.message.slice(0, 70).trimEnd()}…` : message.message);

const MessageManager: React.FC<{ refreshedAt: Date | null; emailEnabled: boolean | null; notify: Notify; onChanged: () => void }> = ({ refreshedAt, emailEnabled, notify, onChanged }) => {
  const [filters, setFilters] = useState<MessageFilters>({ status: 'NEW', page: 0 });
  const [result, setResult] = useState<{ filters: MessageFilters; page?: MessagePage; error?: string } | null>(null);
  const [viewing, setViewing] = useState<ContactMessage | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMessages({ status: filters.status === 'all' ? undefined : filters.status, page: filters.page, size: MESSAGE_PAGE_SIZE })
      .then((page) => { if (!cancelled) setResult({ filters, page }); })
      .catch((cause: unknown) => { if (!cancelled) setResult({ filters, error: unavailableText(cause, 'Unable to load messages.') }); });
    return () => { cancelled = true; };
  }, [filters, refreshedAt, reloadKey]);

  const changed = (updated: ContactMessage) => {
    setViewing(undefined);
    notify('success', updated.status === 'DONE' ? 'Marked as done.' : 'Moved back to new messages.');
    setReloadKey((key) => key + 1);
    onChanged();
  };

  const isLoading = result?.filters !== filters;
  const data = result?.page;
  return (
    <section className="admin-card">
      <div className="admin-card-toolbar">
        <Segmented label="Show messages" value={filters.status} options={MESSAGE_FILTERS}
          onChange={(status) => setFilters({ status, page: 0 })} />
      </div>
      {emailEnabled === false && (
        <p className="admin-callout is-info admin-card-callout"><Mail size={16} /> New messages are listed here. Once an email service is set up on the server, each one is also emailed to you.</p>
      )}
      {isLoading ? <LoadingRows /> : result?.error ? (
        <div className="admin-card-message"><div className="admin-alert" role="alert"><CircleAlert size={18} /><span>{result.error}</span></div></div>
      ) : !data || data.messages.length === 0 ? (
        <EmptyState icon={<Inbox size={20} />} title={filters.status === 'NEW' ? 'No new messages' : 'No messages here'}
          text={filters.status === 'NEW' ? "You're all caught up. Messages from the contact page appear here." : 'Messages from the contact page appear here.'} />
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>From</th><th>Message</th><th>Order</th><th>Received</th><th>Status</th><th><span className="admin-sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.messages.map((message) => (
                  <tr key={message.id}>
                    <td data-label="From">
                      <div className="admin-person">
                        <span className="admin-avatar" aria-hidden="true">{initialsOf(message.name || message.email) || '?'}</span>
                        <span>
                          <span className="admin-person-name"><button className="admin-row-title" onClick={() => setViewing(message)}>{message.name}</button></span>
                          <small>{message.email}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Message"><span className="admin-cell-text">{messageTitle(message)}</span></td>
                    <td data-label="Order">{message.orderNumber || <span className="admin-muted">—</span>}</td>
                    <td data-label="Received">{formatDateTime(message.createdAt)}</td>
                    <td data-label="Status"><Badge tone={message.status === 'NEW' ? 'info' : 'neutral'}>{message.status === 'NEW' ? 'New' : 'Done'}</Badge></td>
                    <td className="admin-row-actions"><button className="admin-button is-secondary is-small" onClick={() => setViewing(message)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={filters.page} pageSize={MESSAGE_PAGE_SIZE} shown={data.messages.length} total={data.total}
            totalPages={data.totalPages} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
        </>
      )}
      {viewing && <MessageDetails message={viewing} onClose={() => setViewing(undefined)} onChanged={changed} />}
    </section>
  );
};

const MessageDetails: React.FC<{ message: ContactMessage; onClose: () => void; onChanged: (message: ContactMessage) => void }> = ({ message, onClose, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nextStatus: MessageStatus = message.status === 'NEW' ? 'DONE' : 'NEW';
  const replySubject = `Re: ${message.subject || 'your message to SILVORA'}`;
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      onChanged(await setMessageStatus(message.id, nextStatus));
    } catch (cause) {
      setError(errorText(cause, 'Unable to update this message.'));
      setBusy(false);
    }
  };
  return (
    <Modal title={message.subject || `Message from ${message.name}`} subtitle={`Received ${formatDateTime(message.createdAt)}`} onClose={onClose} size="large"
      footer={<>
        {error && <FormError text={error} />}
        <span className="admin-modal-footer-start">
          <a className="admin-button is-ghost" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(replySubject)}`}>
            <Mail size={15} /> Reply by email
          </a>
        </span>
        <button type="button" className="admin-button is-secondary" onClick={onClose}>Close</button>
        <button type="button" className="admin-button is-primary" disabled={busy} onClick={() => void save()}>
          {busy ? <><LoaderCircle size={16} className="is-spinning" /> Saving…</> : nextStatus === 'DONE' ? 'Mark as done' : 'Mark as new'}
        </button>
      </>}>
      <div className="admin-detail-grid">
        <div className="admin-detail">
          <h3>From</h3>
          <p><strong>{message.name}</strong>{message.fromAccount && <> <Badge tone="neutral">Signed in</Badge></>}</p>
          <p><a className="admin-link" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(replySubject)}`}>{message.email}</a></p>
          {message.phone && <p><a className="admin-link" href={`tel:${message.phone.replace(/[^0-9+]/g, '')}`}>{message.phone}</a></p>}
        </div>
        <div className="admin-detail">
          <h3>About</h3>
          <p>{message.orderNumber ? <>Order <strong>{message.orderNumber}</strong></> : 'No order mentioned'}</p>
          <p className="admin-muted">{message.status === 'DONE' && message.handledAt ? `Marked done ${formatDateTime(message.handledAt)}` : 'Not answered yet'}</p>
        </div>
      </div>
      <h3 className="admin-subheading">Message</h3>
      <p className="admin-message-body">{message.message}</p>
    </Modal>
  );
};

/* ---------- Customers ---------- */

type RoleFilter = CustomerRole | 'all';
type CustomerFilters = { query: string; role: RoleFilter; page: number };

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'customer', label: 'Customers' }, { value: 'admin', label: 'Admins' }, { value: 'all', label: 'All' }
];

const RoleBadge: React.FC<{ role: CustomerRole }> = ({ role }) => (
  <Badge tone={role === 'admin' ? 'info' : 'neutral'}>{role === 'admin' ? 'Admin' : 'Customer'}</Badge>
);

const CustomerManager: React.FC<{ refreshedAt: Date | null; onViewOrder: (order: OrderResponse) => void; notify: Notify }> = ({ refreshedAt, onViewOrder, notify }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CustomerFilters>({ query: '', role: 'customer', page: 0 });
  // Remembers which filters a result belongs to, so new filters show loading rows instead of stale people.
  const [result, setResult] = useState<{ filters: CustomerFilters; page?: CustomerPage; error?: string } | null>(null);
  const [viewing, setViewing] = useState<AdminCustomer | undefined>(undefined);
  useSearchAsYouType(query, setFilters);

  useEffect(() => {
    let cancelled = false;
    getAdminCustomers({ query: filters.query, role: filters.role === 'all' ? undefined : filters.role, page: filters.page, size: CUSTOMER_PAGE_SIZE })
      .then((page) => { if (!cancelled) setResult({ filters, page }); })
      .catch((cause: unknown) => { if (!cancelled) setResult({ filters, error: unavailableText(cause, 'Unable to load customers.') }); });
    return () => { cancelled = true; };
  }, [filters, refreshedAt]);

  const isLoading = result?.filters !== filters;
  const data = result?.page;
  return (
    <section className="admin-card">
      <div className="admin-card-toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search name or email"
          onSubmit={(value) => setFilters((current) => ({ ...current, query: value.trim(), page: 0 }))} />
        <div className="admin-toolbar-group">
          <Segmented label="Account type" value={filters.role} options={ROLE_OPTIONS}
            onChange={(role) => setFilters((current) => ({ ...current, role, page: 0 }))} />
          <DownloadButton notify={notify} title="Download the people that match your search and filter as a spreadsheet"
            onDownload={() => downloadAdminCsv('customers', { query: filters.query, role: filters.role === 'all' ? undefined : filters.role },
              `silvora-customers-${today()}.csv`)} />
        </div>
      </div>
      {isLoading ? <LoadingRows /> : result?.error ? (
        <div className="admin-card-message"><div className="admin-alert" role="alert"><CircleAlert size={18} /><span>{result.error}</span></div></div>
      ) : !data || data.customers.length === 0 ? (
        filters.query
          ? <EmptyState icon={<Search size={20} />} title="No matching people" text="Try a different name or email." />
          : <EmptyState icon={<Users size={20} />} title="No customers yet" text="People appear here as soon as they create an account on your shop." />
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Joined</th><th className="is-right">Orders</th><th className="is-right">Order value</th><th>Last order</th><th><span className="admin-sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td data-label="Name">
                      <div className="admin-person">
                        <span className="admin-avatar" aria-hidden="true">{initialsOf(customer.fullName || customer.email || '') || '?'}</span>
                        <span>
                          <span className="admin-person-name">
                            <button className="admin-row-title" onClick={() => setViewing(customer)}>{customer.fullName || 'No name given'}</button>
                            {customer.role === 'admin' && <RoleBadge role={customer.role} />}
                          </span>
                          <small>{customer.email || 'No email'}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Joined">{formatDate(customer.joinedAt)}</td>
                    <td data-label="Orders" className="admin-num is-right">{customer.orderCount}</td>
                    <td data-label="Order value" className="admin-num is-right">{money(customer.orderValue)}</td>
                    <td data-label="Last order">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : <span className="admin-muted">No orders yet</span>}</td>
                    <td className="admin-row-actions"><button className="admin-button is-secondary is-small" onClick={() => setViewing(customer)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={filters.page} pageSize={CUSTOMER_PAGE_SIZE} shown={data.customers.length} total={data.total}
            totalPages={data.totalPages} note="Order value leaves out cancelled orders" onPage={(page) => setFilters((current) => ({ ...current, page }))} />
        </>
      )}
      {viewing && (
        <CustomerDetails customer={viewing} onClose={() => setViewing(undefined)}
          onViewOrder={(order) => { setViewing(undefined); onViewOrder(order); }} />
      )}
    </section>
  );
};

const CustomerDetails: React.FC<{ customer: AdminCustomer; onClose: () => void; onViewOrder: (order: OrderResponse) => void }> = ({ customer, onClose, onViewOrder }) => {
  const [history, setHistory] = useState<{ orders: OrderResponse[]; total: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    getCustomerOrders(customer.id)
      .then((result) => { if (!cancelled) setHistory(result); })
      .catch((cause: unknown) => { if (!cancelled) setError(errorText(cause, "Unable to load this customer's orders.")); });
    return () => { cancelled = true; };
  }, [customer.id]);
  // Orders arrive newest first, so the first one holds their most recent delivery details.
  const latest = history?.orders[0];
  const address = latest
    ? [latest.shippingAddress, latest.shippingCity, [latest.shippingState, latest.shippingPostalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : '';
  return (
    <Modal title={customer.fullName || customer.email || 'Customer'} subtitle={`Joined ${formatDate(customer.joinedAt)}`} onClose={onClose} size="large"
      footer={<button type="button" className="admin-button is-secondary" onClick={onClose}>Close</button>}>
      <dl className="admin-order-facts">
        <div><dt>Account</dt><dd><RoleBadge role={customer.role} /></dd></div>
        <div><dt>Orders</dt><dd className="admin-num">{customer.orderCount}</dd></div>
        <div><dt>Order value</dt><dd className="admin-num">{money(customer.orderValue)}</dd></div>
        <div><dt>Last order</dt><dd>{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : 'None yet'}</dd></div>
      </dl>
      <div className="admin-detail-grid">
        <div className="admin-detail">
          <h3>Contact</h3>
          <p><strong>{customer.fullName || 'No name given'}</strong></p>
          {customer.email && <p><a className="admin-link" href={`mailto:${customer.email}`}>{customer.email}</a></p>}
          {latest?.shippingPhone && <p>{latest.shippingPhone}</p>}
        </div>
        <div className="admin-detail">
          <h3>Latest delivery address</h3>
          <p>{address || (history ? 'No orders yet' : '…')}</p>
        </div>
      </div>

      <h3 className="admin-subheading">Orders</h3>
      {error ? <FormError text={error} /> : !history ? <LoadingRows /> : history.orders.length === 0
        ? <p className="admin-muted">This person hasn't placed an order yet.</p>
        : (
          <>
            <ul className="admin-mini-list is-bordered">
              {history.orders.map((order) => {
                const pieces = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
                return (
                  <li key={order.id}>
                    <button onClick={() => onViewOrder(order)}>
                      <span className="admin-mini-main">
                        <strong>{order.orderNumber}</strong>
                        <small>{formatDate(order.createdAt)} · {pieces} {pieces === 1 ? 'piece' : 'pieces'}</small>
                      </span>
                      <span className="admin-mini-side">
                        <strong className="admin-num">{money(order.totalAmount)}</strong>
                        <Badge tone={ORDER_TONES[order.status] ?? 'neutral'}>{humanize(order.status)}</Badge>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {history.total > history.orders.length && <p className="admin-muted admin-table-note">Showing the latest {history.orders.length} of {history.total} orders.</p>}
          </>
        )}
    </Modal>
  );
};

/* ---------- Dialogs and form controls ---------- */

const Modal: React.FC<{ title: string; subtitle?: string; size?: 'large'; footer?: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, size, footer, onClose, children }) => {
  const titleId = useId();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);
  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className={`admin-modal ${size === 'large' ? 'is-large' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="admin-modal-header">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="admin-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer && <footer className="admin-modal-footer">{footer}</footer>}
      </section>
    </div>
  );
};

const FormSection: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="admin-form-section">
    <header><h3>{title}</h3>{description && <p>{description}</p>}</header>
    <div className="admin-form-grid">{children}</div>
  </section>
);

const Field: React.FC<{ label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactNode }> = ({ label, hint, error, wide, children }) => (
  <label className={`admin-field ${wide ? 'is-wide' : ''}`}>
    <span className="admin-field-label">{label}</span>
    {children}
    {error ? <small className="admin-field-hint is-error" role="alert">{error}</small> : hint && <small className="admin-field-hint">{hint}</small>}
  </label>
);

const Switch: React.FC<{ checked: boolean; label: string; description: string; disabled?: boolean; onChange: (value: boolean) => void }> = ({ checked, label, description, disabled, onChange }) => (
  <label className={`admin-switch is-wide ${disabled ? 'is-disabled' : ''}`}>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span><strong>{label}</strong><small>{description}</small></span>
  </label>
);

const FormError: React.FC<{ text: string }> = ({ text }) => (
  <p className="admin-form-error" role="alert"><CircleAlert size={16} /><span>{text}</span></p>
);
