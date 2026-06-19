import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { PropertyForm } from "@/components/properties/PropertyForm"
import { updateProperty, deleteProperty } from "@/actions/properties"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.id!
  const property = await prisma.property.findFirst({ where: { id, userId } })
  if (!property) notFound()
  const boundUpdate = updateProperty.bind(null, id)
  const boundDelete = deleteProperty.bind(null, id)
  return (
    <div>
      <PageHeader title="Edit Property" />
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
        <PropertyForm action={boundUpdate} defaultValues={{ name: property.name, address: property.address, description: property.description ?? undefined }} submitLabel="Save Changes" />
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-sm text-slate-500 mb-4">Deleting this property will also delete all its units. Active tenants must be removed first.</p>
          <form action={boundDelete}>
            <button type="submit" className="text-sm font-medium text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors">Delete Property</button>
          </form>
        </div>
      </div>
    </div>
  )
}
