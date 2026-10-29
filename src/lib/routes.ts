// SILVORA | Page addresses
// Turns the shop's page state into a web address and back, so pages survive a refresh, the browser's
// back button works, and emails can link straight to a page (for example an order in My Account).
// /admin is a separate app (see App.tsx) and is not handled here.

import type { AccountTab, ViewType } from '../types';

export interface Route {
  view: ViewType;
  /** A product's slug (or id) from /product/<key>. */
  productKey?: string;
  /** Category slugs from /collection/<root>/<child>, resolved once the catalogue loads. */
  categoryPath?: string[];
  accountTab?: AccountTab;
  /** An order in My Account, or the order a contact message is about. */
  orderNumber?: string;
}

const PATHS: Partial<Record<ViewType, string>> = {
  home: '/',
  men: '/men',
  women: '/women',
  story: '/our-story',
  care: '/care',
  shipping: '/shipping',
  contact: '/contact',
  faq: '/faq',
  privacy: '/privacy',
  terms: '/terms',
  login: '/sign-in',
  signup: '/create-account',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  admin: '/admin',
};
const VIEWS_BY_PATH = new Map(Object.entries(PATHS).map(([view, path]) => [path, view as ViewType]));
const ACCOUNT_TABS: readonly AccountTab[] = ['orders', 'addresses', 'profile'];

const segment = (value: string) => encodeURIComponent(value);

/** The address for a page. Unknown details fall back to the page's plain address. */
export function routePath(route: Route): string {
  switch (route.view) {
    case 'product':
      return route.productKey ? `/product/${segment(route.productKey)}` : '/collection';
    case 'collection':
      return ['/collection', ...(route.categoryPath ?? []).map(segment)].join('/');
    case 'account':
      if (route.orderNumber) return `/account/orders/${segment(route.orderNumber)}`;
      return route.accountTab && route.accountTab !== 'orders' ? `/account/${route.accountTab}` : '/account';
    case 'contact':
      return route.orderNumber ? `/contact?order=${segment(route.orderNumber)}` : '/contact';
    default:
      return PATHS[route.view] ?? '/';
  }
}

/** Reads a web address; anything unrecognised opens the home page. */
export function parseRoute(pathname: string, search: string): Route {
  const parts = pathname.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
  const [first, second, third] = parts;
  if (first === 'product' && second) return { view: 'product', productKey: second };
  if (first === 'collection') return { view: 'collection', categoryPath: parts.slice(1) };
  if (first === 'account') {
    if (second === 'orders' && third) return { view: 'account', accountTab: 'orders', orderNumber: third };
    const tab = ACCOUNT_TABS.find((candidate) => candidate === second);
    return { view: 'account', accountTab: tab ?? 'orders' };
  }
  if (first === 'contact') {
    const order = new URLSearchParams(search).get('order')?.trim();
    return { view: 'contact', ...(order ? { orderNumber: order.slice(0, 40) } : {}) };
  }
  return { view: VIEWS_BY_PATH.get(`/${parts.join('/')}`.replace(/^\/$/, '/')) ?? 'home' };
}

/** The browser tab title for a page. */
export function pageTitle(view: ViewType, productName?: string): string {
  const titles: Partial<Record<ViewType, string>> = {
    collection: 'Collection', men: 'Men', women: 'Women', story: 'Our Story', care: 'Jewellery Care',
    shipping: 'Shipping & Returns', contact: 'Contact Us', faq: 'Questions & Answers', privacy: 'Privacy', terms: 'Terms',
    login: 'Sign In', signup: 'Create an Account', 'forgot-password': 'Reset Your Password',
    'reset-password': 'Choose a New Password', account: 'My Account',
  };
  const title = view === 'product' ? productName : titles[view];
  return title ? `${title} | SILVORA` : 'SILVORA | Fine Sterling Silver Ornaments';
}
