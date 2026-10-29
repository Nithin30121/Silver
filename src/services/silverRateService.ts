// SILVORA | Silver rate for the header rate bar
// The rate is the one the owner sets in the admin dashboard. It is kept in the shop_settings row,
// which the storefront reads straight from the database, so it shows even while the API server sleeps.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface SilverRateData {
  success: boolean;
  pricePerGram: number;
  pricePer10Gram: number;
  /** When the owner set the rate. */
  setAt: string;
  /** "10:30 IST" */
  formattedTimeIST: string;
  /** "29 Oct" */
  formattedDate: string;
  /** Whether it was set today, in India time. */
  isToday: boolean;
  direction: 'up' | 'down' | 'neutral';
  changePercent: number;
  changeAmount: number;
  /** True when the database couldn't be reached and the last rate this browser saw is shown. */
  isStale: boolean;
  staleNotice?: string;
}

const STORAGE_KEY = 'silvora_silver_rate';

const round2 = (value: number) => Math.round(value * 100) / 100;
const indiaDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);

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

const formatISTDate = (dateInput: string) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(new Date(dateInput));

export function getCachedSilverRate(): SilverRateData | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return parsed && typeof (parsed as SilverRateData).pricePerGram === 'number' ? parsed as SilverRateData : null;
  } catch {
    return null;
  }
}

/** Movement since the last rate this browser saw. */
function trendSince(pricePerGram: number, cached: SilverRateData | null): Pick<SilverRateData, 'direction' | 'changeAmount' | 'changePercent'> {
  if (!cached?.pricePerGram) return { direction: 'neutral', changeAmount: 0, changePercent: 0 };
  const changeAmount = Number((pricePerGram - cached.pricePerGram).toFixed(2));
  const changePercent = Number(((changeAmount / cached.pricePerGram) * 100).toFixed(2));
  return { direction: changeAmount > 0.01 ? 'up' : changeAmount < -0.01 ? 'down' : 'neutral', changeAmount, changePercent };
}

/** The owner's rate from the database: null when none is set, undefined when it can't be reached. */
async function fetchOwnerRate(): Promise<{ ratePerGram: number; rateSetAt: string } | null | undefined> {
  if (!supabase) return undefined;
  try {
    // shop_settings is newer than the generated database types, so this one query is untyped.
    const { data, error } = await (supabase as unknown as SupabaseClient).from('shop_settings')
      .select('silver_rate_per_gram, silver_rate_set_at').eq('id', 1).maybeSingle();
    if (error) return undefined;
    if (!data?.silver_rate_per_gram || !data.silver_rate_set_at) return null;
    return { ratePerGram: Number(data.silver_rate_per_gram), rateSetAt: data.silver_rate_set_at };
  } catch {
    return undefined;
  }
}

/** The rate to show, or null when the owner hasn't set one (the rate bar is then hidden). */
export async function fetchLiveSilverRate(): Promise<SilverRateData | null> {
  const cached = getCachedSilverRate();
  const owner = await fetchOwnerRate();
  if (owner === undefined) {
    return cached ? { ...cached, isStale: true, staleNotice: 'Showing the last rate this page received; it will refresh when the connection returns.' } : null;
  }
  if (owner === null) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
    return null;
  }

  const payload: SilverRateData = {
    success: true,
    pricePerGram: round2(owner.ratePerGram),
    pricePer10Gram: round2(owner.ratePerGram * 10),
    setAt: owner.rateSetAt,
    formattedTimeIST: formatISTTime(owner.rateSetAt),
    formattedDate: formatISTDate(owner.rateSetAt),
    isToday: indiaDay(new Date(owner.rateSetAt)) === indiaDay(new Date()),
    ...(cached?.setAt === owner.rateSetAt ? { direction: cached.direction, changeAmount: cached.changeAmount, changePercent: cached.changePercent }
      : trendSince(owner.ratePerGram, cached)),
    isStale: false,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* storage blocked */ }
  return payload;
}
