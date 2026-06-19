import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { TenantForm } from "@/components/tenants/TenantForm"
import { createTenant } from "@/actions/tenants"

export default async function NewTenantPage() {
  const session = await auth()
  const userId = session!.user!.id!
  const units = await prisma.unit.findMany({
    where: { property: { userId } },
    include: { property: { select: { name: true } } },
    orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
  })
  return (
    <div>
      <PageHeader title="Add Tenant" subtitle="Link a new tenant to a unit" />
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <TenantForm units={units} action={createTenant} submitLabel="Create Tenant" />
      </div>
    </div>
  )
}
