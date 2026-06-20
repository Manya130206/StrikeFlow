"use client"
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import SensibullBuilder from '@/components/strategy/SensibullBuilder'

export default function BuilderPage() {
  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        {/* Full height split-panel builder — no extra padding */}
        <div className="flex-1 overflow-hidden">
          <SensibullBuilder />
        </div>
      </div>
    </div>
  )
}
