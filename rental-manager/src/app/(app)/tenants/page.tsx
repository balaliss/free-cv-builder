import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge"
import Link from "next/link"
import { Plus, ChevronRight } from "lucide-react"
import { format } from "date-fns"

export default async function TenantsPage() {
  const session = await auth()
  const userId = session!.user!.id!
  const tenants = await prisma.tenant.findMany({
    where: { unit: { property: { userId } } },
    include: { unit: { include: { property: { select: { name: true } } } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  })
  const activeTenants = tenants.filter((t) => t.status === "active")
  const pastTenants = tenants.filter((t) => t.status === "past")
  return (
    <div>
      <PageHeader title="Tenants" subtitle={`${activeTenants.length} active · ${pastTenants.length} past`}
        action={<Link href="/tenants/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"><Plus className="w-4 h-4" /> Add Tenant</Link>} />
      {tenants.length === 0 ? (
        <EmptyState title="No tenants yet" description="Add a tenant and link them to a unit."
          action={<Link href="/tenants/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"><Plus className="w-4 h-4" /> Add Tenant</Link>} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Unit</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Lease End</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-5 py-3 text-slate-600">{t.unit.property.name} #{t.unit.unitNumber}</td>
                  <td className="px-5 py-3 text-slate-600">{format(t.leaseEnd, "MMM d, yyyy")}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{t.email && <div>{t.email}</div>}{t.phone && <div>{t.phone}</div>}</td>
                  <td className="px-5 py-3"><TenantStatusBadge status={t.status} /></td>
                  <td className="px-5 py-3"><Link href={`/tenants/${t.id}`} className="text-slate-400 hover:text-slate-600"><ChevronRight className="w-4 h-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
