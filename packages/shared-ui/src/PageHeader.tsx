import { cn } from './cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h1 className="page-title truncate">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle mt-0.5">{subtitle}</p>}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-shrink-0 items-center gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </div>
  )
}
