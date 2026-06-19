import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Building2, Users, CreditCard, AlertTriangle } from "lucide-react"
import { StatCard } from "@/components/dashboard/StatCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge"
import { format, startOfMonth, endOfMonth, addDays } from "date-fns"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const sevenDaysLater = addDays(now, 7)

  const [properties, overdueCount, monthlyPayments, upcomingPayments, tenantCount] = await Promise.all([
    prisma.property.findMany({ where: { userId }, include: { units: { include: { tenants: { where: { status: "active" } } } } } }),
    prisma.payment.count({ where: { status: "late", tenant: { unit: { property: { userId } } } } }),
    prisma.payment.aggregate({ where: { status: { not: "paid" }, dueDate: { gte: monthStart, lte: monthEnd }, tenant: { unit: { property: { userId } } } }, _sum: { amount: true } }),
    prisma.payment.findMany({
      where: { status: { in: ["pending", "late"] }, dueDate: { lte: sevenDaysLater }, tenant: { unit: { property: { userId } } } },
      include: { tenant: { select: { name: true } }, unit: { select: { unitNumber: true, property: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" }, take: 10,
    }),
    prisma.tenant.count({ where: { status: "active", unit: { property: { userId } } } }),
  ])

  const totalUnits = properties.reduce((sum, p) => sum + p.units.length, 0)
  const occupiedUnits = properties.reduce((sum, p) => sum + p.units.filter((u) => u.tenants.length > 0).length, 0)
  const rentDue = monthlyPayments._sum.amount
    ? Number(monthlyPayments._sum.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$0"

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={format(now, "MMMM yyyy")} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Units" value={totalUnits} sub={`${properties.length} ${properties.length === 1 ? "property" : "properties"}`} icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Occupied" value={`${occupiedUnits}/${totalUnits}`} sub={`${tenantCount} active tenants`} icon={<Users className="w-5 h-5" />} accent="green" />
        <StatCard label="Rent Due This Month" value={rentDue} sub="unpaid" icon={<CreditCard className="w-5 h-5" />} accent="yellow" />
        <StatCard label="Overdue" value={overdueCount} sub="late payments" icon={<AlertTriangle className="w-5 h-5" />} accent={overdueCount > 0 ? "red" : "default"} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Due in the Next 7 Days</h2>
          <Link href="/payments" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
        </div>
        {upcomingPayments.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No payments due in the next 7 days</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tenant</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium"><Link href={`/tenants/${p.tenantId}`} className="hover:text-indigo-600">{p.tenant.name}</Link></td>
                  <td className="px-5 py-3 text-slate-600">{p.unit.property.name} #{p.unit.unitNumber}</td>
                  <td className="px-5 py-3 text-slate-600">{format(p.dueDate, "MMM d, yyyy")}</td>
                  <td className="px-5 py-3">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-5 py-3"><PaymentStatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
