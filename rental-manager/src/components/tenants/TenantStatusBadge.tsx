import type { TenantStatus } from "@/generated/prisma/client"

const styles: Record<TenantStatus, string> = {
  active: "bg-green-100 text-green-800",
  past: "bg-slate-100 text-slate-600",
}

const labels: Record<TenantStatus, string> = {
  active: "Active",
  past: "Past",
}

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
