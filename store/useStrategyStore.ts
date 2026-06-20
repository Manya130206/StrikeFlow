import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Strategy, OptionLeg, MarketData } from '@/lib/types'
import { MOCK_MARKET_DATA } from '@/lib/mockData'

// Freeze originals so reset always works
const ORIG = new Map(MOCK_MARKET_DATA.map(m => [m.symbol, { spot: m.spot, futures: m.futures }]))

export interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

interface Store {
  // Market
  selectedSymbol: string
  spotPrice: number
  marketData: MarketData[]
  setSelectedSymbol: (s: string) => void
  setSpotPrice: (p: number) => void
  updateInstrumentPrice: (symbol: string, field: 'spot' | 'futures', value: number) => void
  resetInstrumentPrice: (symbol: string) => void
  // Builder legs
  currentLegs: OptionLeg[]
  addLeg: (leg: OptionLeg) => void
  removeLeg: (id: string) => void
  updateLeg: (id: string, u: Partial<OptionLeg>) => void
  clearLegs: () => void
  // Saved
  savedStrategies: Strategy[]
  saveStrategy: (name: string) => void
  loadStrategy: (s: Strategy) => void
  deleteStrategy: (id: string) => void
  renameStrategy: (id: string, name: string) => void
  // Drafts
  drafts: Strategy[]
  saveDraft: (name: string) => void
  deleteDraft: (id: string) => void
  // Watchlist
  watchlist: string[]
  addToWatchlist: (sym: string) => void
  removeFromWatchlist: (sym: string) => void
  // Alerts
  alerts: { id: string; symbol: string; condition: string; threshold: number; active: boolean }[]
  addAlert: (symbol: string, condition: string, threshold: number) => void
  removeAlert: (id: string) => void
  toggleAlert: (id: string) => void
  // Toasts
  toasts: Toast[]
  addToast: (msg: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useStrategyStore = create<Store>()(
  persist(
    (set, get) => ({
      selectedSymbol: 'NIFTY',
      spotPrice: 24350,
      marketData: MOCK_MARKET_DATA,

      setSelectedSymbol: (symbol) => {
        const mkt = get().marketData.find(m => m.symbol === symbol)
        set({ selectedSymbol: symbol, spotPrice: mkt?.spot ?? 24350 })
      },
      setSpotPrice: (price) => {
        const { selectedSymbol } = get()
        set(s => ({ spotPrice: price, marketData: s.marketData.map(m => m.symbol === selectedSymbol ? { ...m, spot: price } : m) }))
      },
      updateInstrumentPrice: (symbol, field, value) =>
        set(s => ({
          marketData: s.marketData.map(m => m.symbol === symbol ? { ...m, [field]: value } : m),
          ...(field === 'spot' && symbol === s.selectedSymbol ? { spotPrice: value } : {}),
        })),
      resetInstrumentPrice: (symbol) => {
        const orig = ORIG.get(symbol)
        if (!orig) return
        set(s => ({
          marketData: s.marketData.map(m => m.symbol === symbol ? { ...m, ...orig } : m),
          ...(symbol === s.selectedSymbol ? { spotPrice: orig.spot } : {}),
        }))
        get().addToast(`${symbol} prices reset`, 'info')
      },

      currentLegs: [],
      addLeg: (leg) => set(s => ({ currentLegs: [...s.currentLegs, leg] })),
      removeLeg: (id) => set(s => ({ currentLegs: s.currentLegs.filter(l => l.id !== id) })),
      updateLeg: (id, u) => set(s => ({ currentLegs: s.currentLegs.map(l => l.id === id ? { ...l, ...u } : l) })),
      clearLegs: () => set({ currentLegs: [] }),

      savedStrategies: [],
      saveStrategy: (name) => {
        const { currentLegs } = get()
        if (!currentLegs.length) { get().addToast('Add legs first', 'error'); return }
        const s: Strategy = { id: Date.now().toString(), name, description: `${currentLegs.length} legs`, legs: [...currentLegs], createdAt: new Date().toISOString(), tags: [] }
        set(st => ({ savedStrategies: [...st.savedStrategies, s] }))
        get().addToast(`"${name}" saved`, 'success')
      },
      loadStrategy: (strategy) => { set({ currentLegs: [...strategy.legs] }); get().addToast(`Loaded "${strategy.name}"`, 'info') },
      deleteStrategy: (id) => set(s => ({ savedStrategies: s.savedStrategies.filter(x => x.id !== id) })),
      renameStrategy: (id, name) => set(s => ({ savedStrategies: s.savedStrategies.map(x => x.id === id ? { ...x, name } : x) })),

      drafts: [],
      saveDraft: (name) => {
        const { currentLegs } = get()
        if (!currentLegs.length) { get().addToast('Add legs first', 'error'); return }
        const d: Strategy = { id: Date.now().toString(), name: name || `Draft ${new Date().toLocaleTimeString()}`, description: 'Draft', legs: [...currentLegs], createdAt: new Date().toISOString(), tags: ['draft'] }
        set(s => ({ drafts: [...s.drafts, d] }))
        get().addToast('Saved to drafts', 'success')
      },
      deleteDraft: (id) => set(s => ({ drafts: s.drafts.filter(x => x.id !== id) })),

      watchlist: ['NIFTY', 'BANKNIFTY'],
      addToWatchlist: (sym) => {
        if (get().watchlist.includes(sym)) return
        set(s => ({ watchlist: [...s.watchlist, sym] }))
        get().addToast(`${sym} added to watchlist`, 'success')
      },
      removeFromWatchlist: (sym) => set(s => ({ watchlist: s.watchlist.filter(w => w !== sym) })),

      alerts: [],
      addAlert: (symbol, condition, threshold) => {
        set(s => ({ alerts: [...s.alerts, { id: Date.now().toString(), symbol, condition, threshold, active: true }] }))
        get().addToast(`Alert set: ${symbol} ${condition.replace('_',' ')} ${threshold}`, 'success')
      },
      removeAlert: (id) => set(s => ({ alerts: s.alerts.filter(a => a.id !== id) })),
      toggleAlert: (id) => set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, active: !a.active } : a) })),

      toasts: [],
      addToast: (message, type = 'info') => {
        const id = Date.now().toString()
        set(s => ({ toasts: [...s.toasts.slice(-4), { id, message, type }] }))
        setTimeout(() => get().removeToast(id), 3500)
      },
      removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    }),
    {
      name: 'strikeflow-v2',
      partialize: s => ({ savedStrategies: s.savedStrategies, drafts: s.drafts, watchlist: s.watchlist, alerts: s.alerts }),
    }
  )
)
