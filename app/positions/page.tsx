"use client"
import { useMemo } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useStrategyStore } from '@/store/useStrategyStore'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'
import { BookOpen, TrendingUp, TrendingDown, Activity, Trash2, Download } from 'lucide-react'

export default function PositionsPage() {
  const { savedStrategies, spotPrice, deleteStrategy } = useStrategyStore()

  const posData = useMemo(() => savedStrategies.map(strategy => {
    let totalPnl = 0, totalDelta = 0, totalTheta = 0, totalVega = 0, totalGamma = 0
    const T = 30 / 365
    strategy.legs.forEach(leg => {
      const mult = leg.direction === 'long' ? 1 : -1
      const size = leg.lots * leg.lotSize
      const isFut = leg.instrumentType === 'futures' || leg.instrumentType === 'equity'
      if (isFut) {
        totalPnl   += (spotPrice - leg.premium) * mult * size
        totalDelta += mult * size
      } else {
        const g = blackScholes({ S: spotPrice, K: leg.strike, T, r: 0.065, sigma: 0.15, optionType: leg.optionType })
        totalPnl   += (g.price - leg.premium) * mult * size
        totalDelta += g.delta * mult * size
        totalTheta += g.theta * mult * size
        totalVega  += g.vega  * mult * size
        totalGamma += g.gamma * mult * size
      }
    })
    return { ...strategy, totalPnl, totalDelta, totalTheta, totalVega, totalGamma }
  }), [savedStrategies, spotPrice])

  const portfolio = useMemo(() => posData.reduce(
    (acc, p) => ({
      pnl:   acc.pnl   + p.totalPnl,
      delta: acc.delta + p.totalDelta,
      theta: acc.theta + p.totalTheta,
      vega:  acc.vega  + p.totalVega,
    }),
    { pnl: 0, delta: 0, theta: 0, vega: 0 }
  ), [posData])

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-400" /> Positions
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Saved strategy portfolio with live Greeks and P&amp;L</p>
            </div>
            {posData.length > 0 && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#2a3040] text-xs text-gray-400 hover:text-gray-200 hover:border-gray-500">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            )}
          </div>

          {posData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600">
              <BookOpen className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">No saved positions yet</p>
              <p className="text-xs mt-1 opacity-60">Save strategies from the Strategy Builder</p>
            </div>
          ) : (
            <>
              {/* Portfolio summary */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Total P&L',  value: `₹${portfolio.pnl.toFixed(0)}`, color: portfolio.pnl >= 0 ? 'text-green-400' : 'text-red-400', icon: portfolio.pnl >= 0 ? TrendingUp : TrendingDown },
                  { label: 'Net Delta',  value: portfolio.delta.toFixed(2),      color: portfolio.delta >= 0 ? 'text-green-400' : 'text-red-400',   icon: Activity },
                  { label: 'Net Theta',  value: `₹${portfolio.theta.toFixed(2)}/d`, color: portfolio.theta >= 0 ? 'text-green-400' : 'text-red-400', icon: Activity },
                  { label: 'Net Vega',   value: portfolio.vega.toFixed(2),       color: portfolio.vega >= 0 ? 'text-green-400' : 'text-red-400',    icon: Activity },
                ].map(s => (
                  <div key={s.label} className="bg-[#0f1420] rounded-xl border border-[#1e2535] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</p>
                        <p className={cn("text-xl font-mono font-bold mt-1.5 tabular", s.color)}>{s.value}</p>
                      </div>
                      <s.icon className={cn("h-4 w-4 mt-1", s.color)} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Positions table */}
              <div className="bg-[#0f1420] rounded-xl border border-[#1e2535] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1e2535] bg-[#1a1f2e]">
                      {['Strategy','Legs','Delta','Gamma','Theta/day','Vega','P&L','Created',''].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-medium text-[10px] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posData.map(pos => (
                      <tr key={pos.id} className="border-b border-[#1e2535]/60 hover:bg-[#1a1f2e]/60 transition-colors group">
                        <td className="px-4 py-3 font-medium text-white">{pos.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap max-w-[220px]">
                            {pos.legs.map((leg, i) => (
                              <span key={i}
                                className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                  leg.direction === 'long'
                                    ? 'bg-green-400/10 border-green-400/30 text-green-400'
                                    : 'bg-red-400/10 border-red-400/30 text-red-400')}>
                                {leg.direction === 'long' ? 'B' : 'S'} {leg.strike}{(leg.instrumentType==='futures'?'F':leg.optionType[0].toUpperCase())}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className={cn("px-4 py-3 font-mono tabular", pos.totalDelta>=0?'text-green-400':'text-red-400')}>
                          {pos.totalDelta.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular text-blue-400">
                          {pos.totalGamma.toFixed(5)}
                        </td>
                        <td className={cn("px-4 py-3 font-mono tabular", pos.totalTheta>=0?'text-green-400':'text-red-400')}>
                          ₹{pos.totalTheta.toFixed(2)}
                        </td>
                        <td className={cn("px-4 py-3 font-mono tabular", pos.totalVega>=0?'text-green-400':'text-red-400')}>
                          {pos.totalVega.toFixed(2)}
                        </td>
                        <td className={cn("px-4 py-3 font-mono font-bold tabular text-sm", pos.totalPnl>=0?'text-green-400':'text-red-400')}>
                          {pos.totalPnl>=0?'+':''}₹{pos.totalPnl.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(pos.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteStrategy(pos.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-600 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
