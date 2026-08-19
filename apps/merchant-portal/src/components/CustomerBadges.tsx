import { Badge } from '@reviewhub/shared-ui'
import type { CustomerStatus, CustomerType } from '@/types/customer'
import { cn } from '@/utils'

export function CustomerTypeBadge({ type }: { type: CustomerType }) {
  return <Badge variant={type === 'VIP' ? 'purple' : type === 'Returning' ? 'blue' : 'gray'}>{type}</Badge>
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge variant={status === 'Active' ? 'green' : 'gray'}>
      <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', status === 'Active' ? 'bg-green-600' : 'bg-gray-500')} aria-hidden="true" />
      {status}
    </Badge>
  )
}
