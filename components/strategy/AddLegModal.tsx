"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OptionLeg, OptionType, Direction, InstrumentType } from '@/lib/types'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'
import { useStrategyStore } from '@/store/useStrategyStore'

interface AddLegModalProps {
  spot: number
  symbol: string
  onAdd: (leg: OptionLeg) => void
  onClose: () => void
}

export default function AddLegModal({ spot, symbol, onAdd, onClose }: AddLegModalProps) {
  const { marketData } = useStrategyStore()
  const mkt = marketData.find(m => m.symbol === symbol)
  const tickSize = mkt?.tickSize ?? 50
  const lotSize = mkt?.lotSize ?? 25
  const futuresPrice = mkt?.futures ?? spot

  const baseStrike = Math.round(spot / tickSize) * tickSize

  const [instrType, setInstrType] = useState<InstrumentType>('option')
  const [strike, setStrike] = useState(baseStrike.toString())
  const [optionType, setOptionType] = useState<OptionType>('call')
  const [direction, setDirection] = useState<Direction>('long')
  const [lots, setLots] = useState('1')
  const [dte, setDte] = useState('30')
  const [customPremium, setCustomPremium] = useState('')
  const [customFuturesPrice, setCustomFuturesPrice] = useState(futuresPrice.toFixed(2))

  const T = Number(dte) / 365
  const K = Number(strike) || baseStrike
  const estimatedPremium = instrType === 'option' && T > 0
    ? blackScholes({ S: spot, K, T, r: 0.065, sigma: (mkt?.iv ?? 20) / 100, optionType }).price
    : 0

  const numLots = Number(lots) || 1
  const totalCost = instrType === 'futures'
    ? Number(customFuturesPrice) * numLots * lotSize
    : (Number(customPremium) || estimatedPremium) * numLots * lotSize

  const strikes = Array.from({ length: 21 }, (_, i) => baseStrike + (i - 10) * tickSize)

  const handleAdd = () => {
    const leg: OptionLeg = {
      id: Date.now().toString(),
      symbol,
      strike: instrType === 'futures' ? Number(customFuturesPrice) : K,
      expiry: new Date(Date.now() + Number(dte) * 86400000).toISOString().split('T')[0],
      optionType: instrType === 'futures' ? 'call' : optionType,  // not used for futures
      direction,
      lots: numLots,
      premium: instrType === 'futures' ? Number(customFuturesPrice) : (Number(customPremium) || estimatedPremium),
      lotSize,
      instrumentType: instrType,
      futuresPrice: instrType === 'futures' ? Number(customFuturesPrice) : undefined,
    }
    onAdd(leg)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-[520px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-5">Add Leg — {symbol}</h3>

        {/* Instrument type tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-secondary/50 rounded-lg">
          {([
            { id: 'option',  label: 'Option',  desc: 'Call / Put' },
            { id: 'futures', label: 'Futures', desc: 'Near month' },
            { id: 'equity',  label: 'Equity',  desc: 'Stock/Index' },
          ] as { id: InstrumentType; label: string; desc: string }[]).map(t => (
            <button key={t.id} onClick={() => setInstrType(t.id)}
              className={cn(
                "flex-1 py-2 rounded-md text-xs font-medium transition-all",
                instrType === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              <div>{t.label}</div>
              <div className="text-[10px] opacity-60">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Direction */}
        <div className="mb-4">
          <Label className="text-xs mb-2 block">Direction</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['long', 'short'] as Direction[]).map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={cn(
                  "py-2.5 rounded-lg text-sm font-semibold border transition-all",
                  direction === d
                    ? d === 'long'
                      ? 'bg-green-500/15 border-green-500/60 text-green-400'
                      : 'bg-red-500/15 border-red-500/60 text-red-400'
                    : 'border-border text-muted-foreground hover:border-border/80'
                )}>
                {d === 'long' ? '▲ LONG' : '▼ SHORT'}
              </button>
            ))}
          </div>
        </div>

        {/* Option-specific fields */}
        {instrType === 'option' && (
          <>
            <div className="mb-4">
              <Label className="text-xs mb-2 block">Option Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['call', 'put'] as OptionType[]).map(t => (
                  <button key={t} onClick={() => setOptionType(t)}
                    className={cn(
                      "py-2 rounded-lg text-sm font-medium border transition-all",
                      optionType === t ? 'bg-primary/15 border-primary/60 text-primary' : 'border-border text-muted-foreground hover:border-border/80'
                    )}>
                    {t === 'call' ? 'CALL ↑' : 'PUT ↓'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <Label className="text-xs mb-2 block">Strike</Label>
              <Select value={strike} onValueChange={setStrike}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strikes.map(s => {
                    const diff = s - baseStrike
                    const pct = (diff / spot * 100).toFixed(1)
                    return (
                      <SelectItem key={s} value={s.toString()}>
                        <span className="font-mono">{s.toLocaleString('en-IN')}</span>
                        {diff === 0 && <span className="ml-2 text-yellow-400 text-xs font-medium">ATM</span>}
                        {diff !== 0 && <span className="ml-2 text-muted-foreground text-xs">{diff > 0 ? '+' : ''}{pct}%</span>}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Futures-specific */}
        {instrType === 'futures' && (
          <div className="mb-4">
            <Label className="text-xs mb-2 block">Futures Price</Label>
            <Input
              type="number"
              value={customFuturesPrice}
              onChange={e => setCustomFuturesPrice(e.target.value)}
              className="font-mono"
              placeholder={futuresPrice.toFixed(2)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Spot: ₹{spot.toLocaleString('en-IN')} · Basis: {(Number(customFuturesPrice) - spot).toFixed(2)}
            </p>
          </div>
        )}

        {/* Common fields */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <Label className="text-xs mb-2 block">DTE</Label>
            <Input type="number" value={dte} onChange={e => setDte(e.target.value)} className="font-mono" min="1" />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Lots</Label>
            <Input type="number" value={lots} onChange={e => setLots(e.target.value)} className="font-mono" min="1" />
          </div>
          {instrType === 'option' && (
            <div>
              <Label className="text-xs mb-2 block">Premium (₹)</Label>
              <Input
                type="number"
                value={customPremium}
                onChange={e => setCustomPremium(e.target.value)}
                placeholder={estimatedPremium.toFixed(2)}
                className="font-mono"
              />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-secondary/50 rounded-lg p-3 mb-5 text-xs font-mono">
          <div className="grid grid-cols-3 gap-2 text-muted-foreground">
            <span>Lot Size: <span className="text-foreground">{lotSize}</span></span>
            <span>Lots: <span className="text-foreground">{numLots}</span></span>
            {instrType === 'option' && (
              <span>Est. Premium: <span className="text-foreground">₹{estimatedPremium.toFixed(2)}</span></span>
            )}
            {instrType === 'futures' && (
              <span>Margin: <span className="text-yellow-400">~₹{(totalCost * 0.15 / 100000).toFixed(1)}L</span></span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleAdd}>
            Add {instrType.charAt(0).toUpperCase() + instrType.slice(1)} Leg
          </Button>
        </div>
      </div>
    </div>
  )
}
