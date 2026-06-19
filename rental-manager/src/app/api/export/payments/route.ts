import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { unparse } from "papaparse"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month")
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {
    tenant: { unit: { property: { userId: session.user.id } } },
  }
  if (status && ["pending", "paid", "late"].includes(status)) where.status = status
  if (month) {
    const [year, mon] = month.split("-").map(Number)
    where.dueDate = { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) }
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      tenant: { select: { name: true, email: true } },
      unit: { select: { unitNumber: true, property: { select: { name: true } } } },
    },
    orderBy: { dueDate: "desc" },
  })

  const rows = payments.map((p) => ({
    Property: p.unit.property.name,
    Unit: p.unit.unitNumber,
    Tenant: p.tenant.name,
    "Tenant Email": p.tenant.email ?? "",
    "Due Date": p.dueDate.toISOString().slice(0, 10),
    "Paid Date": p.paidDate?.toISOString().slice(0, 10) ?? "",
    Amount: p.amount.toString(),
    Status: p.status,
    Notes: p.notes ?? "",
  }))

  const csv = unparse(rows)
  const filename = month ? `payments-${month}.csv` : "payments-all.csv"
  return new Response(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${filename}"` },
  })
}
