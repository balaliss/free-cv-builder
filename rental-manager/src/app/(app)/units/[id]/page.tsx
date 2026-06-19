import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge"
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge"
import Link from "next/link"
import { format } from "date-fns"
import { markPaymentPaid } from "@/actions/payments"
import { deleteUnit } from "@/actions/units"
import { ChevronRight } from "lucide-react"

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id!
  const unit = await prisma.unit.findFirst({
    where: { id, property: { userId } },
    include: {
      property: true,
      tenants: { orderBy: { leaseStart: "desc" } },
      payments: { include: { tenant: { select: { name: true } } }, orderBy: { dueDate: "desc" }, take: 20 },
    },
  })
  if (!unit) notFound()
  const activeTenant = unit.tenants.find((t) => t.status === "active")
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/properties" className="hover:text-slate-900">Properties</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/properties/${unit.propertyId}`} className="hover:text-slate-900">{unit.property.name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900">Unit #{unit.unitNumber}</span>
      </div>
      <PageHeader title={`Unit #${unit.unitNumber}`} subtitle={`${unit.property.name} · $${Number(unit.monthlyRent).toLocaleString()}/mo`}
        action={<Link href="/tenants/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">Add Tenant</Link>} />
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Unit Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Monthly Rent</dt><dd className="font-medium">${Number(unit.monthlyRent).toLocaleString()}</dd></div>
            {unit.bedrooms != null && <div className="flex justify-between"><dt className="text-slate-500">Bedrooms</dt><dd className="font-medium">{unit.bedrooms}</dd></div>}
            {unit.bathrooms != null && <div className="flex justify-between"><dt className="text-slate-500">Bathrooms</dt><dd className="font-medium">{Number(unit.bathrooms)}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{activeTenant ? <TenantStatusBadge status="active" /> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Vacant</span>}</dd></div>
          </dl>
        </div>
        {activeTenant && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Current Tenant</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium"><Link href={`/tenants/${activeTenant.id}`} className="hover:text-indigo-600">{activeTenant.name}</Link></dd></div>
              {activeTenant.email && <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{activeTenant.email}</dd></div>}
              {activeTenant.phone && <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd>{activeTenant.phone}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Lease</dt><dd>{format(activeTenant.leaseStart, "MMM d, yyyy")} – {format(activeTenant.leaseEnd, "MMM d, yyyy")}</dd></div>
            </dl>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Payment History</h2>
          <Link href="/payments/new" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Log payment</Link>
        </div>
        {unit.payments.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No payments recorded yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tenant</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Due</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {unit.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{p.tenant.name}</td>
                  <td className="px-5 py-3 text-slate-600">{format(p.dueDate, "MMM d, yyyy")}</td>
                  <td className="px-5 py-3 font-medium">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-5 py-3"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3">{p.status !== "paid" && <form action={markPaymentPaid.bind(null, p.id)}><button type="submit" className="text-xs text-green-700 hover:text-green-900 font-medium">Mark paid</button></form>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!activeTenant && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
          <form action={deleteUnit.bind(null, id, unit.propertyId)}>
            <button type="submit" className="text-sm font-medium text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors">Delete Unit</button>
          </form>
        </div>
      )}
    </div>
  )
}
