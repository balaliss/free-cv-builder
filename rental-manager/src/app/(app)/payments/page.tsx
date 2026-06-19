import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge"
import Link from "next/link"
import { Plus, Download } from "lucide-react"
import { format } from "date-fns"
import { markPaymentPaid, markPaymentLate, deletePayment } from "@/actions/payments"
import { PaymentsFilter } from "@/components/payments/PaymentsFilter"
import { Suspense } from "react"

type SearchParams = { status?: string; month?: string }

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  const userId = session!.user!.id!
  const sp = await searchParams
  const statusFilter = sp.status
  const monthFilter = sp.month

  const where: Record<string, unknown> = { tenant: { unit: { property: { userId } } } }
  if (statusFilter && ["pending", "paid", "late"].includes(statusFilter)) where.status = statusFilter
  if (monthFilter) {
    const [year, mon] = monthFilter.split("-").map(Number)
    where.dueDate = { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) }
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      tenant: { select: { name: true, id: true } },
      unit: { select: { unitNumber: true, property: { select: { name: true } } } },
    },
    orderBy: { dueDate: "desc" },
    take: 100,
  })

  const exportParams = new URLSearchParams()
  if (statusFilter) exportParams.set("status", statusFilter)
  if (monthFilter) exportParams.set("month", monthFilter)
  const exportUrl = `/api/export/payments${exportParams.size > 0 ? "?" + exportParams.toString() : ""}`

  return (
    <div>
      <PageHeader title="Payments" subtitle={`${payments.length} records`}
        action={
          <div className="flex items-center gap-2">
            <a href={exportUrl} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </a>
            <Link href="/payments/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
              <Plus className="w-4 h-4" /> Log Payment
            </Link>
          </div>
        } />
      <Suspense fallback={null}><PaymentsFilter /></Suspense>
      {payments.length === 0 ? (
        <EmptyState title="No payments found" description="Log your first rent payment to start tracking."
          action={<Link href="/payments/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"><Plus className="w-4 h-4" /> Log Payment</Link>} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tenant</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Due</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium"><Link href={`/tenants/${p.tenant.id}`} className="hover:text-indigo-600">{p.tenant.name}</Link></td>
                  <td className="px-5 py-3 text-slate-600">{p.unit.property.name} #{p.unit.unitNumber}</td>
                  <td className="px-5 py-3 text-slate-600">{format(p.dueDate, "MMM d, yyyy")}</td>
                  <td className="px-5 py-3 font-medium">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-5 py-3"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.status !== "paid" && <form action={markPaymentPaid.bind(null, p.id)}><button type="submit" className="text-xs text-green-700 hover:text-green-900 font-medium">Paid</button></form>}
                      {p.status === "pending" && <form action={markPaymentLate.bind(null, p.id)}><button type="submit" className="text-xs text-red-600 hover:text-red-800 font-medium">Late</button></form>}
                      <form action={deletePayment.bind(null, p.id)}><button type="submit" className="text-xs text-slate-400 hover:text-slate-600">Delete</button></form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
