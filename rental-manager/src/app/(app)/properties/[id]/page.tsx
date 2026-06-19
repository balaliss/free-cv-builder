import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import Link from "next/link"
import { Plus, Pencil, MapPin } from "lucide-react"
import { createUnit } from "@/actions/units"
import { TenantStatusBadge } from "@/components/tenants/TenantStatusBadge"
import { format } from "date-fns"

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id!
  const property = await prisma.property.findFirst({
    where: { id, userId },
    include: {
      units: {
        include: {
          tenants: { orderBy: { createdAt: "desc" }, take: 1 },
          payments: { where: { status: { in: ["pending", "late"] } }, orderBy: { dueDate: "asc" }, take: 1 },
        },
        orderBy: { unitNumber: "asc" },
      },
    },
  })
  if (!property) notFound()
  const boundCreateUnit = createUnit.bind(null, id)
  return (
    <div>
      <PageHeader title={property.name} subtitle={property.address}
        action={<Link href={`/properties/${id}/edit`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</Link>} />
      {property.description && (
        <div className="mb-6 flex items-start gap-2 text-sm text-slate-500">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{property.description}</p>
        </div>
      )}
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900">Units ({property.units.length})</h2>
      </div>
      {property.units.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center mb-6">
          <p className="text-sm text-slate-500 mb-4">No units yet. Add the first unit below.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {property.units.map((unit) => {
            const activeTenant = unit.tenants[0]
            const pendingPayment = unit.payments[0]
            return (
              <Link key={unit.id} href={`/units/${unit.id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-900 text-sm">Unit #{unit.unitNumber}</span>
                  {activeTenant ? <TenantStatusBadge status={activeTenant.status} /> : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Vacant</span>
                  )}
                </div>
                <p className="text-lg font-semibold text-slate-900">${Number(unit.monthlyRent).toLocaleString()}/mo</p>
                {unit.bedrooms != null && (
                  <p className="text-xs text-slate-400 mt-1">{unit.bedrooms} bed{unit.bathrooms != null && ` · ${Number(unit.bathrooms)} bath`}</p>
                )}
                {activeTenant && <p className="text-xs text-slate-600 mt-2 font-medium">{activeTenant.name}</p>}
                {pendingPayment && (
                  <p className="text-xs text-amber-600 mt-1">${Number(pendingPayment.amount).toFixed(2)} due {format(pendingPayment.dueDate, "MMM d")}</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Unit</h3>
        <form action={boundCreateUnit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit number <span className="text-red-500">*</span></label>
              <input name="unitNumber" required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="1A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly rent <span className="text-red-500">*</span></label>
              <input name="monthlyRent" type="number" step="0.01" min="0" required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="1500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label>
              <input name="bedrooms" type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label>
              <input name="bathrooms" type="number" step="0.5" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="1" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">Add Unit</button>
        </form>
      </div>
    </div>
  )
}
