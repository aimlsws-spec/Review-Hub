export type ApiReviewSource = 'GOOGLE' | 'FACEBOOK' | 'ZOMATO' | 'SWIGGY' | 'TRIPADVISOR' | 'WEBSITE' | 'OTHER'
export type ApiReviewStatus = 'PENDING' | 'REPLIED' | 'FLAGGED' | 'RESOLVED'

/** Raw shape returned by GET /merchants/:id/reviews — matches the backend's Review model. */
export interface ApiReview {
  id: string
  merchantId: string
  customerName: string
  customerEmail: string | null
  source: ApiReviewSource
  rating: number
  title: string | null
  body: string
  status: ApiReviewStatus
  reply: string | null
  repliedAt: string | null
  repliedBy: string | null
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

export interface ReviewStats {
  total: number
  averageRating: number
  repliedCount: number
  pendingCount: number
  responseRate: number
}
