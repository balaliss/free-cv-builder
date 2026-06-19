"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const PropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  description: z.string().optional(),
})

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function createProperty(formData: FormData) {
  const userId = await requireAuth()
  const parsed = PropertySchema.parse({
    name: formData.get("name"),
    address: formData.get("address"),
    description: formData.get("description") || undefined,
  })
  const property = await prisma.property.create({ data: { ...parsed, userId } })
  revalidatePath("/properties")
  revalidatePath("/dashboard")
  redirect(`/properties/${property.id}`)
}

export async function updateProperty(id: string, formData: FormData) {
  const userId = await requireAuth()
  const property = await prisma.property.findFirst({ where: { id, userId } })
  if (!property) throw new Error("Property not found")
  const parsed = PropertySchema.parse({
    name: formData.get("name"),
    address: formData.get("address"),
    description: formData.get("description") || undefined,
  })
  await prisma.property.update({ where: { id }, data: parsed })
  revalidatePath("/properties")
  revalidatePath(`/properties/${id}`)
  redirect(`/properties/${id}`)
}

export async function deleteProperty(id: string) {
  const userId = await requireAuth()
  const property = await prisma.property.findFirst({ where: { id, userId } })
  if (!property) throw new Error("Property not found")
  await prisma.property.delete({ where: { id } })
  revalidatePath("/properties")
  revalidatePath("/dashboard")
  redirect("/properties")
}
