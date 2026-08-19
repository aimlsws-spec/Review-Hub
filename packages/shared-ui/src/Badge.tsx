import { cn } from './cn'
import { getStatusColor } from './statusColor'

interface BadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: BadgeProps) {
  return (
    <span className={cn(getStatusColor(status), className)}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}

interface SimpleBadgeProps {
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'gray', children, className }: SimpleBadgeProps) {
  return (
    <span className={cn(`badge-${variant}`, className)}>
      {children}
    </span>
  )
}
