"use client"

import type { Unit, Property } from "@/generated/prisma/client"

type UnitWithProperty = Unit & { property: Pick<Property, "name"> }

interface TenantFormProps {
  units: UnitWithProperty[]
  action: (formData: FormData) => void | Promise<void>
  defaultValues?: {
    unitId?: string; name?: string; email?: string; phone?: string
    leaseStart?: string; leaseEnd?: string; status?: string
  }
  submitLabel?: string
}

export function TenantForm({ units, action, defaultValues, submitLabel = "Save" }: TenantFormProps) {
  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit <span className="text-red-500">*</span></label>
        <select name="unitId" required defaultValue={defaultValues?.unitId}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
          <option value="">Select a unit…</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.property.name} · Unit #{u.unitNumber} — ${Number(u.monthlyRent).toLocaleString()}/mo</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full name <span className="text-red-500">*</span></label>
        <input name="name" required defaultValue={defaultValues?.name}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Jane Smith" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input name="email" type="email" defaultValue={defaultValues?.email}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="jane@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input name="phone" type="tel" defaultValue={defaultValues?.phone}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="(555) 000-0000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lease start <span className="text-red-500">*</span></label>
          <input name="leaseStart" type="date" required defaultValue={defaultValues?.leaseStart}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lease end <span className="text-red-500">*</span></label>
          <input name="leaseEnd" type="date" required defaultValue={defaultValues?.leaseEnd}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select name="status" defaultValue={defaultValues?.status ?? "active"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
          <option value="active">Active</option>
          <option value="past">Past</option>
        </select>
      </div>
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">{submitLabel}</button>
    </form>
  )
}
