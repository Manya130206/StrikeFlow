"use client"
import { X, TrendingUp, TrendingDown, BarChart2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OptionLeg } from '@/lib/types'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'

interface LegRowProps {
  leg: OptionLeg
  spot: number
  daysToExpiry: number
  onRemove: () => void
}

export default function LegRow({ leg, spot, daysToExpiry, onRemove }: LegRowProps) {
  const isFutures = leg.instrumentType === 'futures'
  const isEquity  = leg.instrumentType === 'equity'
  const T = daysToExpiry / 365
  const mult = leg.direction === 'long' ? 1 : -1

  // Greeks only apply to options
  const greeks = (!isFutures && !isEquity && T > 0)
    ? blackScholes({ S: spot, K: leg.strike, T, r: 0.065, sigma: 0.15, optionType: leg.optionType })
    : null

  const delta = isFutures || isEquity ? (mult).toFixed(2) : greeks ? (greeks.delta * mult).toFixed(3) : '—'
  const theta = greeks ? (greeks.theta * mult * leg.lots * leg.lotSize).toFixed(0) : '—'
  const vega  = greeks ? (greeks.vega  * mult * leg.lots * leg.lotSize).toFixed(0) : '—'

  // P&L calculation
  let pnl = 0
  if (isFutures) {
    pnl = (spot - leg.premium) * mult * leg.lots * leg.lotSize
  } else if (isEquity) {
    pnl = (spot - leg.premium) * mult * leg.lots * leg.lotSize
  } else {
    const currentPremium = greeks ? greeks.price : leg.premium
    pnl = (currentPremium - leg.premium) * mult * leg.lots * leg.lotSize
  }

  const instrIcon = isFutures ? <BarChart2 className="h-3 w-3" />
    : isEquity ? <Layers className="h-3 w-3" />
    : null

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg border text-sm",
      leg.direction === 'long' ? 'border-green-500/20 bg-green-500/3' : 'border-red-500/20 bg-red-500/3'
    )}>
      {/* Direction */}
      <div className={cn("flex items-center gap-1 font-semibold w-20 text-xs",
        leg.direction === 'long' ? 'text-green-400' : 'text-red-400')}>
        {leg.direction === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {leg.direction.toUpperCase()}
      </div>

      {/* Type badge */}
      {isFutures ? (
        <Badge variant="secondary" className="w-16 justify-center text-[10px] text-blue-400 border-blue-400/30 bg-blue-400/10">
          FUT
        </Badge>
      ) : isEquity ? (
        <Badge variant="secondary" className="w-16 justify-center text-[10px] text-purple-400 border-purple-400/30 bg-purple-400/10">
          EQ
        </Badge>
      ) : (
        <Badge variant={leg.optionType === 'call' ? 'profit' : 'loss'} className="w-16 justify-center text-[10px]">
          {leg.optionType.toUpperCase()}
        </Badge>
      )}

      {/* Strike / Price */}
      <div className="w-24 font-mono tabular text-xs">
        {isFutures ? (
          <span className="text-blue-400">FUT {leg.premium.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        ) : (
          <span>{leg.strike.toLocaleString('en-IN')}</span>
        )}
      </div>

      {/* Expiry */}
      <span className="text-muted-foreground w-20 text-xs">{leg.expiry}</span>

      {/* Lots */}
      <span className="font-mono w-10 text-xs">×{leg.lots}</span>

      {/* Premium */}
      <span className="font-mono w-20 tabular text-xs">₹{leg.premium.toFixed(2)}</span>

      {/* Greeks */}
      <div className="flex gap-3 ml-auto text-xs text-muted-foreground font-mono tabular">
        <span title="Delta">Δ {delta}</span>
        <span title="Theta">θ {theta}</span>
        <span title="Vega">ν {vega}</span>
      </div>

      {/* P&L */}
      <span className={cn("font-mono text-xs tabular w-20 text-right font-semibold",
        pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
        {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(0)}
      </span>

      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
