import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// 1 Troy Ounce = 31.1034768 Grams (Bullion Standard)
const TROY_OUNCE_IN_GRAMS = 31.1034768

interface CachedSilverData {
  success: boolean
  source: string
  provider: string
  currency: string
  pricePerGram: number
  pricePer10Gram: number
  pricePerTroyOz: number
  exchangeRate: number
  updatedAt: string
  direction: 'up' | 'down' | 'neutral'
  changePercent: number
  changeAmount: number
  isStale: boolean
  staleNotice?: string
}

function silverRateApiPlugin(): Plugin {
  let cachedPayload: CachedSilverData | null = null
  let lastFetchTime = 0
  let previousPricePerGram: number | null = null
  const CACHE_TTL_MS = 60 * 1000 // 60 seconds server-side cache

  const fetchLiveSilver = async (): Promise<CachedSilverData> => {
    // 1. Primary Market Data Provider: gold-api.com (Precious Metals Spot XAG/INR)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 7000)
      const res = await fetch('https://api.gold-api.com/price/XAG/INR', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'SILVORA-Atelier/1.0' },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = (await res.json()) as Record<string, any>
        const pricePerOz = Number(data?.price)
        if (!isNaN(pricePerOz) && pricePerOz > 0) {
          const pricePerGram = pricePerOz / TROY_OUNCE_IN_GRAMS
          const pricePer10Gram = pricePerGram * 10

          let direction: 'up' | 'down' | 'neutral' = 'neutral'
          let changeAmount = 0
          let changePercent = 0

          if (previousPricePerGram !== null) {
            changeAmount = pricePerGram - previousPricePerGram
            changePercent = (changeAmount / previousPricePerGram) * 100
            if (changeAmount > 0.01) direction = 'up'
            else if (changeAmount < -0.01) direction = 'down'
          }

          previousPricePerGram = pricePerGram

          return {
            success: true,
            source: 'International Bullion Spot (XAG/INR)',
            provider: 'gold-api.com',
            currency: 'INR',
            pricePerGram: Number(pricePerGram.toFixed(2)),
            pricePer10Gram: Number(pricePer10Gram.toFixed(2)),
            pricePerTroyOz: Number(pricePerOz.toFixed(2)),
            exchangeRate: Number(data.exchangeRate || 1),
            updatedAt: data.updatedAt || new Date().toISOString(),
            direction,
            changePercent: Number(changePercent.toFixed(2)),
            changeAmount: Number(changeAmount.toFixed(2)),
            isStale: false
          }
        }
      }
    } catch (e) {
      console.warn('[SILVORA API] Primary provider gold-api failed, attempting secondary source...', e)
    }

    // 2. Secondary Market Data Provider: Yahoo Finance COMEX Silver (SI=F) + USD/INR (INR=X)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 7000)
      const [silverRes, forexRes] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=5m&range=1d', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: controller.signal
        }),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/INR=X?interval=5m&range=1d', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: controller.signal
        })
      ])
      clearTimeout(timeout)

      if (silverRes.ok && forexRes.ok) {
        const silverData = (await silverRes.json()) as Record<string, any>
        const forexData = (await forexRes.json()) as Record<string, any>

        const silverMeta = silverData?.chart?.result?.[0]?.meta
        const forexMeta = forexData?.chart?.result?.[0]?.meta

        const silverPriceUsd = silverMeta?.regularMarketPrice
        const usdInrRate = forexMeta?.regularMarketPrice

        if (silverPriceUsd && usdInrRate) {
          const pricePerOzInr = silverPriceUsd * usdInrRate
          const pricePerGram = pricePerOzInr / TROY_OUNCE_IN_GRAMS
          const pricePer10Gram = pricePerGram * 10
          const marketChangePercent = silverMeta.regularMarketChangePercent || 0

          let direction: 'up' | 'down' | 'neutral' = 'neutral'
          if (marketChangePercent > 0.05) direction = 'up'
          else if (marketChangePercent < -0.05) direction = 'down'

          const updateDate = silverMeta.regularMarketTime
            ? new Date(silverMeta.regularMarketTime * 1000).toISOString()
            : new Date().toISOString()

          return {
            success: true,
            source: 'COMEX Silver Futures & Spot Forex (SI=F / USDINR)',
            provider: 'Yahoo Finance COMEX',
            currency: 'INR',
            pricePerGram: Number(pricePerGram.toFixed(2)),
            pricePer10Gram: Number(pricePer10Gram.toFixed(2)),
            pricePerTroyOz: Number(pricePerOzInr.toFixed(2)),
            exchangeRate: Number(usdInrRate.toFixed(4)),
            updatedAt: updateDate,
            direction,
            changePercent: Number(marketChangePercent.toFixed(2)),
            changeAmount: Number(((pricePerGram * marketChangePercent) / 100).toFixed(2)),
            isStale: false
          }
        }
      }
    } catch (e) {
      console.warn('[SILVORA API] Secondary market provider failed:', e)
    }

    throw new Error('All silver rate data providers unavailable')
  }

  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0]
    if (url === '/api/silver-rate') {
      const now = Date.now()
      if (cachedPayload && now - lastFetchTime < CACHE_TTL_MS) {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'public, max-age=60')
        res.end(JSON.stringify(cachedPayload))
        return
      }

      try {
        const fresh = await fetchLiveSilver()
        cachedPayload = fresh
        lastFetchTime = now
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'public, max-age=60')
        res.end(JSON.stringify(fresh))
      } catch {
        if (cachedPayload) {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ...cachedPayload,
              isStale: true,
              staleNotice: 'Market feed delayed; displaying last verified quote'
            })
          )
        } else {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              success: false,
              error: 'Silver rate currently unavailable'
            })
          )
        }
      }
      return
    }
    next()
  }

  return {
    name: 'silver-rate-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), silverRateApiPlugin()],
})

