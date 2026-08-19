import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number, currency = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(new Date(date), fmt)
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, hh:mm a')
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str
}

export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } }
    return axiosError.response?.data?.message ?? 'An unexpected error occurred'
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green',
    APPROVED: 'badge-green',
    VERIFIED: 'badge-green',
    SUCCESS: 'badge-green',
    COMPLETED: 'badge-green',
    PAID: 'badge-green',
    CREDITED: 'badge-green',
    PENDING: 'badge-yellow',
    PENDING_VERIFICATION: 'badge-yellow',
    PENDING_REVIEW: 'badge-yellow',
    PENDING_MANUAL: 'badge-yellow',
    UNDER_REVIEW: 'badge-yellow',
    AI_PROCESSING: 'badge-yellow',
    PROCESSING: 'badge-yellow',
    SCHEDULED: 'badge-blue',
    DRAFT: 'badge-gray',
    PAUSED: 'badge-gray',
    SUSPENDED: 'badge-red',
    REJECTED: 'badge-red',
    FAILED: 'badge-red',
    BANNED: 'badge-red',
    CRITICAL: 'badge-red',
    HIGH: 'badge-red',
    MEDIUM: 'badge-yellow',
    LOW: 'badge-gray',
    CANCELLED: 'badge-gray',
    EXPIRED: 'badge-gray',
    DEACTIVATED: 'badge-gray',
    ARCHIVED: 'badge-gray',
    PUBLISHED: 'badge-green',
    CHANGES_REQUESTED: 'badge-yellow',
    OPEN: 'badge-blue',
    ASSIGNED: 'badge-yellow',
    IN_PROGRESS: 'badge-yellow',
    WAITING_USER: 'badge-purple',
    RESOLVED: 'badge-green',
    CLOSED: 'badge-gray',
  }
  return map[status] ?? 'badge-gray'
}
