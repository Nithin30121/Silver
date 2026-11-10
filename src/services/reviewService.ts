// SILVORA | Product reviews
// Anyone can read a product's approved reviews. A signed-in customer can write one review per product and edit
// it; the shop approves each one before it shows. The server works out the rating and the "Verified Purchase"
// label, so nothing here can change them.

import { customerRequest } from './customerApi';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN';

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  date: string;
  verifiedPurchase: boolean;
}

/** averageRating and reviewCount cover approved reviews only; ratingCounts holds how many have 1 to 5 stars. */
export interface ProductReviewPage {
  averageRating: number | null;
  reviewCount: number;
  ratingCounts: number[];
  reviews: PublicReview[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MyReview {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  status: ReviewStatus;
  date: string;
  verifiedPurchase: boolean;
}

export const REVIEW_PAGE_SIZE = 5;
export const MAX_REVIEW_LENGTH = 2000;

export function getProductReviews(productId: string, page = 0): Promise<ProductReviewPage> {
  const search = new URLSearchParams({ page: String(page), size: String(REVIEW_PAGE_SIZE) });
  return customerRequest<ProductReviewPage>(`/products/${encodeURIComponent(productId)}/reviews?${search}`,
    'We could not load the reviews just now.', { signIn: 'optional' });
}

/** The signed-in customer's own review of the product, or null when they haven't written one. */
export async function getMyReview(productId: string): Promise<MyReview | null> {
  const review = await customerRequest<MyReview | undefined>(`/me/reviews/${encodeURIComponent(productId)}`,
    'We could not load your review just now.');
  return review ?? null;
}

/** Writes the customer's review, or replaces their existing one. Either way it waits for the shop's approval. */
export function saveMyReview(productId: string, review: { rating: number; comment: string }): Promise<MyReview> {
  return customerRequest<MyReview>(`/me/reviews/${encodeURIComponent(productId)}`,
    'We could not save your review. Please try again.', { method: 'PUT', body: review });
}
