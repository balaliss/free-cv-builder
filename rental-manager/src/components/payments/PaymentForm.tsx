"use client"

import { useState } from "react"
import type { Tenant, Unit, Property } from "@/generated/prisma/client"

type TenantWithUnit = Tenant & {
  unit: Unit & { property: Pick<Property, "name"> }
}

interface PaymentFormProps {
  tenants: TenantWithUnit[]
  action: (formData: FormData) => void | Promise<void>
  submitLabel?: string
}

export function PaymentForm({ tenants, action, submitLabel = "Log Payment" }: PaymentFormProps) {
  const [selectedTenantId, setSelectedTenantId] = useState("")
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId)

  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tenant <span className="text-red-500">*</span></label>
        <select name="tenantId" required value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
          <option value="">Select a tenant…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name} — {t.unit.property.name} #{t.unit.unitNumber}</option>
          ))}
        </select>
      </div>
      <input type="hidden" name="unitId" value={selectedTenant?.unitId ?? ""} />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($) <span className="text-red-500">*</span></label>
        <input name="amount" type="number" step="0.01" min="0" required
          defaultValue={selectedTenant ? Number(selectedTenant.unit.monthlyRent).toFixed(2) : ""}
          key={selectedTenantId}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="1500.00" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Due date <span className="text-red-500">*</span></label>
          <input name="dueDate" type="date" required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Paid date</label>
          <input name="paidDate" type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select name="status" defaultValue="pending"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="late">Late</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <input name="notes"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="e.g. paid by check #1234" />
      </div>
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">{submitLabel}</button>
    </form>
  )
}
