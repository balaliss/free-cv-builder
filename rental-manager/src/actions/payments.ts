"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const PaymentSchema = z.object({
  tenantId: z.string().min(1),
  unitId: z.string().min(1),
  amount: z.coerce.number().positive(),
  dueDate: z.string().min(1),
  paidDate: z.string().optional(),
  status: z.enum(["pending", "paid", "late"]).default("pending"),
  notes: z.string().optional(),
})

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function createPayment(formData: FormData) {
  const userId = await requireAuth()
  const parsed = PaymentSchema.parse({
    tenantId: formData.get("tenantId"),
    unitId: formData.get("unitId"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    paidDate: formData.get("paidDate") || undefined,
    status: formData.get("status") || "pending",
    notes: formData.get("notes") || undefined,
  })
  const tenant = await prisma.tenant.findFirst({ where: { id: parsed.tenantId, unit: { property: { userId } } } })
  if (!tenant) throw new Error("Tenant not found")
  await prisma.payment.create({
    data: {
      tenantId: parsed.tenantId,
      unitId: parsed.unitId,
      amount: parsed.amount,
      dueDate: new Date(parsed.dueDate),
      paidDate: parsed.paidDate ? new Date(parsed.paidDate) : null,
      status: parsed.status,
      notes: parsed.notes || null,
    },
  })
  revalidatePath("/payments")
  revalidatePath(`/tenants/${parsed.tenantId}`)
  revalidatePath("/dashboard")
  redirect("/payments")
}

export async function markPaymentPaid(id: string) {
  const userId = await requireAuth()
  const payment = await prisma.payment.findFirst({ where: { id, tenant: { unit: { property: { userId } } } } })
  if (!payment) throw new Error("Payment not found")
  await prisma.payment.update({ where: { id }, data: { status: "paid", paidDate: new Date() } })
  revalidatePath("/payments")
  revalidatePath(`/tenants/${payment.tenantId}`)
  revalidatePath("/dashboard")
}

export async function markPaymentLate(id: string) {
  const userId = await requireAuth()
  const payment = await prisma.payment.findFirst({ where: { id, tenant: { unit: { property: { userId } } } } })
  if (!payment) throw new Error("Payment not found")
  await prisma.payment.update({ where: { id }, data: { status: "late" } })
  revalidatePath("/payments")
  revalidatePath(`/tenants/${payment.tenantId}`)
  revalidatePath("/dashboard")
}

export async function deletePayment(id: string) {
  const userId = await requireAuth()
  const payment = await prisma.payment.findFirst({ where: { id, tenant: { unit: { property: { userId } } } } })
  if (!payment) throw new Error("Payment not found")
  await prisma.payment.delete({ where: { id } })
  revalidatePath("/payments")
  revalidatePath(`/tenants/${payment.tenantId}`)
  revalidatePath("/dashboard")
}
