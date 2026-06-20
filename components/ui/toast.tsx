"use client"
import { useEffect } from 'react'
import { useStrategyStore } from '@/store/useStrategyStore'
import { CheckCircle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ToastContainer() {
  const { toasts, removeToast } = useStrategyStore()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl text-sm pointer-events-auto",
            "border backdrop-blur-sm animate-in slide-in-from-right-5 duration-200",
            t.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-200' :
            t.type === 'error'   ? 'bg-red-900/90 border-red-700 text-red-200' :
                                   'bg-[#1a1f2e]/95 border-[#2a3040] text-gray-200'
          )}>
          {t.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0"/> :
           t.type === 'error'   ? <XCircle className="h-4 w-4 text-red-400 flex-shrink-0"/> :
                                  <Info className="h-4 w-4 text-blue-400 flex-shrink-0"/>}
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-1 text-gray-500 hover:text-gray-300">
            <X className="h-3.5 w-3.5"/>
          </button>
        </div>
      ))}
    </div>
  )
}
