import { PageHeader } from "@/components/shared/PageHeader"
import { PropertyForm } from "@/components/properties/PropertyForm"
import { createProperty } from "@/actions/properties"

export default function NewPropertyPage() {
  return (
    <div>
      <PageHeader title="Add Property" subtitle="Add a new rental property to your portfolio" />
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PropertyForm action={createProperty} submitLabel="Create Property" />
      </div>
    </div>
  )
}
