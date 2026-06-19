"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const UnitSchema = z.object({
  unitNumber: z.string().min(1),
  monthlyRent: z.coerce.number().positive(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
})

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

async function verifyPropertyOwner(propertyId: string, userId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId } })
  if (!property) throw new Error("Property not found")
  return property
}

export async function createUnit(propertyId: string, formData: FormData) {
  const userId = await requireAuth()
  await verifyPropertyOwner(propertyId, userId)
  const parsed = UnitSchema.parse({
    unitNumber: formData.get("unitNumber"),
    monthlyRent: formData.get("monthlyRent"),
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
  })
  await prisma.unit.create({
    data: {
      propertyId,
      unitNumber: parsed.unitNumber,
      monthlyRent: parsed.monthlyRent,
      bedrooms: parsed.bedrooms ?? null,
      bathrooms: parsed.bathrooms ?? null,
    },
  })
  revalidatePath(`/properties/${propertyId}`)
  redirect(`/properties/${propertyId}`)
}

export async function updateUnit(id: string, propertyId: string, formData: FormData) {
  const userId = await requireAuth()
  await verifyPropertyOwner(propertyId, userId)
  const parsed = UnitSchema.parse({
    unitNumber: formData.get("unitNumber"),
    monthlyRent: formData.get("monthlyRent"),
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
  })
  await prisma.unit.update({
    where: { id },
    data: {
      unitNumber: parsed.unitNumber,
      monthlyRent: parsed.monthlyRent,
      bedrooms: parsed.bedrooms ?? null,
      bathrooms: parsed.bathrooms ?? null,
    },
  })
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath(`/units/${id}`)
  redirect(`/properties/${propertyId}`)
}

export async function deleteUnit(id: string, propertyId: string) {
  const userId = await requireAuth()
  await verifyPropertyOwner(propertyId, userId)
  const activeTenants = await prisma.tenant.count({ where: { unitId: id, status: "active" } })
  if (activeTenants > 0) throw new Error("Cannot delete a unit with active tenants")
  await prisma.unit.delete({ where: { id } })
  revalidatePath(`/properties/${propertyId}`)
  redirect(`/properties/${propertyId}`)
}
