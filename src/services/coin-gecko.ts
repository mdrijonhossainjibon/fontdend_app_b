const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  usdt: 'tether',
  trx: 'tron',
  xrp: 'ripple',
  ada: 'cardano',
  sol: 'solana',
  matic: 'matic-network',
  dot: 'polkadot',
  doge: 'dogecoin',
  shib: 'shiba-inu',
  bnb: 'binancecoin',
  dai: 'dai',
  usdc: 'usd-coin',
  busd: 'binance-usd',
  wbtc: 'wrapped-bitcoin',
  link: 'chainlink',
  uni: 'uniswap',
  atom: 'cosmos',
  etc: 'ethereum-classic',
  ltc: 'litecoin',
  bch: 'bitcoin-cash',
  xlm: 'stellar',
  vet: 'vechain',
  xtz: 'tezos',
  eos: 'eos',
  xmr: 'monero',
  neo: 'neo',
  icp: 'internet-computer',
  algo: 'algorand',
  apt: 'aptos',
  arb: 'arbitrum',
  avax: 'avalanche-2',
  cro: 'crypto-com-chain',
  fil: 'filecoin',
  flow: 'flow',
  ftm: 'fantom',
  gala: 'gala',
  hbar: 'hedera-hashgraph',
  inj: 'injective',
  Near: 'near',
  op: 'optimism',
  rose: 'oasis-network',
  sand: 'the-sandbox',
  sei: 'sei-network',
  sui: 'sui',
  theta: 'theta-token',
  ton: 'the-open-network',
  tribe: 'tribe-2',
  wemix: 'wemix-token',
  wow: 'wownero',
  zec: 'zcash',
  zil: 'zilliqa',
  zrx: '0x',
}

interface CacheEntry {
  prices: Record<string, number>
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 60_000 // 60 seconds

/**
 * Extract ticker from a crypto name string.
 * e.g. "Bitcoin" → "btc", "USDT (TRC20)" → "usdt", "Ethereum" → "eth"
 */
function extractTicker(name: string): string | null {
  const lower = name.toLowerCase().trim()

  // Direct match in our map
  for (const [ticker, cgId] of Object.entries(COINGECKO_IDS)) {
    if (lower === ticker || lower === cgId || lower === cgId.replace(/-/g, ' ')) {
      return ticker
    }
  }

  // Try first 3-4 chars as ticker
  const short = lower.slice(0, 4).replace(/[^a-z0-9]/g, '')
  for (const ticker of Object.keys(COINGECKO_IDS)) {
    if (ticker.toLowerCase() === short || ticker.toLowerCase() === short.slice(0, 3)) {
      return ticker
    }
  }

  return null
}

/**
 * Fetch USD prices for given tickers from CoinGecko.
 * Uses /simple/price endpoint with batch of up to 50 IDs.
 * Results are cached in-memory for 60 seconds.
 */
export async function fetchPrices(tickers: string[]): Promise<Record<string, number>> {
  if (!tickers.length) return {}

  // Check cache
  const now = Date.now()
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.prices
  }

  // Collect unique CoinGecko IDs
  const uniqueTickers = [...new Set(tickers.map(t => t.toLowerCase()))]
  const cgIds: string[] = []
  const tickerToId: Record<string, string> = {}

  for (const ticker of uniqueTickers) {
    const id = COINGECKO_IDS[ticker]
    if (id) {
      cgIds.push(id)
      tickerToId[ticker] = id
    }
  }

  if (!cgIds.length) return {}

  try {
    const ids = cgIds.join(',')
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) {
      console.warn(`CoinGecko price API returned ${res.status}`)
      return {}
    }

    const data = (await res.json()) as Record<string, { usd?: number }>
    const prices: Record<string, number> = {}
    for (const [ticker, cgId] of Object.entries(tickerToId)) {
      const price = data[cgId]?.usd
      if (typeof price === 'number') {
        prices[ticker] = price
      }
    }

    cache = { prices, timestamp: Date.now() }
    return prices
  } catch (err) {
    console.warn('CoinGecko price fetch failed:', err)
    return {}
  }
}

/**
 * Quick helper: get USD price for a single ticker.
 */
export async function getPrice(ticker: string): Promise<number | null> {
  const prices = await fetchPrices([ticker])
  return prices[ticker.toLowerCase()] ?? null
}
