/**
 * Black-Scholes Options Pricing Engine
 * Computes option prices and all Greeks
 */

// Standard normal CDF using Horner's method approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * x)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1 + sign * y)
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export interface BSInputs {
  S: number   // Spot price
  K: number   // Strike price
  T: number   // Time to expiry (in years)
  r: number   // Risk-free rate (decimal)
  sigma: number // Volatility (decimal)
  optionType: 'call' | 'put'
}

export interface BSResult {
  price: number
  delta: number
  gamma: number
  theta: number  // per day
  vega: number   // per 1% change in vol
  rho: number    // per 1% change in rate
  d1: number
  d2: number
  impliedVol?: number
}

export function blackScholes(inputs: BSInputs): BSResult {
  const { S, K, T, r, sigma, optionType } = inputs

  if (T <= 0) {
    const intrinsic = optionType === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)
    return { price: intrinsic, delta: intrinsic > 0 ? (optionType === 'call' ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, rho: 0, d1: 0, d2: 0 }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT

  const Nd1 = normalCDF(d1), Nd2 = normalCDF(d2)
  const Nnd1 = normalCDF(-d1), Nnd2 = normalCDF(-d2)
  const nd1 = normalPDF(d1)

  let price: number, delta: number, rho: number

  if (optionType === 'call') {
    price = S * Nd1 - K * Math.exp(-r * T) * Nd2
    delta = Nd1
    rho = K * T * Math.exp(-r * T) * Nd2 / 100
  } else {
    price = K * Math.exp(-r * T) * Nnd2 - S * Nnd1
    delta = Nd1 - 1
    rho = -K * T * Math.exp(-r * T) * Nnd2 / 100
  }

  const gamma = nd1 / (S * sigma * sqrtT)
  const theta = (-(S * nd1 * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * (optionType === 'call' ? Nd2 : -Nnd2)) / 365
  const vega = S * nd1 * sqrtT / 100

  return { price, delta, gamma, theta, vega, rho, d1, d2 }
}

// Newton-Raphson IV calculation
export function impliedVolatility(
  marketPrice: number, S: number, K: number, T: number, r: number, optionType: 'call' | 'put'
): number | null {
  if (T <= 0 || marketPrice <= 0) return null
  let sigma = 0.3
  for (let i = 0; i < 100; i++) {
    const result = blackScholes({ S, K, T, r, sigma, optionType })
    const diff = result.price - marketPrice
    if (Math.abs(diff) < 0.0001) return sigma
    const vega = result.vega * 100 // back to absolute
    if (Math.abs(vega) < 1e-10) return null
    sigma -= diff / vega
    if (sigma <= 0) sigma = 0.001
    if (sigma > 5) return null
  }
  return sigma
}

export function payoffAtExpiry(S: number, K: number, premium: number, optionType: 'call' | 'put', direction: 'long' | 'short'): number {
  let intrinsic: number
  if (optionType === 'call') intrinsic = Math.max(S - K, 0)
  else intrinsic = Math.max(K - S, 0)
  const pnl = direction === 'long' ? intrinsic - premium : premium - intrinsic
  return pnl
}
