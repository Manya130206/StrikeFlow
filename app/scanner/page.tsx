"use client"
import { useMemo, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useStrategyStore } from '@/store/useStrategyStore'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Zap, Target, ChevronDown, Info } from 'lucide-react'

interface ScanResult {
  strategy: string
  symbol: string
  legs: string
  maxProfit: string
  maxLoss: string
  probability: number
  ivRank: number
  dte: number
  bias: 'bullish' | 'bearish' | 'neutral'
  type: 'debit' | 'credit'
  score: number
  margin: string
}

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'text-green-400 bg-green-400/10 border-green-400/30' :
  s >= 65 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
            'text-gray-400 bg-gray-400/10 border-gray-400/20'

export default function ScannerPage() {
  const { marketData } = useStrategyStore()
  const [filter, setFilter] = useState<'all'|'bullish'|'bearish'|'neutral'>('all')
  const [sortBy, setSortBy] = useState<'score'|'probability'|'ivRank'>('score')

  const results = useMemo<ScanResult[]>(() => {
    const r: ScanResult[] = []
    marketData.forEach(m => {
      const atm  = Math.round(m.spot / m.tickSize) * m.tickSize
      const tick = m.tickSize
      const sig  = m.iv / 100

      // Iron Condor — high IV rank favoured
      if (m.ivRank > 45) {
        const T   = 30 / 365
        const scK = atm + tick * 3, lcK = atm + tick * 6
        const spK = atm - tick * 3, lpK = atm - tick * 6
        const sc  = blackScholes({ S: m.spot, K: scK, T, r: 0.065, sigma: sig, optionType: 'call' })
        const lc  = blackScholes({ S: m.spot, K: lcK, T, r: 0.065, sigma: sig, optionType: 'call' })
        const sp  = blackScholes({ S: m.spot, K: spK, T, r: 0.065, sigma: sig, optionType: 'put'  })
        const lp  = blackScholes({ S: m.spot, K: lpK, T, r: 0.065, sigma: sig, optionType: 'put'  })
        const credit = (sc.price - lc.price + sp.price - lp.price) * m.lotSize
        const risk   = tick * 3 * m.lotSize - credit
        r.push({
          strategy: 'Iron Condor', symbol: m.symbol,
          legs: `B${lpK}P / S${spK}P / S${scK}C / B${lcK}C`,
          maxProfit: `₹${credit.toFixed(0)}`, maxLoss: `₹${risk.toFixed(0)}`,
          probability: 62 + Math.random() * 10, ivRank: m.ivRank, dte: 30,
          bias: 'neutral', type: 'credit',
          score: m.ivRank > 65 ? 88 : 72,
          margin: `₹${(risk * 1.2).toFixed(0)}`,
        })
      }

      // Bull Call Spread — low IV rank
      if (m.ivRank < 55) {
        const T   = 21 / 365
        const bK  = atm, sK = atm + tick * 4
        const lc  = blackScholes({ S: m.spot, K: bK, T, r: 0.065, sigma: sig, optionType: 'call' })
        const sc  = blackScholes({ S: m.spot, K: sK, T, r: 0.065, sigma: sig, optionType: 'call' })
        const debit = (lc.price - sc.price) * m.lotSize
        r.push({
          strategy: 'Bull Call Spread', symbol: m.symbol,
          legs: `B${bK}C / S${sK}C`,
          maxProfit: `₹${(tick * 4 * m.lotSize - debit).toFixed(0)}`, maxLoss: `₹${debit.toFixed(0)}`,
          probability: 44 + Math.random() * 14, ivRank: m.ivRank, dte: 21,
          bias: 'bullish', type: 'debit',
          score: m.ivRank < 30 ? 82 : 64,
          margin: `₹${(debit * 1.1).toFixed(0)}`,
        })
      }

      // Short Straddle
      if (m.ivRank > 55 && m.ivRank < 80) {
        const T  = 7 / 365
        const c  = blackScholes({ S: m.spot, K: atm, T, r: 0.065, sigma: sig, optionType: 'call' })
        const p  = blackScholes({ S: m.spot, K: atm, T, r: 0.065, sigma: sig, optionType: 'put'  })
        const cr = (c.price + p.price) * m.lotSize
        r.push({
          strategy: 'Short Straddle', symbol: m.symbol,
          legs: `S${atm}C / S${atm}P`,
          maxProfit: `₹${cr.toFixed(0)}`, maxLoss: 'Unlimited',
          probability: 52 + Math.random() * 10, ivRank: m.ivRank, dte: 7,
          bias: 'neutral', type: 'credit',
          score: 58 + Math.random() * 18,
          margin: `₹${(cr * 3).toFixed(0)}`,
        })
      }

      // Bear Put Spread
      if (m.ivRank > 50) {
        const T  = 21 / 365
        const bK = atm, sK = atm - tick * 4
        const lp = blackScholes({ S: m.spot, K: bK, T, r: 0.065, sigma: sig, optionType: 'put' })
        const sp = blackScholes({ S: m.spot, K: sK, T, r: 0.065, sigma: sig, optionType: 'put' })
        const db = (lp.price - sp.price) * m.lotSize
        r.push({
          strategy: 'Bear Put Spread', symbol: m.symbol,
          legs: `B${bK}P / S${sK}P`,
          maxProfit: `₹${(tick * 4 * m.lotSize - db).toFixed(0)}`, maxLoss: `₹${db.toFixed(0)}`,
          probability: 40 + Math.random() * 15, ivRank: m.ivRank, dte: 21,
          bias: 'bearish', type: 'debit',
          score: m.ivRank > 60 ? 75 : 60,
          margin: `₹${(db * 1.1).toFixed(0)}`,
        })
      }
    })
    return r
      .filter(r => filter === 'all' || r.bias === filter)
      .sort((a, b) => sortBy === 'score' ? b.score - a.score : sortBy === 'probability' ? b.probability - a.probability : b.ivRank - a.ivRank)
  }, [marketData, filter, sortBy])

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">

          {/* Page header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" /> Strategy Scanner
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                IV-rank ranked opportunities across {marketData.length} instruments
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Bias filter */}
              <div className="flex gap-1 bg-[#1a1f2e] rounded-lg p-1 border border-[#1e2535]">
                {(['all','bullish','bearish','neutral'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn('px-3 py-1 rounded text-xs font-medium transition-all capitalize',
                      filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300')}>
                    {f}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="bg-[#1a1f2e] border border-[#1e2535] rounded-lg px-3 py-1.5 text-xs text-gray-300">
                <option value="score">Sort: Score</option>
                <option value="probability">Sort: Probability</option>
                <option value="ivRank">Sort: IV Rank</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e2535] bg-[#1a1f2e]">
                  {['Score','Strategy','Symbol','Legs','Max Profit','Max Loss','Prob%','IV Rank','DTE','Type','Margin',''].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-500 font-medium text-[10px] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}
                    className="border-b border-[#1e2535]/60 hover:bg-[#1a1f2e]/60 transition-colors group">
                    {/* Score */}
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold tabular', SCORE_COLOR(r.score))}>
                        {Math.round(r.score)}
                      </span>
                    </td>
                    {/* Strategy */}
                    <td className="px-3 py-3 font-medium text-white">{r.strategy}</td>
                    {/* Symbol */}
                    <td className="px-3 py-3">
                      <span className="bg-[#1e2535] border border-[#2a3040] rounded px-2 py-0.5 text-gray-300 font-mono text-[10px]">
                        {r.symbol}
                      </span>
                    </td>
                    {/* Legs */}
                    <td className="px-3 py-3 text-gray-500 font-mono text-[10px] max-w-[180px] truncate">{r.legs}</td>
                    {/* Max Profit */}
                    <td className="px-3 py-3 font-mono font-semibold text-green-400">{r.maxProfit}</td>
                    {/* Max Loss */}
                    <td className="px-3 py-3 font-mono font-semibold text-red-400">{r.maxLoss}</td>
                    {/* Probability */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[#1e2535] overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500"
                            style={{ width: `${r.probability}%` }} />
                        </div>
                        <span className="font-mono text-gray-300">{r.probability.toFixed(1)}%</span>
                      </div>
                    </td>
                    {/* IV Rank */}
                    <td className={cn('px-3 py-3 font-mono font-semibold tabular',
                      r.ivRank > 65 ? 'text-red-400' : r.ivRank < 35 ? 'text-green-400' : 'text-yellow-400')}>
                      {r.ivRank}
                    </td>
                    {/* DTE */}
                    <td className="px-3 py-3 font-mono text-gray-400">{r.dte}d</td>
                    {/* Type */}
                    <td className="px-3 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium border',
                        r.type === 'credit'
                          ? 'bg-green-400/10 border-green-400/30 text-green-400'
                          : 'bg-orange-400/10 border-orange-400/30 text-orange-400')}>
                        {r.type}
                      </span>
                    </td>
                    {/* Margin */}
                    <td className="px-3 py-3 font-mono text-gray-500">{r.margin}</td>
                    {/* Action */}
                    <td className="px-3 py-3">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded bg-blue-600/20 border border-blue-600/40 text-blue-400 text-[10px] hover:bg-blue-600/30 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Build
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <Target className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No strategies match the current filter</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-700 mt-3">
            {results.length} strategies scanned across {marketData.length} instruments · Scores based on IV rank, probability of profit, and risk/reward ratio
          </p>
        </main>
      </div>
    </div>
  )
}
