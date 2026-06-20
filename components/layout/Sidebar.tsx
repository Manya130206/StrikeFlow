"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BarChart3, BookOpen, TrendingUp, Activity, Zap, ChevronRight, Target, Star } from 'lucide-react'
import { useStrategyStore } from '@/store/useStrategyStore'

const NAV = [
  { href:'/',          icon:TrendingUp, label:'Dashboard'        },
  { href:'/builder',   icon:Zap,        label:'Strategy Builder' },
  { href:'/chain',     icon:BarChart3,  label:'Option Chain'     },
  { href:'/analytics', icon:Activity,   label:'IV Analytics'     },
  { href:'/scanner',   icon:Target,     label:'Scanner'          },
  { href:'/positions', icon:BookOpen,   label:'Positions'        },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { watchlist, selectedSymbol, setSelectedSymbol, savedStrategies, alerts, marketData } = useStrategyStore()
  const activeAlerts = alerts.filter(a => a.active).length

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col border-r border-[#1e2535]" style={{background:'#0a0e17'}}>
      <div className="p-4 border-b border-[#1e2535]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Zap className="h-4 w-4 text-white"/>
          </div>
          <div>
            <p className="font-bold text-sm text-white">StrikeFlow</p>
            <p className="text-[10px] text-gray-500">Options Analytics</p>
          </div>
        </div>
      </div>

      <nav className="p-2.5 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                active ? "bg-blue-600/15 text-blue-400 border border-blue-600/20" : "text-gray-500 hover:text-gray-200 hover:bg-[#1a1f2e]")}>
              <item.icon className="h-4 w-4 flex-shrink-0"/>
              <span className="flex-1 text-xs font-medium">{item.label}</span>
              {item.href === '/positions' && savedStrategies.length > 0 && (
                <span className="bg-blue-600/30 text-blue-400 text-[9px] px-1.5 rounded-full">{savedStrategies.length}</span>
              )}
              {active && <ChevronRight className="h-3 w-3 opacity-60"/>}
            </Link>
          )
        })}
      </nav>

      {watchlist.length > 0 && (
        <div className="mx-2.5 mt-2 border border-[#1e2535] rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-[#1a1f2e] flex items-center gap-1.5">
            <Star className="h-3 w-3 text-yellow-400"/>
            <span className="text-[10px] text-gray-400 font-medium">Watchlist</span>
          </div>
          {watchlist.map(sym => {
            const m = marketData.find(d => d.symbol === sym)
            return (
              <button key={sym} onClick={() => setSelectedSymbol(sym)}
                className={cn("flex items-center justify-between w-full px-3 py-1.5 hover:bg-[#1a1f2e] transition-colors cursor-pointer border-t border-[#1e2535]",
                  selectedSymbol === sym && "bg-blue-600/5")}>
                <span className={cn("text-[10px] font-semibold", selectedSymbol === sym ? 'text-blue-400' : 'text-gray-400')}>{sym}</span>
                {m && <span className={cn("text-[10px] font-mono tabular", m.changePct >= 0 ? 'text-green-400' : 'text-red-400')} suppressHydrationWarning>
                  {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(1)}%
                </span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex-1"/>
      <div className="p-3 border-t border-[#1e2535] space-y-1.5">
        {activeAlerts > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-600/10 border border-blue-600/20">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse flex-shrink-0"/>
            <span className="text-[10px] text-blue-400">{activeAlerts} alert{activeAlerts !== 1 ? 's' : ''} active</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1a1f2e]">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0"/>
          <span className="text-[10px] text-gray-500">Simulator Active</span>
        </div>
      </div>
    </aside>
  )
}
