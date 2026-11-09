import type { Product } from '../types';
import { formatRupees } from './pricing';
import { routePath } from './routes';

/**
 * The shop's WhatsApp Business number, set once as VITE_WHATSAPP_NUMBER on the hosting platform:
 * country code then number, for example 919876543210 (spaces and + are ignored). It is public, since
 * customers see it in WhatsApp. While it is empty, the WhatsApp button is hidden.
 */
const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

/** A wa.me link that opens a chat with the shop with this message already typed in. Null when no number is set. */
export function whatsappLink(message: string): string | null {
  if (WHATSAPP_NUMBER.length < 10) return null;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** A wa.me link that opens a chat with the shop, with the piece's details already typed in. Null when no number is set. */
export function productEnquiryLink(product: Product): string | null {
  const pageUrl = `${window.location.origin}${routePath({ view: 'product', productKey: product.slug || product.id })}`;
  const lines = [
    "Hello SILVORA, I'd like to enquire about this piece:",
    '',
    `Product: ${product.name}`,
    `Price: ${formatRupees(product.price)}`,
    `Material: ${product.material}`,
    product.weightGrams ? `Weight: ${product.weightGrams}g` : null,
    `Link: ${pageUrl}`,
  ].filter((line): line is string => line !== null);
  return whatsappLink(lines.join('\n'));
}
