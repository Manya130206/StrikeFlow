import type { MarketData, OptionChainItem } from './types'

// ─── Indices ────────────────────────────────────────────────────────────────
const INDEX_DATA: Omit<MarketData, 'futures' | 'change' | 'changePct'>[] = [
  { symbol: "NIFTY",      spot: 24350, iv: 13.2, ivRank: 42, volume: 1234567, oi: 45678901, lotSize: 25,  tickSize: 50,  category: 'index' },
  { symbol: "BANKNIFTY",  spot: 51250, iv: 16.8, ivRank: 58, volume:  987654, oi: 23456789, lotSize: 15,  tickSize: 100, category: 'index' },
  { symbol: "SENSEX",     spot: 80250, iv: 12.9, ivRank: 38, volume:  456789, oi: 12345678, lotSize: 10,  tickSize: 100, category: 'index' },
  { symbol: "FINNIFTY",   spot: 23450, iv: 15.4, ivRank: 51, volume:  234567, oi:  9876543, lotSize: 40,  tickSize: 50,  category: 'index' },
  { symbol: "MIDCPNIFTY", spot: 12340, iv: 18.2, ivRank: 62, volume:  123456, oi:  5678901, lotSize: 75,  tickSize: 25,  category: 'index' },
]

// ─── NSE F&O Stocks ─────────────────────────────────────────────────────────
const STOCK_DATA: Omit<MarketData, 'futures' | 'change' | 'changePct'>[] = [
  { symbol: "RELIANCE",   spot:  2987, iv: 22.4, ivRank: 55, volume:  987654, oi:  8765432, lotSize: 250,  tickSize: 5,  category: 'stock', sector: 'Energy'      },
  { symbol: "TCS",        spot:  3845, iv: 18.6, ivRank: 40, volume:  456789, oi:  5432198, lotSize: 150,  tickSize: 5,  category: 'stock', sector: 'IT'          },
  { symbol: "INFY",       spot:  1654, iv: 21.3, ivRank: 48, volume:  654321, oi:  6543210, lotSize: 300,  tickSize: 5,  category: 'stock', sector: 'IT'          },
  { symbol: "HDFCBANK",   spot:  1723, iv: 19.8, ivRank: 44, volume:  789012, oi:  7890123, lotSize: 550,  tickSize: 5,  category: 'stock', sector: 'Banking'     },
  { symbol: "ICICIBANK",  spot:  1298, iv: 23.1, ivRank: 60, volume:  567890, oi:  6789012, lotSize: 700,  tickSize: 5,  category: 'stock', sector: 'Banking'     },
  { symbol: "SBIN",       spot:   834, iv: 25.6, ivRank: 68, volume: 1234567, oi:  9876543, lotSize: 1500, tickSize: 5,  category: 'stock', sector: 'Banking'     },
  { symbol: "AXISBANK",   spot:  1187, iv: 24.2, ivRank: 63, volume:  432109, oi:  5432109, lotSize: 1200, tickSize: 5,  category: 'stock', sector: 'Banking'     },
  { symbol: "WIPRO",      spot:   567, iv: 26.8, ivRank: 70, volume:  345678, oi:  4321098, lotSize: 1500, tickSize: 5,  category: 'stock', sector: 'IT'          },
  { symbol: "TATAMOTORS", spot:   987, iv: 34.2, ivRank: 78, volume:  876543, oi:  8765432, lotSize: 1400, tickSize: 5,  category: 'stock', sector: 'Auto'        },
  { symbol: "TATASTEEL",  spot:   178, iv: 38.5, ivRank: 82, volume: 2345678, oi: 12345678, lotSize: 5500, tickSize: 5,  category: 'stock', sector: 'Metal'       },
  { symbol: "HINDALCO",   spot:   698, iv: 31.4, ivRank: 74, volume:  654321, oi:  6543210, lotSize: 1100, tickSize: 5,  category: 'stock', sector: 'Metal'       },
  { symbol: "BAJFINANCE", spot:  7234, iv: 28.9, ivRank: 65, volume:  234567, oi:  2345678, lotSize: 125,  tickSize: 5,  category: 'stock', sector: 'Finance'     },
  { symbol: "KOTAKBANK",  spot:  1876, iv: 20.4, ivRank: 46, volume:  345678, oi:  4567890, lotSize: 400,  tickSize: 5,  category: 'stock', sector: 'Banking'     },
  { symbol: "LT",         spot:  3654, iv: 22.8, ivRank: 52, volume:  234567, oi:  3456789, lotSize: 150,  tickSize: 5,  category: 'stock', sector: 'Infra'       },
  { symbol: "MARUTI",     spot: 12450, iv: 19.6, ivRank: 43, volume:   98765, oi:  1234567, lotSize: 100,  tickSize: 5,  category: 'stock', sector: 'Auto'        },
  { symbol: "SUNPHARMA",  spot:  1789, iv: 24.7, ivRank: 59, volume:  345678, oi:  3456789, lotSize: 700,  tickSize: 5,  category: 'stock', sector: 'Pharma'      },
  { symbol: "DRREDDY",    spot:  6234, iv: 27.3, ivRank: 64, volume:  123456, oi:  1234567, lotSize: 125,  tickSize: 5,  category: 'stock', sector: 'Pharma'      },
  { symbol: "ONGC",       spot:   287, iv: 29.4, ivRank: 67, volume:  876543, oi:  8765432, lotSize: 3850, tickSize: 5,  category: 'stock', sector: 'Energy'      },
  { symbol: "POWERGRID",  spot:   356, iv: 21.8, ivRank: 49, volume:  456789, oi:  4567890, lotSize: 3300, tickSize: 5,  category: 'stock', sector: 'Power'       },
  { symbol: "ADANIENT",   spot:  2876, iv: 42.3, ivRank: 88, volume:  567890, oi:  5678901, lotSize: 500,  tickSize: 5,  category: 'stock', sector: 'Conglomerate'},
]

// ─── Build full MarketData with futures premium ──────────────────────────────
function buildMarketData(
  base: Omit<MarketData, 'futures' | 'change' | 'changePct'>
): MarketData {

  const seed =
    base.symbol
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);

  const changePct =
    ((seed % 100) - 50) / 100;

  const futuresPremium =
    base.spot * 0.0015;

  return {
    ...base,
    change: Number(
      ((base.spot * changePct) / 100).toFixed(2)
    ),
    changePct: Number(
      changePct.toFixed(2)
    ),
    futures: Number(
      (base.spot + futuresPremium).toFixed(2)
    ),
  };
}

export const MOCK_MARKET_DATA: MarketData[] = [
  ...INDEX_DATA.map(buildMarketData),
  ...STOCK_DATA.map(buildMarketData),
]

// ─── Option Chain ────────────────────────────────────────────────────────────
export function generateOptionChain(spot: number, dte: number, tickSize = 50, iv = 0.15): OptionChainItem[] {
  const baseStrike = Math.round(spot / tickSize) * tickSize
  const strikes = Array.from({ length: 21 }, (_, i) => baseStrike + (i - 10) * tickSize)
  const r = 0.065
  const T = dte / 365
  const sqrtT = Math.sqrt(T)

  const N = (x: number) => {
    const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911
    const sign=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2)
    const t=1/(1+p*x)
    const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x)
    return 0.5*(1+sign*y)
  }

  return strikes.map(K => {
    const moneyness = Math.log(K / spot)
    const skewedIV = iv * (1 + 0.15 * (-moneyness) + 0.05 * moneyness * moneyness)
    const d1 = (Math.log(spot/K) + (r + 0.5*skewedIV**2)*T) / (skewedIV*sqrtT)
    const d2 = d1 - skewedIV * sqrtT
    const disc = Math.exp(-r*T)
    const callPrice = spot*N(d1) - K*disc*N(d2)
    const putPrice  = K*disc*N(-d2) - spot*N(-d1)
    const spread = Math.max(0.5, callPrice * 0.025)
    const atm = Math.abs(K - spot) < tickSize * 0.6
    const oiMult = atm ? 3 : Math.max(0.3, 1 - Math.abs(K-spot)/spot*5)

    return {
      strike: K,
      callBid: Math.max(0, callPrice-spread/2), callAsk: callPrice+spread/2,
      callOI:     Math.round(oiMult*(50000+Math.random()*100000)),
      callVolume: Math.round(oiMult*(10000+Math.random()*30000)),
      callIV: skewedIV*100, callDelta: N(d1),
      putBid: Math.max(0, putPrice-spread/2), putAsk: putPrice+spread/2,
      putOI:     Math.round(oiMult*(60000+Math.random()*120000)),
      putVolume: Math.round(oiMult*(12000+Math.random()*35000)),
      putIV: (skewedIV+0.005)*100, putDelta: N(d1)-1,
      isATM: atm,
    }
  })
}

export function generateIVSurface(spot: number) {
  const expiries = [7, 14, 21, 30, 45, 60, 90, 180]
  const strikePcts = [-20,-15,-10,-5,-2,0,2,5,10,15,20]
  const result: { strike: number; expiry: string; iv: number; dte: number }[] = []
  expiries.forEach(dte => {
    strikePcts.forEach(pct => {
      const strike = Math.round(spot*(1+pct/100)/50)*50
      const term = 0.13 + 0.02*Math.exp(-dte/60)
      const skew = 0.15*(-pct/100) + 0.05*(pct/100)**2
      result.push({ strike, expiry: `${dte}d`, iv: Math.max(5, (term+skew)*100), dte })
    })
  })
  return result
}

export function generatePriceHistory(
  spot: number,
  days = 90
) {
  const data: {
    date: string;
    close: number;
    volume: number;
  }[] = [];

  let price = spot * 0.85;

  const now = new Date();

  for (let i = days; i >= 0; i--) {

    const d = new Date(now);

    d.setDate(
      d.getDate() - i
    );

    if (
      d.getDay() === 0 ||
      d.getDay() === 6
    )
      continue;

    const movement =
      Math.sin(i / 6) * 0.004;

    price =
      price *
      (1 + movement);

    data.push({
      date:
        d
          .toISOString()
          .split("T")[0],

      close:
        Math.round(
          price * 100
        ) / 100,

      volume:
        500000 +
        Math.floor(
          Math.abs(
            Math.sin(i)
          ) * 1000000
        ),
    });
  }

  return data;
}
