import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge"
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge"
import { TenantForm } from "@/components/tenants/TenantForm"
import { updateTenant, archiveTenant } from "@/actions/tenants"
import { markPaymentPaid, markPaymentLate } from "@/actions/payments"
import Link from "next/link"
import { format } from "date-fns"
import { Mail, Phone } from "lucide-react"

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id!
  const [tenant, allUnits] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id, unit: { property: { userId } } },
      include: {
        unit: { include: { property: { select: { name: true } } } },
        payments: { orderBy: { dueDate: "desc" } },
      },
    }),
    prisma.unit.findMany({
      where: { property: { userId } },
      include: { property: { select: { name: true } } },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    }),
  ])
  if (!tenant) notFound()
  const totalPaid = tenant.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0)
  const boundUpdate = updateTenant.bind(null, id)
  return (
    <div>
      <PageHeader title={tenant.name} subtitle={`${tenant.unit.property.name} · Unit #${tenant.unit.unitNumber}`} action={<TenantStatusBadge status={tenant.status} />} />
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Contact Info</h2>
          <dl className="space-y-2 text-sm">
            {tenant.email && <div className="flex items-center gap-2 text-slate-700"><Mail className="w-4 h-4 text-slate-400" /><a href={`mailto:${tenant.email}`} className="hover:text-indigo-600">{tenant.email}</a></div>}
            {tenant.phone && <div className="flex items-center gap-2 text-slate-700"><Phone className="w-4 h-4 text-slate-400" /><a href={`tel:${tenant.phone}`} className="hover:text-indigo-600">{tenant.phone}</a></div>}
            {!tenant.email && !tenant.phone && <p className="text-slate-400">No contact info</p>}
          </dl>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Lease</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd>{format(tenant.leaseStart, "MMM d, yyyy")}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">End</dt><dd>{format(tenant.leaseEnd, "MMM d, yyyy")}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Total Paid</dt><dd className="font-semibold text-green-700">${totalPaid.toLocaleString()}</dd></div>
          </dl>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Payment History ({tenant.payments.length})</h2>
          <Link href="/payments/new" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Log payment</Link>
        </div>
        {tenant.payments.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No payments recorded yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Due</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Paid</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tenant.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{format(p.dueDate, "MMM d, yyyy")}</td>
                  <td className="px-5 py-3 text-slate-600">{p.paidDate ? format(p.paidDate, "MMM d, yyyy") : "—"}</td>
                  <td className="px-5 py-3 font-medium">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-5 py-3"><PaymentStatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{p.notes ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.status !== "paid" && <form action={markPaymentPaid.bind(null, p.id)}><button type="submit" className="text-xs text-green-700 hover:text-green-900 font-medium">Mark paid</button></form>}
                      {p.status === "pending" && <form action={markPaymentLate.bind(null, p.id)}><button type="submit" className="text-xs text-red-600 hover:text-red-800 font-medium">Mark late</button></form>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 text-sm mb-4">Edit Tenant</h2>
        <TenantForm units={allUnits} action={boundUpdate}
          defaultValues={{
            unitId: tenant.unitId, name: tenant.name, email: tenant.email ?? undefined,
            phone: tenant.phone ?? undefined,
            leaseStart: tenant.leaseStart.toISOString().slice(0, 10),
            leaseEnd: tenant.leaseEnd.toISOString().slice(0, 10),
            status: tenant.status,
          }}
          submitLabel="Save Changes" />
      </div>
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Archive Tenant</h3>
        <p className="text-sm text-slate-500 mb-4">This marks the tenant as past. Their payment history is preserved.</p>
        <form action={archiveTenant.bind(null, id)}>
          <button type="submit" className="text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors">Archive Tenant</button>
        </form>
      </div>
    </div>
  )
}
