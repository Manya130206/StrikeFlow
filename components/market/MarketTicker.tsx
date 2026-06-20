"use client"
import { useState, useEffect } from 'react'
import { useStrategyStore } from '@/store/useStrategyStore'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, Star } from 'lucide-react'

export default function MarketTicker() {
  const { marketData, selectedSymbol, setSelectedSymbol, watchlist, addToWatchlist, removeFromWatchlist } = useStrategyStore()
  const [cat, setCat] = useState<'index'|'stock'|'all'>('index')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const visible = cat === 'all' ? marketData : marketData.filter(m => m.category === cat)

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 flex-shrink-0">
        {(['index','stock','all'] as const).map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={cn('px-2 py-0.5 rounded text-[10px] font-medium border transition-all capitalize cursor-pointer',
              cat === c ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'border-[#1e2535] text-gray-600 hover:border-gray-600 hover:text-gray-400')}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 flex-1 min-w-0">
        {visible.map(m => (
          <div key={m.symbol} onClick={() => setSelectedSymbol(m.symbol)}
            className={cn("flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-all whitespace-nowrap flex-shrink-0 group cursor-pointer",
              selectedSymbol === m.symbol ? 'bg-blue-600/10 border-blue-500/40' : 'bg-[#1a1f2e]/50 border-[#1e2535] hover:border-[#2a3040] hover:bg-[#1a1f2e]')}>
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", m.category==='index'?'bg-blue-400':'bg-purple-400')}/>
            <span className={cn("font-semibold text-[11px]", selectedSymbol===m.symbol?'text-blue-400':'text-gray-400')}>{m.symbol}</span>
            <span className="font-mono font-bold tabular text-white text-[11px]">{m.spot.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
            <span className={cn("flex items-center gap-0.5 font-mono tabular text-[10px]", m.changePct>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>
              {mounted ? (m.changePct>=0?<TrendingUp className="h-2.5 w-2.5"/>:<TrendingDown className="h-2.5 w-2.5"/>) : null}
              {mounted ? `${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%` : ''}
            </span>
            <span className="text-gray-600 flex items-center gap-0.5 text-[10px]"><Activity className="h-2.5 w-2.5"/>{m.iv.toFixed(1)}%</span>
            <button onClick={e=>{e.stopPropagation();watchlist.includes(m.symbol)?removeFromWatchlist(m.symbol):addToWatchlist(m.symbol)}}
              className={cn("opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0",watchlist.includes(m.symbol)?'text-yellow-400':'text-gray-600 hover:text-yellow-400')}>
              <Star className={cn("h-2.5 w-2.5",watchlist.includes(m.symbol)&&"fill-current")}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
