"use client"
import { useState, useMemo } from 'react'
import { Plus, Save, Trash2, Zap, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PayoffChart from '@/components/charts/PayoffChart'
import LegRow from './LegRow'
import GreeksPanel from './GreeksPanel'
import AddLegModal from './AddLegModal'
import { useStrategyStore } from '@/store/useStrategyStore'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'

const QUICK_STRATEGIES = [
  {
    name: 'Bull Call Spread',
    build: (spot: number, ts: number) => [
      { strike: Math.round(spot/ts)*ts,         optionType: 'call' as const, direction: 'long'  as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts + ts*4,  optionType: 'call' as const, direction: 'short' as const, instrType: 'option' as const },
    ]
  },
  {
    name: 'Iron Condor',
    build: (spot: number, ts: number) => [
      { strike: Math.round(spot/ts)*ts - ts*6,  optionType: 'put'  as const, direction: 'long'  as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts - ts*3,  optionType: 'put'  as const, direction: 'short' as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts + ts*3,  optionType: 'call' as const, direction: 'short' as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts + ts*6,  optionType: 'call' as const, direction: 'long'  as const, instrType: 'option' as const },
    ]
  },
  {
    name: 'Straddle',
    build: (spot: number, ts: number) => [
      { strike: Math.round(spot/ts)*ts,          optionType: 'call' as const, direction: 'long' as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts,          optionType: 'put'  as const, direction: 'long' as const, instrType: 'option' as const },
    ]
  },
  {
    name: 'Strangle',
    build: (spot: number, ts: number) => [
      { strike: Math.round(spot/ts)*ts + ts*3,   optionType: 'call' as const, direction: 'long' as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts - ts*3,   optionType: 'put'  as const, direction: 'long' as const, instrType: 'option' as const },
    ]
  },
  {
    name: 'Synthetic Long',
    build: (spot: number, ts: number) => [
      { strike: Math.round(spot/ts)*ts,  optionType: 'call' as const, direction: 'long'  as const, instrType: 'option' as const },
      { strike: Math.round(spot/ts)*ts,  optionType: 'put'  as const, direction: 'short' as const, instrType: 'option' as const },
    ]
  },
  {
    name: 'Long Futures',
    build: (spot: number, ts: number, futures: number) => [
      { strike: futures, optionType: 'call' as const, direction: 'long' as const, instrType: 'futures' as const },
    ]
  },
  {
    name: 'Short Futures',
    build: (spot: number, ts: number, futures: number) => [
      { strike: futures, optionType: 'call' as const, direction: 'short' as const, instrType: 'futures' as const },
    ]
  },
  {
    name: 'Fut + Put Hedge',
    build: (spot: number, ts: number, futures: number) => [
      { strike: futures,                             optionType: 'call' as const, direction: 'long'  as const, instrType: 'futures' as const },
      { strike: Math.round(spot/ts)*ts - ts*3,       optionType: 'put'  as const, direction: 'long'  as const, instrType: 'option'  as const },
    ]
  },
]

export default function StrategyBuilder() {
  const { currentLegs, addLeg, removeLeg, clearLegs, saveStrategy, selectedSymbol, spotPrice, marketData } = useStrategyStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [daysToExpiry, setDaysToExpiry] = useState(30)
  const [strategyName, setStrategyName] = useState('')

  const mkt = marketData.find(m => m.symbol === selectedSymbol)
  const tickSize = mkt?.tickSize ?? 50
  const lotSize = mkt?.lotSize ?? 25
  const futuresPrice = mkt?.futures ?? spotPrice

  const handleQuickStrategy = (strat: typeof QUICK_STRATEGIES[0]) => {
    clearLegs()
    const T = daysToExpiry / 365
    strat.build(spotPrice, tickSize, futuresPrice).forEach((l, i) => {
      const isFutures = l.instrType === 'futures'
      const premium = isFutures
        ? l.strike  // futures price IS the entry price
        : T > 0 ? blackScholes({ S: spotPrice, K: l.strike, T, r: 0.065, sigma: (mkt?.iv ?? 20)/100, optionType: l.optionType }).price : 0
      addLeg({
        id: (Date.now() + i).toString(),
        symbol: selectedSymbol,
        strike: l.strike,
        expiry: new Date(Date.now() + daysToExpiry * 86400000).toISOString().split('T')[0],
        optionType: l.optionType,
        direction: l.direction,
        lots: 1,
        premium,
        lotSize,
        instrumentType: l.instrType,
        ...(isFutures ? { futuresPrice: l.strike } : {}),
      })
    })
  }

  const strategyStats = useMemo(() => {
    if (!currentLegs.length) return null
    const atm = Math.round(spotPrice / tickSize) * tickSize
    const spots = Array.from({ length: 200 }, (_, i) => atm * 0.75 + i * atm * 0.0025)
    const pnls = spots.map(S => {
      let pnl = 0
      currentLegs.forEach(leg => {
        const mult = leg.direction === 'long' ? 1 : -1
        const isFut = leg.instrumentType === 'futures'
        const isEq  = leg.instrumentType === 'equity'
        let val = 0
        if (isFut || isEq) {
          val = S - leg.premium
        } else {
          val = leg.optionType === 'call' ? Math.max(S - leg.strike, 0) : Math.max(leg.strike - S, 0)
          val -= leg.premium
        }
        pnl += val * mult * leg.lots * leg.lotSize
      })
      return pnl
    })
    const maxProfit = Math.max(...pnls)
    const maxLoss = Math.min(...pnls)
    const breakevens: number[] = []
    for (let i = 1; i < pnls.length; i++) {
      if ((pnls[i-1] < 0 && pnls[i] >= 0) || (pnls[i-1] >= 0 && pnls[i] < 0)) {
        breakevens.push(Math.round((spots[i-1] + spots[i]) / 2 / tickSize) * tickSize)
      }
    }
    const netPremium = currentLegs.reduce((sum, leg) => {
      const mult = leg.direction === 'long' ? -1 : 1
      return sum + leg.premium * mult * leg.lots * leg.lotSize
    }, 0)
    return { maxProfit, maxLoss, breakevens, netPremium }
  }, [currentLegs, daysToExpiry, spotPrice, tickSize])

  const hasFutures = currentLegs.some(l => l.instrumentType === 'futures')

  return (
    <div className="flex flex-col gap-4">
      {/* Quick strategies */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
          <Zap className="h-3 w-3" /> Quick:
        </span>
        {QUICK_STRATEGIES.map(s => (
          <Button key={s.name} variant="outline" size="sm"
            className={cn("text-xs h-7", s.name.toLowerCase().includes('fut') && "border-blue-400/30 text-blue-400 hover:bg-blue-400/10")}
            onClick={() => handleQuickStrategy(s)}>
            {s.name.toLowerCase().includes('fut') && <BarChart2 className="h-3 w-3 mr-1" />}
            {s.name}
          </Button>
        ))}
      </div>

      {/* Leg headers */}
      {currentLegs.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-3">
          <span className="w-20">Dir</span>
          <span className="w-16">Type</span>
          <span className="w-24">Strike/Price</span>
          <span className="w-20">Expiry</span>
          <span className="w-10">Lots</span>
          <span className="w-20">Premium</span>
          <span className="ml-auto flex gap-3 mr-2">
            <span>Δ</span><span>θ</span><span>ν</span>
          </span>
          <span className="w-20 text-right">P&L</span>
          <span className="w-7" />
        </div>
      )}

      {/* Legs list */}
      <div className="space-y-2">
        {currentLegs.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
            <p>No legs yet. Use Quick Strategies above or add legs manually.</p>
            <p className="text-xs mt-1 opacity-60">Supports Options · Futures · Equity legs</p>
          </div>
        ) : (
          currentLegs.map(leg => (
            <LegRow key={leg.id} leg={leg} spot={spotPrice} daysToExpiry={daysToExpiry}
              onRemove={() => removeLeg(leg.id)} />
          ))
        )}
      </div>

      <Button variant="outline" size="sm" className="w-fit" onClick={() => setShowAddModal(true)}>
        <Plus className="h-4 w-4 mr-2" /> Add Leg
      </Button>

      {/* Stats */}
      {strategyStats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Max Profit', value: strategyStats.maxProfit > 9e8 ? '∞' : `₹${strategyStats.maxProfit.toFixed(0)}`, color: 'text-green-400' },
            { label: 'Max Loss',   value: strategyStats.maxLoss < -9e8  ? '-∞': `₹${strategyStats.maxLoss.toFixed(0)}`,   color: 'text-red-400'   },
            { label: 'Net Credit/Debit', value: `₹${Math.abs(strategyStats.netPremium).toFixed(0)} ${strategyStats.netPremium >= 0 ? 'CR' : 'DR'}`, color: strategyStats.netPremium >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Breakevens', value: strategyStats.breakevens.length ? strategyStats.breakevens.map(b => b.toLocaleString('en-IN')).join(', ') : '—', color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-secondary/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
              <p className={cn("font-mono text-sm font-bold tabular mt-1", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* DTE selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Days to Expiry:</span>
        <div className="flex gap-1.5 flex-wrap">
          {[7,14,21,30,45,60].map(d => (
            <button key={d} onClick={() => setDaysToExpiry(d)}
              className={cn("px-2.5 py-1 rounded text-xs border transition-colors",
                daysToExpiry === d ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Payoff Chart */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Payoff Diagram</h3>
          {hasFutures && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <BarChart2 className="h-3 w-3" /> Includes Futures legs
            </span>
          )}
        </div>
        <PayoffChart legs={currentLegs} spot={spotPrice} daysToExpiry={daysToExpiry} />
      </div>

      {/* Greeks */}
      {currentLegs.some(l => l.instrumentType !== 'futures') && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Net Greeks (Options)</h3>
          <GreeksPanel legs={currentLegs.filter(l => l.instrumentType !== 'futures' && l.instrumentType !== 'equity')}
            spot={spotPrice} daysToExpiry={daysToExpiry} />
        </div>
      )}

      {/* Save */}
      {currentLegs.length > 0 && (
        <div className="flex items-center gap-3 pt-1">
          <Input placeholder="Strategy name..." value={strategyName}
            onChange={e => setStrategyName(e.target.value)} className="max-w-xs" />
          <Button size="sm" onClick={() => { saveStrategy(strategyName || 'Unnamed Strategy'); setStrategyName('') }}>
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearLegs}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>
      )}

      {showAddModal && (
        <AddLegModal spot={spotPrice} symbol={selectedSymbol} onAdd={addLeg} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
