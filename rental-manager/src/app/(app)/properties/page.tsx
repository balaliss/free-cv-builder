import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import Link from "next/link"
import { Building2, ChevronRight, Plus } from "lucide-react"

export default async function PropertiesPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const properties = await prisma.property.findMany({
    where: { userId },
    include: { units: { include: { tenants: { where: { status: "active" } } } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
        action={
          <Link href="/properties/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
            <Plus className="w-4 h-4" /> Add Property
          </Link>
        }
      />
      {properties.length === 0 ? (
        <EmptyState title="No properties yet" description="Add your first rental property to get started."
          action={<Link href="/properties/new" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"><Plus className="w-4 h-4" /> Add Property</Link>} />
      ) : (
        <div className="space-y-3">
          {properties.map((p) => {
            const totalUnits = p.units.length
            const occupiedUnits = p.units.filter((u) => u.tenants.length > 0).length
            const monthlyRentTotal = p.units.reduce((sum, u) => sum + Number(u.monthlyRent), 0)
            return (
              <Link key={p.id} href={`/properties/${p.id}`}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{p.address}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center"><p className="font-semibold text-slate-900">{totalUnits}</p><p className="text-xs text-slate-400">units</p></div>
                  <div className="text-center"><p className="font-semibold text-slate-900">{occupiedUnits}/{totalUnits}</p><p className="text-xs text-slate-400">occupied</p></div>
                  <div className="text-center"><p className="font-semibold text-slate-900">${monthlyRentTotal.toLocaleString()}</p><p className="text-xs text-slate-400">monthly</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
