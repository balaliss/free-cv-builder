"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const TenantSchema = z.object({
  unitId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  leaseStart: z.string().min(1),
  leaseEnd: z.string().min(1),
  status: z.enum(["active", "past"]).default("active"),
})

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function createTenant(formData: FormData) {
  const userId = await requireAuth()
  const parsed = TenantSchema.parse({
    unitId: formData.get("unitId"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    leaseStart: formData.get("leaseStart"),
    leaseEnd: formData.get("leaseEnd"),
    status: formData.get("status") || "active",
  })
  const unit = await prisma.unit.findFirst({ where: { id: parsed.unitId, property: { userId } } })
  if (!unit) throw new Error("Unit not found")
  const tenant = await prisma.tenant.create({
    data: {
      unitId: parsed.unitId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      leaseStart: new Date(parsed.leaseStart),
      leaseEnd: new Date(parsed.leaseEnd),
      status: parsed.status,
    },
  })
  revalidatePath("/tenants")
  revalidatePath(`/units/${parsed.unitId}`)
  revalidatePath("/dashboard")
  redirect(`/tenants/${tenant.id}`)
}

export async function updateTenant(id: string, formData: FormData) {
  const userId = await requireAuth()
  const tenant = await prisma.tenant.findFirst({ where: { id, unit: { property: { userId } } } })
  if (!tenant) throw new Error("Tenant not found")
  const parsed = TenantSchema.parse({
    unitId: formData.get("unitId"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    leaseStart: formData.get("leaseStart"),
    leaseEnd: formData.get("leaseEnd"),
    status: formData.get("status") || "active",
  })
  await prisma.tenant.update({
    where: { id },
    data: {
      unitId: parsed.unitId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      leaseStart: new Date(parsed.leaseStart),
      leaseEnd: new Date(parsed.leaseEnd),
      status: parsed.status,
    },
  })
  revalidatePath("/tenants")
  revalidatePath(`/tenants/${id}`)
  revalidatePath("/dashboard")
  redirect(`/tenants/${id}`)
}

export async function archiveTenant(id: string) {
  const userId = await requireAuth()
  const tenant = await prisma.tenant.findFirst({ where: { id, unit: { property: { userId } } } })
  if (!tenant) throw new Error("Tenant not found")
  await prisma.tenant.update({ where: { id }, data: { status: "past" } })
  revalidatePath("/tenants")
  revalidatePath(`/tenants/${id}`)
  revalidatePath("/dashboard")
  redirect("/tenants")
}
