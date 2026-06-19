import type { PaymentStatus } from "@/generated/prisma/client"

const styles: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  late: "bg-red-100 text-red-800",
}

const labels: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  late: "Late",
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
