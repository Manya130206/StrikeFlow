"use client"
import { useState, useRef, useEffect } from 'react'
import { useStrategyStore } from '@/store/useStrategyStore'
import { cn } from '@/lib/utils'
import { Edit2, RotateCcw, Check, X, ChevronDown, Search, TrendingUp, TrendingDown } from 'lucide-react'

export default function PriceEditor() {
  const { marketData, updateInstrumentPrice, resetInstrumentPrice, selectedSymbol, setSelectedSymbol, addToast } = useStrategyStore()
  const [open,    setOpen]    = useState(false)
  const [search,  setSearch]  = useState('')
  const [editing, setEditing] = useState<{symbol:string;field:'spot'|'futures';value:string}|null>(null)
  const [filter,  setFilter]  = useState<'all'|'index'|'stock'>('all')
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const items = marketData.filter(m => {
    const ms = m.symbol.toLowerCase().includes(search.toLowerCase()) || (m.sector?.toLowerCase().includes(search.toLowerCase()) ?? false)
    return ms && (filter === 'all' || m.category === filter)
  })

  const commit = () => {
    if (!editing) return
    const v = parseFloat(editing.value)
    if (!isNaN(v) && v > 0) { updateInstrumentPrice(editing.symbol, editing.field, v); addToast(`${editing.symbol} ${editing.field} → ₹${v.toLocaleString('en-IN')}`, 'success') }
    setEditing(null)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
          open ? "bg-blue-600/15 border-blue-500/50 text-blue-400" : "border-[#2a3040] text-gray-500 hover:border-gray-500 hover:text-gray-200 hover:bg-[#1a1f2e]")}>
        <Edit2 className="h-3.5 w-3.5"/>Edit Prices<ChevronDown className={cn("h-3 w-3 transition-transform",open&&"rotate-180")}/>
      </button>
      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-[540px] bg-[#0f1420] border border-[#1e2535] rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-[#1e2535]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Market Price Editor</p>
              <p className="text-[10px] text-gray-500">Click any price to edit — affects all pricing live</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-600"/>
                <input placeholder="Search symbol or sector..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-7 w-full bg-[#1e2535] border border-[#2a3040] rounded-lg text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60"/>
              </div>
              {(['all','index','stock'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("px-2.5 py-1 rounded text-xs border cursor-pointer capitalize transition-colors",
                    filter===f?'bg-blue-600/20 border-blue-500/50 text-blue-400':'border-[#1e2535] text-gray-600 hover:border-gray-600 hover:text-gray-400')}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1a1f2e]">
                <tr className="border-b border-[#1e2535]">
                  {['Symbol','Spot','Futures','Chg%',''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium text-[10px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.symbol} onClick={() => setSelectedSymbol(m.symbol)}
                    className={cn("border-b border-[#1e2535]/50 hover:bg-[#1a1f2e]/60 cursor-pointer transition-colors",
                      selectedSymbol===m.symbol&&"bg-blue-600/5 border-l-2 border-l-blue-500")}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full",m.category==='index'?'bg-blue-400':'bg-purple-400')}/>
                        <span className="font-semibold text-white">{m.symbol}</span>
                        {m.sector && <span className="text-gray-600 text-[10px]">{m.sector}</span>}
                      </div>
                    </td>
                    {(['spot','futures'] as const).map(field => (
                      <td key={field} className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                        {editing?.symbol===m.symbol && editing.field===field ? (
                          <div className="flex items-center gap-1">
                            <input autoFocus type="number" value={editing.value}
                              onChange={e => setEditing(ed => ed?{...ed,value:e.target.value}:ed)}
                              onKeyDown={e => {if(e.key==='Enter')commit();if(e.key==='Escape')setEditing(null)}}
                              className="w-20 bg-[#1e2535] border border-blue-500 rounded px-1 py-0.5 text-xs text-right font-mono text-white focus:outline-none"/>
                            <button onClick={commit} className="text-green-400 hover:text-green-300 cursor-pointer"><Check className="h-3.5 w-3.5"/></button>
                            <button onClick={()=>setEditing(null)} className="text-gray-500 hover:text-gray-300 cursor-pointer"><X className="h-3.5 w-3.5"/></button>
                          </div>
                        ) : (
                          <button onClick={()=>setEditing({symbol:m.symbol,field,value:(field==='spot'?m.spot:m.futures??m.spot).toString()})}
                            className={cn("font-mono hover:transition-colors group flex items-center gap-1 cursor-pointer",field==='spot'?'text-white hover:text-blue-400':'text-blue-400 hover:text-blue-300')}>
                            {(field==='spot'?m.spot:m.futures??m.spot).toLocaleString('en-IN',{maximumFractionDigits:2})}
                            <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60"/>
                          </button>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                      <span className={cn("flex items-center gap-0.5 font-mono tabular",m.changePct>=0?'text-green-400':'text-red-400')} suppressHydrationWarning>
                        {mounted?(m.changePct>=0?<TrendingUp className="h-2.5 w-2.5"/>:<TrendingDown className="h-2.5 w-2.5"/>):null}
                        {mounted?`${m.changePct>=0?'+':''}${m.changePct.toFixed(2)}%`:''}
                      </span>
                    </td>
                    <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>resetInstrumentPrice(m.symbol)} title="Reset"
                        className="text-gray-600 hover:text-yellow-400 cursor-pointer p-1 rounded hover:bg-yellow-400/10 transition-colors">
                        <RotateCcw className="h-3 w-3"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-[#1e2535] bg-[#1a1f2e]/50">
            <p className="text-[10px] text-gray-600"><span className="text-blue-400">●</span> Index &nbsp;<span className="text-purple-400">●</span> Stock &nbsp;·&nbsp; Click price → edit inline · Enter to confirm · ↺ reset</p>
          </div>
        </div>
      )}
    </div>
  )
}
