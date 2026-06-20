export type OptionType = 'call' | 'put'
export type Direction = 'long' | 'short'
export type InstrumentType = 'option' | 'futures' | 'equity'

export interface OptionLeg {
  id: string
  symbol: string
  strike: number
  expiry: string
  optionType: OptionType
  direction: Direction
  lots: number
  premium: number
  lotSize: number
  instrumentType?: InstrumentType  // defaults to 'option'
  futuresPrice?: number            // for futures legs
}

export interface Strategy {
  id: string
  name: string
  description: string
  legs: OptionLeg[]
  createdAt: string
  tags: string[]
}

export interface MarketData {
  symbol: string
  spot: number
  futures?: number   // near-month futures price
  change: number
  changePct: number
  iv: number
  ivRank: number
  volume: number
  oi: number
  lotSize: number
  tickSize: number
  category: 'index' | 'stock'
  sector?: string
}

export interface OptionChainItem {
  strike: number
  callBid: number
  callAsk: number
  callOI: number
  callVolume: number
  callIV: number
  callDelta: number
  putBid: number
  putAsk: number
  putOI: number
  putVolume: number
  putIV: number
  putDelta: number
  isATM: boolean
}

export interface GreeksSnapshot {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

export interface PnLPoint {
  spot: number
  pnl: number
  pnlAtExpiry: number
}

export interface IVSurface {
  strike: number
  expiry: string
  iv: number
  dte: number
}

// Preset strategies (now includes futures-based)
export const PRESET_STRATEGIES = [
  { name: "Bull Call Spread",    description: "Buy lower call, sell higher call. Defined risk, capped upside.",              tags: ["bullish",  "debit",  "spread"]    },
  { name: "Bear Put Spread",     description: "Buy higher put, sell lower put. Defined risk downside play.",                 tags: ["bearish",  "debit",  "spread"]    },
  { name: "Iron Condor",         description: "Sell OTM call spread + sell OTM put spread. Profit in range.",               tags: ["neutral",  "credit", "range"]     },
  { name: "Straddle",            description: "Buy ATM call + ATM put. Profit from big move either way.",                   tags: ["neutral",  "debit",  "volatility"] },
  { name: "Strangle",            description: "Buy OTM call + OTM put. Cheaper straddle, needs bigger move.",               tags: ["neutral",  "debit",  "volatility"] },
  { name: "Butterfly",           description: "Buy ITM + OTM, sell 2× ATM. Profits if stock pins at ATM.",                 tags: ["neutral",  "debit",  "income"]    },
  { name: "Covered Call",        description: "Long stock + short call. Income on existing position.",                      tags: ["bullish",  "credit", "income"]    },
  { name: "Cash Secured Put",    description: "Sell put, hold cash as collateral. Income + potential acquisition.",         tags: ["bullish",  "credit", "income"]    },
  { name: "Synthetic Long",      description: "Buy ATM call + sell ATM put. Mimics long futures position.",                 tags: ["bullish",  "debit",  "synthetic"]  },
  { name: "Synthetic Short",     description: "Sell ATM call + buy ATM put. Mimics short futures position.",               tags: ["bearish",  "credit", "synthetic"]  },
  { name: "Futures + Put Hedge", description: "Long futures + buy OTM put. Protected upside with downside floor.",         tags: ["bullish",  "debit",  "futures"]   },
] as const
