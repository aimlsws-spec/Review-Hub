export type CustomerType = 'New' | 'Returning' | 'VIP'
export type CustomerStatus = 'Active' | 'Inactive'

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  avatarTone: string
  type: CustomerType
  status: CustomerStatus
  joinedAt: string
  lastVisit: string
  totalVisits: number
  lifetimeSpend: number
  rewardBalance: number
  averageOrderValue: number
  reviewCount: number
  rating: number
}

export type CustomerAction = 'view' | 'edit' | 'message' | 'reviews' | 'remove'

export interface CustomerNote {
  id: string
  text: string
  createdAt: string
  author?: string
}

export interface CustomerActivityEntry {
  label: string
  date: string
}
