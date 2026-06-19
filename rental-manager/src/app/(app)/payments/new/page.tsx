import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { PaymentForm } from "@/components/payments/PaymentForm"
import { createPayment } from "@/actions/payments"

export default async function NewPaymentPage() {
  const session = await auth()
  const userId = session!.user!.id!
  const tenants = await prisma.tenant.findMany({
    where: { status: "active", unit: { property: { userId } } },
    include: { unit: { include: { property: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  })
  return (
    <div>
      <PageHeader title="Log Payment" subtitle="Record a rent payment" />
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PaymentForm tenants={tenants} action={createPayment} />
      </div>
    </div>
  )
}
