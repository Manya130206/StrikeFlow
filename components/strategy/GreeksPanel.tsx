"use client"
import { useMemo } from 'react'
import type { OptionLeg } from '@/lib/types'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'

interface GreeksPanelProps { legs: OptionLeg[]; spot: number; daysToExpiry: number }

interface GreekCard { label: string; value: string; subtext: string; color: string; description: string }

export default function GreeksPanel({ legs, spot, daysToExpiry }: GreeksPanelProps) {
  const totals = useMemo(() => {
    if (legs.length === 0) return null
    const T = daysToExpiry / 365
    if (T <= 0) return null

    let delta = 0, gamma = 0, theta = 0, vega = 0, rho = 0
    legs.forEach(leg => {
      const mult = leg.direction === 'long' ? 1 : -1
      const g = blackScholes({ S: spot, K: leg.strike, T, r: 0.065, sigma: 0.15, optionType: leg.optionType })
      const lotMult = leg.lots * leg.lotSize
      delta += g.delta * mult * lotMult
      gamma += g.gamma * mult * lotMult
      theta += g.theta * mult * lotMult
      vega += g.vega * mult * lotMult
      rho += g.rho * mult * lotMult
    })
    return { delta, gamma, theta, vega, rho }
  }, [legs, spot, daysToExpiry])

  if (!totals) {
    return (
      <div className="text-center text-muted-foreground text-sm py-6">
        {legs.length === 0 ? 'Add legs to see Greeks' : 'Set DTE > 0 to compute Greeks'}
      </div>
    )
  }

  const greeks: GreekCard[] = [
    { label: 'Delta (Δ)', value: totals.delta.toFixed(2), subtext: `₹${(totals.delta * 1).toFixed(0)} per ₹1 move`, color: totals.delta >= 0 ? 'text-green-400' : 'text-red-400', description: 'Directional exposure' },
    { label: 'Gamma (Γ)', value: totals.gamma.toFixed(4), subtext: `Δ change per ₹1`, color: 'text-blue-400', description: 'Acceleration of delta' },
    { label: 'Theta (Θ)', value: totals.theta.toFixed(2), subtext: `P&L per day`, color: totals.theta >= 0 ? 'text-green-400' : 'text-red-400', description: 'Time decay' },
    { label: 'Vega (ν)', value: totals.vega.toFixed(2), subtext: `P&L per 1% IV`, color: totals.vega >= 0 ? 'text-green-400' : 'text-red-400', description: 'Volatility sensitivity' },
    { label: 'Rho (ρ)', value: totals.rho.toFixed(2), subtext: `P&L per 1% rate`, color: 'text-purple-400', description: 'Interest rate sensitivity' },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {greeks.map(g => (
        <div key={g.label} className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">{g.label}</p>
          <p className={cn("text-lg font-mono font-bold tabular", g.color)}>{g.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{g.subtext}</p>
        </div>
      ))}
    </div>
  )
}
