import React, { useState, useEffect, useRef } from 'react';
import {
  fetchLiveSilverRate,
  getCachedSilverRate,
  formatINR,
  type SilverRateData
} from '../services/silverRateService';
import { RefreshCw, Info, ChevronUp, ChevronDown, Check } from 'lucide-react';

export const LiveSilverRate: React.FC = () => {
  const [data, setData] = useState<SilverRateData | null>(getCachedSilverRate());
  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadRate = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const result = await fetchLiveSilverRate();
      setData(result);
    } catch {
      // error handled inside service
    } finally {
      setIsLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  useEffect(() => {
    loadRate();

    // Auto-refresh every 2 minutes (120,000 ms) when tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadRate();
      }
    }, 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadRate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close popover when clicking outside or Esc key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };

    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popoverOpen]);

  // If no data and not loading, show unavailable
  if (!isLoading && (!data || !data.success || data.error || data.pricePerGram <= 0)) {
    return (
      <div className="silver-rate-pill silver-rate-pill-unavailable" title="Live bullion feed temporarily offline">
        <span className="silver-rate-sparkle-dot" />
        <span className="silver-rate-label">Silver rate currently unavailable</span>
      </div>
    );
  }

  const priceGram = data ? formatINR(data.pricePerGram) : '—';
  const price10Gram = data ? formatINR(data.pricePer10Gram) : '—';
  const updatedTime = data?.formattedTimeIST || '12:00 IST';
  const direction = data?.direction || 'neutral';
  const isStale = Boolean(data?.isStale);

  return (
    <div className="silver-rate-wrapper" ref={popoverRef}>
      <button
        type="button"
        className={`silver-rate-pill ${isStale ? 'is-stale' : ''}`}
        onClick={() => setPopoverOpen(!popoverOpen)}
        aria-expanded={popoverOpen}
        aria-haspopup="dialog"
        aria-label={`Live Silver Rate: ${priceGram} per gram, updated at ${updatedTime}. Tap for market breakdown.`}
        title="Verified Market Spot Rate • Tap for Atelier Valuation Details"
      >
        {/* Minimal Precious Metal Icon / Pulse */}
        <span className="silver-rate-icon-box" aria-hidden="true">
          <svg
            className="silver-bullion-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 14l8-10 8 10-8 6z" />
            <path d="M4 14h16" />
            <path d="M12 4v16" />
          </svg>
          <span className={`silver-rate-live-dot ${isStale ? 'is-stale' : 'is-live'}`} />
        </span>

        {/* Desktop Detailed Presentation */}
        <span className="silver-rate-desktop-view">
          <span className="silver-rate-label">LIVE SILVER RATE</span>
          <span className="silver-rate-separator" aria-hidden="true">/</span>
          <span className="silver-rate-price-main">
            {priceGram} <span className="silver-rate-unit">/ g</span>
          </span>

          <span className="silver-rate-10g-badge" title="Price per 10 grams">
            ({price10Gram} / 10g)
          </span>

          {/* Refined Trend Indicator (Restrained Silver) */}
          {direction === 'up' && (
            <span className="silver-rate-trend trend-up" title={`Price increased since last check (+${data?.changePercent || 0}%)`}>
              <ChevronUp size={12} strokeWidth={2.5} />
              {data?.changePercent ? `${Math.abs(data.changePercent)}%` : ''}
            </span>
          )}
          {direction === 'down' && (
            <span className="silver-rate-trend trend-down" title={`Price decreased since last check (${data?.changePercent || 0}%)`}>
              <ChevronDown size={12} strokeWidth={2.5} />
              {data?.changePercent ? `${Math.abs(data.changePercent)}%` : ''}
            </span>
          )}

          <span className="silver-rate-time">
            {isStale ? `${updatedTime} (Delayed)` : `Updated: ${updatedTime}`}
          </span>
        </span>

        {/* Mobile Compact Presentation */}
        <span className="silver-rate-mobile-view">
          <span className="silver-rate-mobile-label">SILVER</span>
          <span className="silver-rate-mobile-price">{priceGram}/g</span>
          {direction === 'up' && <ChevronUp size={11} strokeWidth={2.5} className="mobile-trend-icon trend-up" />}
          {direction === 'down' && <ChevronDown size={11} strokeWidth={2.5} className="mobile-trend-icon trend-down" />}
          {isStale && <span className="mobile-stale-tag" title="Delayed quote">!</span>}
        </span>
      </button>

      {/* Luxury Atelier Rate Breakdown Popover */}
      {popoverOpen && (
        <div
          className="silver-rate-popover"
          role="dialog"
          aria-modal="false"
          aria-label="SILVORA Live Silver Rate Details"
        >
          <div className="silver-popover-header">
            <div>
              <span className="popover-eyebrow">SILVORA ATELIER</span>
              <h4 className="popover-title">Live Bullion Benchmark</h4>
            </div>
            <button
              type="button"
              className={`popover-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                loadRate(true);
              }}
              title="Refresh quote now"
              aria-label="Refresh silver rate"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="silver-popover-body">
            <div className="popover-rate-hero">
              <span className="popover-hero-label">Certified 99.9% Fine Silver Spot</span>
              <div className="popover-hero-price">
                {priceGram} <span className="popover-hero-unit">per gram</span>
              </div>
              <div className="popover-hero-sub">
                Official Valuation Basis for 925 Sterling Silver Pieces
              </div>
            </div>

            <div className="popover-matrix">
              <div className="popover-row">
                <span className="row-key">Rate per 10 Grams</span>
                <span className="row-val">{price10Gram}</span>
              </div>
              <div className="popover-row">
                <span className="row-key">Rate per 100 Grams</span>
                <span className="row-val">{data ? formatINR(data.pricePerGram * 100) : '—'}</span>
              </div>
              <div className="popover-row">
                <span className="row-key">Rate per Kilogram (1 kg)</span>
                <span className="row-val">{data ? formatINR(data.pricePerGram * 1000) : '—'}</span>
              </div>
              <div className="popover-row">
                <span className="row-key">International Spot (XAG/USD)</span>
                <span className="row-val">
                  {data && data.exchangeRate
                    ? `$${(data.pricePerTroyOz / data.exchangeRate).toFixed(2)} / oz`
                    : '—'}
                </span>
              </div>
              <div className="popover-row">
                <span className="row-key">USD/INR Forex Conversion</span>
                <span className="row-val">
                  {data?.exchangeRate ? `₹${data.exchangeRate.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>

            {isStale && (
              <div className="popover-stale-banner">
                <Info size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  {data?.staleNotice || 'Displaying last verified market rate. Feed automatically re-synchronizes when exchange reopens.'}
                </span>
              </div>
            )}

            <div className="popover-footer">
              <div className="popover-source-info">
                <span>Source: {data?.provider || 'International Spot Feed'}</span>
                <span>Timestamp: {updatedTime}</span>
              </div>
              <div className="popover-hallmark-badge">
                <Check size={11} style={{ color: 'var(--color-silver-accent)' }} />
                <span>BIS 925 Hallmark Standard</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
