// SILVESTO LUXE | Live Silver Bullion Rate Service
// Official Bullion Standard: 1 Troy Ounce = 31.1034768 Grams

export interface SilverRateData {
  success: boolean;
  source: string;
  provider: string;
  currency: string;
  pricePerGram: number;
  pricePer10Gram: number;
  pricePerTroyOz: number;
  exchangeRate: number;
  updatedAt: string;
  formattedTimeIST: string;
  direction: 'up' | 'down' | 'neutral';
  changePercent: number;
  changeAmount: number;
  isStale: boolean;
  staleNotice?: string;
  error?: string;
}

const TROY_OUNCE_IN_GRAMS = 31.1034768;
const STORAGE_KEY = 'silvesto_luxe_silver_rate_cache';

export function formatISTTime(dateInput: string | number | Date): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return (
      new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date) + ' IST'
    );
  } catch {
    return '';
  }
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

export function getCachedSilverRate(): SilverRateData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.pricePerGram === 'number') {
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

export async function fetchLiveSilverRate(): Promise<SilverRateData> {
  const cached = getCachedSilverRate();

  // Step 1: Try backend endpoint /api/silver-rate
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/silver-rate', {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.pricePerGram === 'number') {
        const payload: SilverRateData = {
          success: true,
          source: data.source || 'International Bullion Spot (XAG/INR)',
          provider: data.provider || 'Live Market Data',
          currency: 'INR',
          pricePerGram: data.pricePerGram,
          pricePer10Gram: data.pricePer10Gram || Number((data.pricePerGram * 10).toFixed(2)),
          pricePerTroyOz: data.pricePerTroyOz,
          exchangeRate: data.exchangeRate,
          updatedAt: data.updatedAt,
          formattedTimeIST: formatISTTime(data.updatedAt),
          direction: data.direction || (cached ? (data.pricePerGram > cached.pricePerGram ? 'up' : data.pricePerGram < cached.pricePerGram ? 'down' : 'neutral') : 'neutral'),
          changePercent: data.changePercent || 0,
          changeAmount: data.changeAmount || 0,
          isStale: Boolean(data.isStale),
          staleNotice: data.staleNotice
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // Ignore storage quota
        }

        return payload;
      }
    }
  } catch {
    // Backend fetch failed or in static mode, fallback to direct client fetch
  }

  // Step 2: Direct Client Fetch fallback (gold-api.com CORS-friendly public spot price)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://api.gold-api.com/price/XAG/INR', {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const pricePerOz = Number(data.price);
      if (!isNaN(pricePerOz) && pricePerOz > 0) {
        const pricePerGram = Number((pricePerOz / TROY_OUNCE_IN_GRAMS).toFixed(2));
        const pricePer10Gram = Number((pricePerGram * 10).toFixed(2));

        let direction: 'up' | 'down' | 'neutral' = 'neutral';
        let changeAmount = 0;
        let changePercent = 0;

        if (cached && cached.pricePerGram) {
          changeAmount = Number((pricePerGram - cached.pricePerGram).toFixed(2));
          changePercent = Number(((changeAmount / cached.pricePerGram) * 100).toFixed(2));
          if (changeAmount > 0.01) direction = 'up';
          else if (changeAmount < -0.01) direction = 'down';
        }

        const payload: SilverRateData = {
          success: true,
          source: 'International Bullion Spot (XAG/INR)',
          provider: 'gold-api.com',
          currency: 'INR',
          pricePerGram,
          pricePer10Gram,
          pricePerTroyOz: pricePerOz,
          exchangeRate: Number(data.exchangeRate || 1),
          updatedAt: data.updatedAt || new Date().toISOString(),
          formattedTimeIST: formatISTTime(data.updatedAt || new Date()),
          direction,
          changePercent,
          changeAmount,
          isStale: false
        };

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // Ignore
        }

        return payload;
      }
    }
  } catch {
    // Both network fetches failed
  }

  // Step 3: Return cached valid data with discreet stale notice
  if (cached && typeof cached.pricePerGram === 'number') {
    return {
      ...cached,
      isStale: true,
      staleNotice: 'Offline / Market connection delayed; displaying last verified quote'
    };
  }

  // Step 4: No valid price exists
  return {
    success: false,
    source: '',
    provider: '',
    currency: 'INR',
    pricePerGram: 0,
    pricePer10Gram: 0,
    pricePerTroyOz: 0,
    exchangeRate: 0,
    updatedAt: '',
    formattedTimeIST: '',
    direction: 'neutral',
    changePercent: 0,
    changeAmount: 0,
    isStale: true,
    error: 'Silver rate currently unavailable'
  };
}
