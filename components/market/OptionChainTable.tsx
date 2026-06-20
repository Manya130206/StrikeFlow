"use client"
import { useMemo, useState } from 'react'
import { generateOptionChain } from '@/lib/mockData'
import { useStrategyStore } from '@/store/useStrategyStore'
import { blackScholes } from '@/lib/blackscholes'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface OptionChainTableProps { dte?: number }

export default function OptionChainTable({ dte = 30 }: OptionChainTableProps) {
  const { spotPrice, selectedSymbol, addLeg, marketData } = useStrategyStore()
  const mkt = marketData.find(m => m.symbol === selectedSymbol)
  const tickSize = mkt?.tickSize ?? 50
  const lotSize = mkt?.lotSize ?? 25
  const iv = (mkt?.iv ?? 15) / 100
  const chain = useMemo(() => generateOptionChain(spotPrice, dte, tickSize, iv), [spotPrice, dte, tickSize, iv])
  const [hovered, setHovered] = useState<{ strike: number; type: 'call'|'put' }|null>(null)

  const handleAdd = (strike: number, optionType: 'call'|'put', premium: number) => {
    addLeg({
      id: Date.now().toString(),
      symbol: selectedSymbol,
      strike,
      expiry: new Date(Date.now() + dte * 86400000).toISOString().split('T')[0],
      optionType,
      direction: 'long',
      lots: 1,
      premium,
      lotSize,
      instrumentType: 'option',
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th colSpan={5} className="text-center py-2 text-green-400 font-semibold" style={{background:'hsl(142 76% 45% / 0.05)'}}>CALLS</th>
            <th className="text-center py-2 text-muted-foreground font-semibold px-4" style={{background:'hsl(217 32% 17%)'}}>STRIKE</th>
            <th colSpan={5} className="text-center py-2 text-red-400 font-semibold" style={{background:'hsl(0 84% 60% / 0.05)'}}>PUTS</th>
          </tr>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 px-2 text-right">OI</th>
            <th className="py-2 px-2 text-right">Vol</th>
            <th className="py-2 px-2 text-right">IV%</th>
            <th className="py-2 px-2 text-right">Bid</th>
            <th className="py-2 px-2 text-right">Ask</th>
            <th className="py-2 px-3 text-center font-semibold text-foreground" style={{background:'hsl(217 32% 17%)'}}>Strike</th>
            <th className="py-2 px-2 text-right">Bid</th>
            <th className="py-2 px-2 text-right">Ask</th>
            <th className="py-2 px-2 text-right">IV%</th>
            <th className="py-2 px-2 text-right">Vol</th>
            <th className="py-2 px-2 text-right">OI</th>
          </tr>
        </thead>
        <tbody>
          {chain.map(row => (
            <tr key={row.strike}
              className={cn("border-b border-border/50 hover:bg-accent/30 transition-colors",
                row.isATM && "bg-yellow-500/5")}>
              <td className="py-1.5 px-2 text-right font-mono tabular text-muted-foreground">{(row.callOI/1000).toFixed(0)}K</td>
              <td className="py-1.5 px-2 text-right font-mono tabular text-muted-foreground">{(row.callVolume/1000).toFixed(0)}K</td>
              <td className="py-1.5 px-2 text-right font-mono tabular text-blue-400">{row.callIV.toFixed(1)}</td>
              <td className="py-1.5 px-2 text-right font-mono tabular">{row.callBid.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right font-mono tabular relative cursor-pointer group"
                onClick={() => handleAdd(row.strike,'call',row.callAsk)}
                onMouseEnter={() => setHovered({strike:row.strike,type:'call'})}
                onMouseLeave={() => setHovered(null)}>
                <span className="text-green-400">{row.callAsk.toFixed(2)}</span>
                {hovered?.strike===row.strike&&hovered.type==='call'&&(
                  <span className="absolute -top-1 right-0 bg-primary text-primary-foreground rounded px-1 text-[10px] flex items-center gap-0.5 whitespace-nowrap z-10">
                    <Plus className="h-2.5 w-2.5"/>Add
                  </span>
                )}
              </td>
              <td className={cn("py-1.5 px-3 text-center font-mono font-semibold",row.isATM&&"text-yellow-400")}
                style={{background:'hsl(217 32% 17%)'}}>
                {row.strike.toLocaleString('en-IN')}
                {row.isATM&&<span className="ml-1 text-[9px] text-yellow-500">ATM</span>}
              </td>
              <td className="py-1.5 px-2 text-right font-mono tabular relative cursor-pointer group"
                onClick={() => handleAdd(row.strike,'put',row.putAsk)}
                onMouseEnter={() => setHovered({strike:row.strike,type:'put'})}
                onMouseLeave={() => setHovered(null)}>
                <span className="text-red-400">{row.putBid.toFixed(2)}</span>
                {hovered?.strike===row.strike&&hovered.type==='put'&&(
                  <span className="absolute -top-1 left-0 bg-primary text-primary-foreground rounded px-1 text-[10px] flex items-center gap-0.5 whitespace-nowrap z-10">
                    <Plus className="h-2.5 w-2.5"/>Add
                  </span>
                )}
              </td>
              <td className="py-1.5 px-2 text-right font-mono tabular">{row.putAsk.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right font-mono tabular text-blue-400">{row.putIV.toFixed(1)}</td>
              <td className="py-1.5 px-2 text-right font-mono tabular text-muted-foreground">{(row.putVolume/1000).toFixed(0)}K</td>
              <td className="py-1.5 px-2 text-right font-mono tabular text-muted-foreground">{(row.putOI/1000).toFixed(0)}K</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2 px-2">Click Ask to add leg · Lot size {lotSize} · Tick {tickSize}</p>
    </div>
  )
}
