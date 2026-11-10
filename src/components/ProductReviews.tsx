import React, { useEffect, useId, useState } from 'react';
import { BadgeCheck, Pencil, Star } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/orderFormat';
import { CustomerApiError } from '../services/customerApi';
import {
  getMyReview, getProductReviews, MAX_REVIEW_LENGTH, saveMyReview,
  type MyReview, type ProductReviewPage, type PublicReview, type ReviewStatus
} from '../services/reviewService';

const STATUS_TEXT: Record<ReviewStatus, string> = {
  PENDING: 'Awaiting approval',
  APPROVED: 'Published',
  HIDDEN: 'Not shown in the shop',
};

/** Five stars filled to `value` (fractions allowed); the label is what screen readers hear. */
const Stars: React.FC<{ value: number; size?: number; label?: string }> = ({ value, size = 16, label }) => {
  const stars = Array.from({ length: 5 }, (_, index) => <Star key={index} size={size} strokeWidth={1.5} aria-hidden="true" />);
  return (
    <span className="review-stars" role="img" aria-label={label ?? `Rated ${value} out of 5`}>
      <span className="review-stars-base">{stars}</span>
      <span className="review-stars-fill" style={{ width: `${Math.max(0, Math.min(5, value)) * 20}%` }}>
        {Array.from({ length: 5 }, (_, index) => <Star key={index} size={size} strokeWidth={1.5} fill="currentColor" aria-hidden="true" />)}
      </span>
    </span>
  );
};

const VerifiedLabel: React.FC = () => (
  <span className="review-verified"><BadgeCheck size={14} aria-hidden="true" /> Verified Purchase</span>
);

const ReviewItem: React.FC<{ review: PublicReview }> = ({ review }) => (
  <li className="product-review">
    <Stars value={review.rating} />
    <p className="product-review-comment">{review.comment}</p>
    <div className="product-review-meta">
      <span className="product-review-name">{review.reviewerName}</span>
      <time dateTime={review.date}>{formatDate(review.date)}</time>
      {review.verifiedPurchase && <VerifiedLabel />}
    </div>
  </li>
);

/** The star picker: five radio buttons, so arrow keys and screen readers work as with any choice. */
const StarInput: React.FC<{ value: number; onChange: (value: number) => void; error?: string }> = ({ value, onChange, error }) => {
  const name = useId();
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  return (
    <fieldset className="review-star-input" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="contact-label">Your rating *</legend>
      <div className="review-star-options" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((stars) => (
          <label key={stars} className={`review-star-option ${stars <= shown ? 'is-on' : ''}`} onMouseEnter={() => setHovered(stars)}>
            <input type="radio" name={name} value={stars} checked={value === stars} onChange={() => onChange(stars)} required />
            <Star size={26} strokeWidth={1.4} fill={stars <= shown ? 'currentColor' : 'none'} aria-hidden="true" />
            <span className="visually-hidden">{stars === 1 ? '1 star' : `${stars} stars`}</span>
          </label>
        ))}
      </div>
      {error && <p id={`${name}-error`} className="contact-error">{error}</p>}
    </fieldset>
  );
};

const ReviewForm: React.FC<{ productId: string; existing: MyReview | null; onSaved: (review: MyReview) => void; onCancel: () => void }> = ({ productId, existing, onSaved, onCancel }) => {
  const commentId = useId();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (rating < 1) problems.rating = 'Please choose a star rating.';
    if (!comment.trim()) problems.comment = 'Please write a few words about the piece.';
    setFields(problems);
    setError('');
    if (Object.keys(problems).length) return;
    setSaving(true);
    try {
      onSaved(await saveMyReview(productId, { rating, comment: comment.trim() }));
    } catch (cause) {
      if (cause instanceof CustomerApiError) {
        setFields(cause.fields);
        setError(Object.keys(cause.fields).length ? '' : cause.message);
      } else {
        setError('We could not save your review. Please try again.');
      }
      setSaving(false);
    }
  };

  return (
    <form className="review-form" onSubmit={submit} noValidate>
      <h3 className="review-form-title">{existing ? 'Edit your review' : 'Write a review'}</h3>
      <StarInput value={rating} onChange={(value) => { setRating(value); setFields((current) => ({ ...current, rating: '' })); }} error={fields.rating || undefined} />
      <div className="contact-field">
        <label className="contact-label" htmlFor={commentId}>Your review *</label>
        <textarea id={commentId} className="contact-input" rows={5} maxLength={MAX_REVIEW_LENGTH} value={comment}
          aria-invalid={fields.comment ? true : undefined} aria-describedby={fields.comment ? `${commentId}-error` : `${commentId}-count`}
          placeholder="How does it look and feel? How is the finish, the fit, the weight?"
          onChange={(event) => { setComment(event.target.value); setFields((current) => ({ ...current, comment: '' })); }} />
        {fields.comment
          ? <p id={`${commentId}-error`} className="contact-error">{fields.comment}</p>
          : <p id={`${commentId}-count`} className="review-form-count">{comment.length} / {MAX_REVIEW_LENGTH}</p>}
      </div>
      <p className="review-form-note">Your first name and last initial appear with your review. Every review is checked by the SILVORA team before it is published{existing ? ', including edits' : ''}.</p>
      {error && <p className="contact-form-error" role="alert">{error}</p>}
      <div className="review-form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sending…' : existing ? 'Update review' : 'Submit review'}</button>
        <button type="button" className="btn-text" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
};

/** The customer reviews section at the bottom of a product page. Mount it with key={productId}. */
export const ProductReviews: React.FC<{ productId: string; productName: string }> = ({ productId, productName }) => {
  const { navigateTo } = useShop();
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  const [page, setPage] = useState<ProductReviewPage | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // undefined until it has loaded (or while signed out), null when the customer hasn't written one.
  const [mine, setMine] = useState<MyReview | null | undefined>(undefined);
  const [writing, setWriting] = useState(false);
  const [thanks, setThanks] = useState('');

  useEffect(() => {
    let cancelled = false;
    getProductReviews(productId, 0)
      .then((first) => { if (!cancelled) { setPage(first); setReviews(first.reviews); setLoadError(''); } })
      .catch((cause: unknown) => { if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'We could not load the reviews just now.'); });
    return () => { cancelled = true; };
  }, [productId, reloadKey]);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getMyReview(productId)
      .then((review) => { if (!cancelled) setMine(review); })
      .catch(() => { if (!cancelled) setMine(null); });
    return () => { cancelled = true; };
  }, [productId, signedIn]);

  const loadMore = async () => {
    if (!page) return;
    setLoadingMore(true);
    try {
      const next = await getProductReviews(productId, page.page + 1);
      setPage(next);
      // A review approved meanwhile can shift the pages; skip any already shown.
      setReviews((current) => [...current, ...next.reviews.filter((review) => !current.some((shown) => shown.id === review.id))]);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'We could not load more reviews.');
    } finally {
      setLoadingMore(false);
    }
  };

  const saved = (review: MyReview) => {
    setMine(review);
    setWriting(false);
    setThanks('Thank you. Your review will appear here once the SILVORA team has approved it.');
    // An edited review leaves the page until it is approved again, so the list and rating are fetched afresh.
    setReloadKey((key) => key + 1);
  };

  const count = page?.reviewCount ?? 0;
  const ownReview = signedIn && mine ? mine : null;
  const action = !signedIn ? (
    status === 'loading' ? null : (
      <button type="button" className="btn-secondary review-action" onClick={() => navigateTo('login')}>Sign in to write a review</button>
    )
  ) : mine === undefined || writing ? null : ownReview ? (
    <button type="button" className="btn-secondary review-action" onClick={() => { setThanks(''); setWriting(true); }}>
      <Pencil size={14} aria-hidden="true" /> Edit your review
    </button>
  ) : (
    <button type="button" className="btn-primary review-action" onClick={() => { setThanks(''); setWriting(true); }}>Write a review</button>
  );

  return (
    <section className="product-reviews" id="reviews" aria-labelledby="product-reviews-title">
      <header className="product-reviews-head">
        <span className="eyebrow">CUSTOMER REVIEWS</span>
        <h2 id="product-reviews-title" className="headline-editorial">What Clients <em>Say.</em></h2>
      </header>

      {!page && !loadError ? (
        <p className="product-reviews-loading" role="status">Loading reviews…</p>
      ) : !page ? (
        <div className="product-reviews-empty">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary review-action" onClick={() => { setLoadError(''); setReloadKey((key) => key + 1); }}>Try again</button>
        </div>
      ) : (
        <div className={`product-reviews-layout ${count === 0 ? 'is-empty' : ''}`}>
          {count > 0 && page.averageRating !== null && (
            <aside className="product-reviews-summary" aria-label={`Rating summary for ${productName}`}>
              <p className="product-reviews-average">{page.averageRating.toFixed(1)}<span>/ 5</span></p>
              <Stars value={page.averageRating} size={18} label={`Average rating ${page.averageRating.toFixed(1)} out of 5`} />
              <p className="product-reviews-based">Based on {count} {count === 1 ? 'review' : 'reviews'}</p>
              <ul className="product-reviews-bars">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const total = page.ratingCounts[stars - 1] ?? 0;
                  return (
                    <li key={stars} className="product-reviews-bar">
                      <span>{stars} <Star size={11} fill="currentColor" aria-hidden="true" /><span className="visually-hidden"> stars</span></span>
                      <span className="product-reviews-bar-track" aria-hidden="true">
                        <span className="product-reviews-bar-fill" style={{ width: `${count ? (total / count) * 100 : 0}%` }} />
                      </span>
                      <span>{total}</span>
                    </li>
                  );
                })}
              </ul>
              {action}
            </aside>
          )}

          <div className="product-reviews-main">
            {thanks && <p className="review-thanks" role="status">{thanks}</p>}
            {ownReview && !writing && (
              <div className="review-mine">
                <div className="review-mine-head">
                  <span className="contact-label">Your review</span>
                  <span className={`review-status is-${ownReview.status.toLowerCase()}`}>{STATUS_TEXT[ownReview.status]}</span>
                </div>
                <Stars value={ownReview.rating} />
                <p className="product-review-comment">{ownReview.comment}</p>
                <div className="product-review-meta">
                  <span className="product-review-name">{ownReview.reviewerName}</span>
                  <time dateTime={ownReview.date}>{formatDate(ownReview.date)}</time>
                  {ownReview.verifiedPurchase && <VerifiedLabel />}
                </div>
                {count === 0 && action}
              </div>
            )}
            {writing && <ReviewForm productId={productId} existing={ownReview} onSaved={saved} onCancel={() => setWriting(false)} />}

            {count === 0 ? (
              !ownReview && !writing && (
                <div className="product-reviews-empty">
                  <Stars value={0} size={20} label="No ratings yet" />
                  <h3>No reviews yet</h3>
                  <p>Own this piece? Be the first to share how it looks and feels.</p>
                  {action}
                </div>
              )
            ) : (
              <>
                <ul className="product-review-list">
                  {reviews.map((review) => <ReviewItem key={review.id} review={review} />)}
                </ul>
                {loadError && <p className="contact-form-error" role="alert">{loadError}</p>}
                {page.hasMore && (
                  <button type="button" className="btn-secondary product-reviews-more" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : `Load more reviews (${count - reviews.length} more)`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
