"use client"
import { useMemo } from 'react'
import IVSurfaceChart from '@/components/charts/IVSurfaceChart'
import { generateIVSurface } from '@/lib/mockData'
import { useStrategyStore } from '@/store/useStrategyStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function IVAnalysis() {
  const { spotPrice, marketData, selectedSymbol } = useStrategyStore()
  const mkt = marketData.find(m => m.symbol === selectedSymbol)

  // IV skew for current expiry
  const skewData = useMemo(() => {
    const atm = Math.round(spotPrice / 50) * 50
    const strikes = Array.from({ length: 21 }, (_, i) => atm + (i - 10) * 50)
    return strikes.map(K => {
      const moneyness = ((K - spotPrice) / spotPrice) * 100
      const baseIV = (mkt?.iv || 15)
      const iv = baseIV * (1 - 0.08 * (moneyness / 100) + 0.04 * (moneyness / 100) ** 2)
      return { strike: K, iv: Math.max(iv, 8), moneyness: moneyness.toFixed(1) }
    })
  }, [spotPrice, mkt])

  const ivRank = mkt?.ivRank || 50

  return (
    <div className="space-y-6">
      {/* IV Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Current IV', value: `${mkt?.iv.toFixed(1)}%`, sub: '30-day implied', color: 'text-blue-400' },
          { label: 'IV Rank', value: `${ivRank}`, sub: '52-week percentile', color: ivRank > 60 ? 'text-red-400' : ivRank < 30 ? 'text-green-400' : 'text-yellow-400' },
          { label: 'IV Percentile', value: `${(ivRank * 0.95).toFixed(0)}th`, sub: 'vs 1-year range', color: 'text-purple-400' },
          { label: 'HV 30', value: `${((mkt?.iv || 15) * 0.82).toFixed(1)}%`, sub: '30-day historical', color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-mono font-bold mt-1 tabular ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* IV Skew */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-1">IV Skew — Current Expiry</h3>
        <p className="text-xs text-muted-foreground mb-3">Implied volatility across strikes (put skew visible for OTM puts)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={skewData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 20%)" />
            <XAxis dataKey="moneyness" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Moneyness (%)', position: 'bottom', fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip formatter={(v: any) => [`${v.toFixed(2)}%`, 'IV']}
              contentStyle={{ background: 'hsl(222 47% 10%)', border: '1px solid hsl(217 32% 20%)', borderRadius: '6px' }} />
            <ReferenceLine x="0.0" stroke="#f59e0b" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="iv" stroke="#818cf8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* IV Surface */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-1">IV Surface</h3>
        <p className="text-xs text-muted-foreground mb-3">Implied volatility across strikes and expiries</p>
        <IVSurfaceChart spot={spotPrice} />
      </div>
    </div>
  )
}
