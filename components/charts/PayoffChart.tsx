"use client"
import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { OptionLeg } from '@/lib/types'
import { blackScholes } from '@/lib/blackscholes'

interface PayoffChartProps {
  legs: OptionLeg[]
  spot: number
  daysToExpiry?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">Spot: <span className="text-foreground font-mono">{Number(label).toLocaleString('en-IN')}</span></p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono" style={{ color: p.color }}>
          {p.name}: <span className={p.value >= 0 ? 'text-green-400' : 'text-red-400'}>
            {p.value >= 0 ? '+' : ''}₹{p.value.toFixed(0)}
          </span>
        </p>
      ))}
    </div>
  )
}

export default function PayoffChart({ legs, spot, daysToExpiry = 0 }: PayoffChartProps) {
  const data = useMemo(() => {
    if (!legs.length) return []
    const allPrices = legs.map(l => l.instrumentType === 'futures' ? l.premium : l.strike)
    const minP = Math.min(...allPrices) * 0.82
    const maxP = Math.max(...allPrices) * 1.18
    const steps = 80
    const stepSize = (maxP - minP) / steps
    const T = daysToExpiry / 365

    return Array.from({ length: steps + 1 }, (_, i) => {
      const S = minP + i * stepSize
      let expiryPnl = 0
      let currentPnl = 0

      legs.forEach(leg => {
        const mult = leg.direction === 'long' ? 1 : -1
        const size = leg.lots * leg.lotSize
        const isFut = leg.instrumentType === 'futures'
        const isEq  = leg.instrumentType === 'equity'

        if (isFut || isEq) {
          expiryPnl += (S - leg.premium) * mult * size
          currentPnl += (S - leg.premium) * mult * size
        } else {
          const intrinsic = leg.optionType === 'call' ? Math.max(S - leg.strike, 0) : Math.max(leg.strike - S, 0)
          expiryPnl += (intrinsic - leg.premium) * mult * size
          if (T > 0) {
            const res = blackScholes({ S, K: leg.strike, T, r: 0.065, sigma: 0.15, optionType: leg.optionType })
            currentPnl += (res.price - leg.premium) * mult * size
          }
        }
      })

      return {
        spot: Math.round(S),
        'P&L at Expiry': Math.round(expiryPnl),
        ...(T > 0 && legs.some(l => l.instrumentType !== 'futures') ? { 'Current P&L': Math.round(currentPnl) } : {}),
      }
    })
  }, [legs, spot, daysToExpiry])

  if (!legs.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Add option legs to see the payoff diagram
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,32%,20%)" />
        <XAxis dataKey="spot" tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={v => v >= 10000 ? (v/1000).toFixed(0)+'k' : v.toString()} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={v => v >= 0 ? `+${(v/1000).toFixed(1)}k` : `${(v/1000).toFixed(1)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={spot} stroke="#f59e0b" strokeDasharray="4 4"
          label={{ value: 'Spot', fill: '#f59e0b', fontSize: 11 }} />
        <ReferenceLine y={0} stroke="hsl(215,20%,45%)" />
        <Area type="monotone" dataKey="P&L at Expiry" stroke="#22c55e" fill="url(#profitGrad)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey="Current P&L" stroke="#818cf8" strokeDasharray="5 5" fill="none" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
