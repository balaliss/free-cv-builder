import type { ReactNode } from "react"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: ReactNode
  accent?: "default" | "green" | "red" | "yellow"
}

const accentStyles = {
  default: "bg-indigo-50 text-indigo-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-600",
}

export function StatCard({ label, value, sub, icon, accent = "default" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accentStyles[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
