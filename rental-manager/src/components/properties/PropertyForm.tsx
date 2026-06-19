"use client"

interface PropertyFormProps {
  action: (formData: FormData) => void | Promise<void>
  defaultValues?: { name?: string; address?: string; description?: string }
  submitLabel?: string
}

export function PropertyForm({ action, defaultValues, submitLabel = "Save" }: PropertyFormProps) {
  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Property name <span className="text-red-500">*</span></label>
        <input name="name" required defaultValue={defaultValues?.name}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Sunset Apartments" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
        <input name="address" required defaultValue={defaultValues?.address}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="123 Main St, City, State 12345" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea name="description" rows={3} defaultValue={defaultValues?.description}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          placeholder="Optional notes about this property" />
      </div>
      <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors">{submitLabel}</button>
    </form>
  )
}
