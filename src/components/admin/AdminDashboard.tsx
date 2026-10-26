import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, FolderTree, LayoutDashboard, LogOut, Package, Plus, Search, ShoppingBag, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { CatalogueCategory } from '../../types';
import type { ApiProduct } from '../../services/catalogService';
import type { OrderResponse } from '../../services/orderService';
import {
  createCategory, createProduct, getAdminCategories, getAdminIdentity, getAdminOrders,
  getAdminProducts, setCategoryActive, setProductActive, updateCategory, updateOrderStatus, updateProduct,
  uploadProductImages, type CategoryInput, type ProductInput
} from '../../services/adminService';
import '../../styles/admin.css';

type Section = 'overview' | 'products' | 'categories' | 'inventory' | 'orders' | 'customers';

const emptyProduct = (): ProductInput => ({
  name: '', slug: '', sku: '', description: '', price: 0, imageUrl: '', weightGrams: null,
  stockQuantity: 0, isActive: true, categoryIds: []
});
const emptyCategory = (): CategoryInput => ({
  name: '', slug: '', parentId: null, categoryType: 'collection', description: '', imageUrl: '', displayOrder: 0, isActive: true
});

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const money = (value: number | string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));
const flatten = (categories: CatalogueCategory[], depth = 0): Array<CatalogueCategory & { depth: number }> =>
  categories.flatMap((category) => [{ ...category, depth }, ...flatten(category.children, depth + 1)]);

export const AdminDashboard: React.FC = () => {
  const { status, signOut } = useAuth();
  const [identity, setIdentity] = useState<{ fullName: string; email: string } | null>(null);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [accessError, setAccessError] = useState('');
  const [section, setSection] = useState<Section>('overview');
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productTotal, setProductTotal] = useState<number | null>(null);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<CatalogueCategory | null | undefined>(undefined);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      setAccessState('denied');
      setAccessError('Sign in with an administrator account to access the atelier dashboard.');
      return;
    }
    let cancelled = false;
    getAdminIdentity()
      .then((admin) => { if (!cancelled) { setIdentity(admin); setAccessState('allowed'); } })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAccessState('denied');
          setAccessError(error instanceof Error ? error.message : 'Unable to verify administrative access.');
        }
      });
    return () => { cancelled = true; };
  }, [status]);

  const reload = async (query = search) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [productResult, categoryResult, orderResult] = await Promise.all([
        getAdminProducts(query), getAdminCategories(), getAdminOrders()
      ]);
      setProducts(productResult.products);
      setProductTotal(productResult.total);
      setCategories(categoryResult);
      setOrders(orderResult.content);
      setOrderTotal(orderResult.totalElements ?? orderResult.page?.totalElements ?? orderResult.content.length);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (accessState === 'allowed') void reload(''); }, [accessState]);

  const lowStock = useMemo(() => products.filter((product) => product.stockQuantity <= 3), [products]);

  if (accessState === 'checking') return <DashboardShell><div className="admin-loading">Verifying secure dashboard access…</div></DashboardShell>;
  if (accessState === 'denied') return <DashboardShell><AccessDenied message={accessError} /></DashboardShell>;

  const navigate = (next: Section) => { setSection(next); setEditingProduct(undefined); setEditingCategory(undefined); };
  return (
    <DashboardShell>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <a className="admin-brand" href="/">SILVORA <em>Admin</em></a>
          <p className="admin-user">{identity?.fullName || identity?.email}</p>
          <nav className="admin-nav" aria-label="Admin navigation">
            <NavButton active={section === 'overview'} icon={<LayoutDashboard size={17} />} onClick={() => navigate('overview')}>Overview</NavButton>
            <NavButton active={section === 'products'} icon={<Package size={17} />} onClick={() => navigate('products')}>Products</NavButton>
            <NavButton active={section === 'categories'} icon={<FolderTree size={17} />} onClick={() => navigate('categories')}>Categories</NavButton>
            <NavButton active={section === 'inventory'} icon={<Boxes size={17} />} onClick={() => navigate('inventory')}>Inventory</NavButton>
            <NavButton active={section === 'orders'} icon={<ShoppingBag size={17} />} onClick={() => navigate('orders')}>Orders</NavButton>
            <NavButton active={section === 'customers'} icon={<Users size={17} />} onClick={() => navigate('customers')}>Customers</NavButton>
          </nav>
          <div className="admin-sidebar-footer">
            <a href="/" className="admin-text-link">View storefront</a>
            <button className="admin-text-link" onClick={() => void signOut().then(() => window.location.assign('/')).catch(() => undefined)}><LogOut size={15} /> Sign out</button>
          </div>
        </aside>
        <main className="admin-main">
          <header className="admin-header">
            <div><span className="admin-eyebrow">SILVORA ATELIER</span><h1>{section[0].toUpperCase() + section.slice(1)}</h1></div>
            <button className="admin-refresh" onClick={() => void reload()} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</button>
          </header>
          {loadError && <div className="admin-alert" role="alert">{loadError}</div>}
          {section === 'overview' && <Overview productTotal={productTotal} orderTotal={orderTotal} lowStock={lowStock} onProducts={() => navigate('products')} />}
          {section === 'products' && <ProductManager products={products} categories={categories} search={search} onSearch={setSearch} onLoad={() => void reload(search)} onEdit={setEditingProduct} />}
          {section === 'categories' && <CategoryManager categories={categories} onEdit={setEditingCategory} onChanged={() => void reload()} />}
          {section === 'inventory' && <Inventory products={products} onEdit={setEditingProduct} />}
          {section === 'orders' && <OrderManager orders={orders} onChanged={() => void reload()} />}
          {section === 'customers' && <UnavailableCustomers />}
        </main>
      </div>
      {editingProduct !== undefined && <ProductForm product={editingProduct} categories={categories} onClose={() => setEditingProduct(undefined)} onSaved={() => { setEditingProduct(undefined); void reload(search); }} />}
      {editingCategory !== undefined && <CategoryForm category={editingCategory} categories={categories} onClose={() => setEditingCategory(undefined)} onSaved={() => { setEditingCategory(undefined); void reload(); }} />}
    </DashboardShell>
  );
};

const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="admin-page">{children}</div>;
const NavButton: React.FC<{ active: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }> = ({ active, icon, onClick, children }) => <button className={`admin-nav-button ${active ? 'is-active' : ''}`} onClick={onClick}>{icon}{children}</button>;
const AccessDenied: React.FC<{ message: string }> = ({ message }) => <div className="admin-access"><span className="admin-eyebrow">RESTRICTED</span><h1>Atelier access required.</h1><p>{message}</p><a href="/" className="admin-primary">Return to storefront</a></div>;

const Overview: React.FC<{ productTotal: number | null; orderTotal: number | null; lowStock: ApiProduct[]; onProducts: () => void }> = ({ productTotal, orderTotal, lowStock, onProducts }) => <>
  <div className="admin-stats">
    <Stat title="Total products" value={productTotal === null ? '—' : String(productTotal)} note="Live catalogue data" />
    <Stat title="Total orders" value={orderTotal === null ? '—' : String(orderTotal)} note="Live order records" />
    <Stat title="Registered customers" value="—" note="Customer management API pending" />
    <Stat title="Low-stock alerts" value={String(lowStock.length)} note="Three pieces or fewer" />
  </div>
  <section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">INVENTORY ATTENTION</span><h2>Low stock</h2></div><button className="admin-text-link" onClick={onProducts}>Manage products</button></div>
    {lowStock.length === 0 ? <EmptyState text="No low-stock products were returned by the backend." /> : <div className="admin-list">{lowStock.map((product) => <div className="admin-list-row" key={product.id}><span>{product.name}</span><strong>{product.stockQuantity} left</strong></div>)}</div>}
  </section>
</>;
const Stat: React.FC<{ title: string; value: string; note: string }> = ({ title, value, note }) => <div className="admin-stat"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>;
const EmptyState: React.FC<{ text: string }> = ({ text }) => <p className="admin-empty">{text}</p>;

const ProductManager: React.FC<{ products: ApiProduct[]; categories: CatalogueCategory[]; search: string; onSearch: (value: string) => void; onLoad: () => void; onEdit: (product: ApiProduct | null) => void }> = ({ products, search, onSearch, onLoad, onEdit }) => <>
  <div className="admin-toolbar"><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onLoad(); }} placeholder="Search products or SKU" /></label><div className="admin-toolbar-actions"><button className="admin-secondary" onClick={onLoad}>Search</button><button className="admin-primary" onClick={() => onEdit(null)}><Plus size={16} /> Add product</button></div></div>
  <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>{products.map((product) => <ProductRow key={product.id} product={product} onEdit={() => onEdit(product)} onChanged={onLoad} />)}</tbody></table>{products.length === 0 && <EmptyState text="No products match this search. Add your first product to publish it to the catalogue." />}</section>
</>;
const ProductRow: React.FC<{ product: ApiProduct; onEdit: () => void; onChanged: () => void }> = ({ product, onEdit, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const toggle = async () => { setBusy(true); try { await setProductActive(product.id, !product.isActive); onChanged(); } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to update product status.'); } finally { setBusy(false); } };
  return <tr><td className="admin-product-cell">{product.images[0]?.imageUrl || product.imageUrl ? <img src={product.images[0]?.imageUrl || product.imageUrl || ''} alt="" /> : <span className="admin-image-placeholder">SL</span>}<span><strong>{product.name}</strong><small>{product.slug}</small></span></td><td>{product.sku || '—'}</td><td>{money(product.price)}</td><td className={product.stockQuantity <= 3 ? 'admin-low-stock' : ''}>{product.stockQuantity}</td><td><span className={`admin-status ${product.isActive ? 'is-active' : ''}`}>{product.isActive ? 'Active' : 'Inactive'}</span></td><td className="admin-actions"><button className="admin-text-link" onClick={onEdit}>Edit</button><button className="admin-text-link" onClick={() => void toggle()} disabled={busy}>{product.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>;
};

const ProductForm: React.FC<{ product: ApiProduct | null; categories: CatalogueCategory[]; onClose: () => void; onSaved: () => void }> = ({ product, categories, onClose, onSaved }) => {
  const [form, setForm] = useState<ProductInput>(() => product ? ({ name: product.name, slug: product.slug, sku: product.sku || '', description: product.description || '', price: Number(product.price), imageUrl: product.imageUrl || '', weightGrams: product.weightGrams === null ? null : Number(product.weightGrams), stockQuantity: product.stockQuantity, isActive: product.isActive, categoryIds: [...product.categoryIds] }) : emptyProduct());
  const [files, setFiles] = useState<File[]>([]); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const flatCategories = flatten(categories);
  const update = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { const saved = product ? await updateProduct(product.id, form) : await createProduct(form); if (files.length) await uploadProductImages(saved.id, files); onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save product.'); } finally { setSaving(false); } };
  return <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose}><form className="admin-form" onSubmit={submit}><FormField label="Product name"><input required value={form.name} onChange={(e) => { update('name', e.target.value); if (!product) update('slug', slugify(e.target.value)); }} /></FormField><FormField label="URL slug"><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} /></FormField><FormField label="SKU"><input value={form.sku} onChange={(e) => update('sku', e.target.value)} /></FormField><FormField label="Price (INR)"><input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => update('price', Number(e.target.value))} /></FormField><FormField label="Weight (grams)"><input min="0" step="0.001" type="number" value={form.weightGrams ?? ''} onChange={(e) => update('weightGrams', e.target.value === '' ? null : Number(e.target.value))} /></FormField><FormField label="Stock quantity"><input required min="0" type="number" value={form.stockQuantity} onChange={(e) => update('stockQuantity', Number(e.target.value))} /></FormField><FormField label="Description" wide><textarea value={form.description} onChange={(e) => update('description', e.target.value)} /></FormField><FormField label="Fallback image URL" wide><input type="url" value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="Optional public image URL" /></FormField><FormField label="Upload product images" wide><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(Array.from(e.target.files || []))} /><small>JPEG, PNG, or WebP; uploaded securely through the admin API.</small></FormField><fieldset className="admin-fieldset"><legend>Categories</legend><div className="admin-category-checks">{flatCategories.map((category) => <label key={category.id} style={{ paddingLeft: `${category.depth * 14}px` }}><input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => update('categoryIds', form.categoryIds.includes(category.id) ? form.categoryIds.filter((id) => id !== category.id) : [...form.categoryIds, category.id])} /> {category.name}</label>)}</div></fieldset><label className="admin-switch"><input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} /> Publish product</label>{error && <p className="admin-form-error">{error}</p>}<div className="admin-form-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button></div></form></Modal>;
};

const CategoryManager: React.FC<{ categories: CatalogueCategory[]; onEdit: (category: CatalogueCategory | null) => void; onChanged: () => void }> = ({ categories, onEdit, onChanged }) => <><div className="admin-toolbar"><p className="admin-muted">Organize audience, collection, and item categories from the live taxonomy.</p><button className="admin-primary" onClick={() => onEdit(null)}><Plus size={16} /> Add category</button></div><section className="admin-panel"><div className="admin-list">{flatten(categories).map((category) => <CategoryRow key={category.id} category={category} onEdit={() => onEdit(category)} onChanged={onChanged} />)}</div>{categories.length === 0 && <EmptyState text="No categories are currently available." />}</section></>;
const CategoryRow: React.FC<{ category: CatalogueCategory & { depth: number }; onEdit: () => void; onChanged: () => void }> = ({ category, onEdit, onChanged }) => { const [busy, setBusy] = useState(false); const toggle = async () => { setBusy(true); try { await setCategoryActive(category.id, !category.isActive); onChanged(); } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to update category.'); } finally { setBusy(false); } }; return <div className="admin-list-row"><span style={{ paddingLeft: `${category.depth * 18}px` }}><strong>{category.name}</strong> <small>{category.categoryType}</small></span><span className="admin-actions"><span className={`admin-status ${category.isActive ? 'is-active' : ''}`}>{category.isActive ? 'Active' : 'Inactive'}</span><button className="admin-text-link" onClick={onEdit}>Edit</button><button className="admin-text-link" disabled={busy} onClick={() => void toggle()}>{category.isActive ? 'Deactivate' : 'Activate'}</button></span></div>; };

const CategoryForm: React.FC<{ category: CatalogueCategory | null; categories: CatalogueCategory[]; onClose: () => void; onSaved: () => void }> = ({ category, categories, onClose, onSaved }) => { const [form, setForm] = useState<CategoryInput>(() => category ? ({ name: category.name, slug: category.slug, parentId: category.parentId, categoryType: category.categoryType === 'landing_page' ? 'collection' : category.categoryType, description: category.description, imageUrl: category.imageUrl || '', displayOrder: category.displayOrder, isActive: category.isActive }) : emptyCategory()); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const options = flatten(categories).filter((item) => item.id !== category?.id); const update = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) => setForm((current) => ({ ...current, [key]: value })); const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { if (category) await updateCategory(category.id, form); else await createCategory(form); onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save category.'); } finally { setSaving(false); } }; return <Modal title={category ? 'Edit category' : 'Add category'} onClose={onClose}><form className="admin-form" onSubmit={submit}><FormField label="Name"><input required value={form.name} onChange={(e) => { update('name', e.target.value); if (!category) update('slug', slugify(e.target.value)); }} /></FormField><FormField label="URL slug"><input required value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} /></FormField><FormField label="Parent category"><select value={form.parentId || ''} onChange={(e) => update('parentId', e.target.value || null)}><option value="">No parent (root)</option>{options.map((item) => <option key={item.id} value={item.id}>{'— '.repeat(item.depth)}{item.name}</option>)}</select></FormField><FormField label="Category type"><select value={form.categoryType} onChange={(e) => update('categoryType', e.target.value as CategoryInput['categoryType'])}><option value="audience">Audience</option><option value="collection">Collection</option><option value="items">Items</option></select></FormField><FormField label="Display order"><input min="0" type="number" value={form.displayOrder} onChange={(e) => update('displayOrder', Number(e.target.value))} /></FormField><FormField label="Image URL"><input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} /></FormField><FormField label="Description" wide><textarea value={form.description} onChange={(e) => update('description', e.target.value)} /></FormField><label className="admin-switch"><input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} /> Publish category</label>{error && <p className="admin-form-error">{error}</p>}<div className="admin-form-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={saving}>{saving ? 'Saving…' : 'Save category'}</button></div></form></Modal>; };

const Inventory: React.FC<{ products: ApiProduct[]; onEdit: (product: ApiProduct) => void }> = ({ products, onEdit }) => <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Stock on hand</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.sku || '—'}</td><td className={product.stockQuantity <= 3 ? 'admin-low-stock' : ''}>{product.stockQuantity}</td><td><button className="admin-text-link" onClick={() => onEdit(product)}>Update stock</button></td></tr>)}</tbody></table>{products.length === 0 && <EmptyState text="No inventory records have been returned by the backend." />}</section>;
const OrderManager: React.FC<{ orders: OrderResponse[]; onChanged: () => void }> = ({ orders, onChanged }) => <section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>{orders.map((order) => <OrderRow key={order.id} order={order} onChanged={onChanged} />)}</tbody></table>{orders.length === 0 && <EmptyState text="No order records have been returned by the backend." />}</section>;
const OrderRow: React.FC<{ order: OrderResponse; onChanged: () => void }> = ({ order, onChanged }) => { const [status, setStatus] = useState(order.status); const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus); const [busy, setBusy] = useState(false); const save = async () => { setBusy(true); try { await updateOrderStatus(order.id, status, paymentStatus); onChanged(); } catch (error) { window.alert(error instanceof Error ? error.message : 'Unable to update order.'); } finally { setBusy(false); } }; return <tr><td><strong>{order.orderNumber}</strong></td><td>{order.shippingFullName || '—'}<small>{order.shippingEmail}</small></td><td>{order.items?.map((item) => `${item.productName} ×${item.quantity}`).join(', ') || '—'}</td><td>{money(order.totalAmount)}</td><td><select value={status} onChange={(e) => setStatus(e.target.value)}><option>PENDING_PAYMENT</option><option>CONFIRMED</option><option>PROCESSING</option><option>SHIPPED</option><option>DELIVERED</option><option>CANCELLED</option></select><select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}><option>PENDING</option><option>PAID</option><option>FAILED</option><option>REFUNDED</option></select></td><td><button className="admin-text-link" disabled={busy || (status === order.status && paymentStatus === order.paymentStatus)} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button></td></tr>; };
const UnavailableCustomers: React.FC = () => <section className="admin-panel"><span className="admin-eyebrow">NEXT BACKEND INCREMENT</span><h2>Customer management is not available yet.</h2><p className="admin-muted">No customer data is shown here because the backend does not yet expose a protected administrator customer directory. This page will use that API once it exists.</p></section>;
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="admin-modal-backdrop" role="presentation"><section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X size={20} /></button></header>{children}</section></div>;
const FormField: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => <label className={`admin-form-field ${wide ? 'is-wide' : ''}`}><span>{label}</span>{children}</label>;
