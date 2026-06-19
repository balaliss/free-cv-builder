"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Late", value: "late" },
]

export function PaymentsFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusFilter = searchParams.get("status") ?? ""
  const monthFilter = searchParams.get("month") ?? ""

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set("month", e.target.value)
    else params.delete("month")
    router.push(`/payments?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <span className="text-sm text-slate-500 font-medium">Filter:</span>
      {STATUS_OPTIONS.map(({ label, value }) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) params.set("status", value)
        else params.delete("status")
        return (
          <Link key={value} href={`/payments?${params.toString()}`}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === value
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}>{label}</Link>
        )
      })}
      <input type="month" value={monthFilter} onChange={handleMonthChange}
        className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  )
}
