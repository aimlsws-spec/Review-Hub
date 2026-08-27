import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReviewCard, StarRating, type Review } from './ReviewCard'

describe('StarRating', () => {
  it('exposes the rating via an accessible label', () => {
    render(<StarRating rating={3} />)
    expect(screen.getByRole('img', { name: '3 out of 5 stars' })).toBeInTheDocument()
  })

  it('always renders exactly 5 stars regardless of rating', () => {
    const { container } = render(<StarRating rating={2} />)
    expect(container.querySelectorAll('svg')).toHaveLength(5)
  })

  it('colors only the filled stars amber, leaving the rest gray', () => {
    const { container } = render(<StarRating rating={2} />)
    const stars = container.querySelectorAll('svg')
    expect(stars[0].getAttribute('class')).toContain('text-amber-400')
    expect(stars[1].getAttribute('class')).toContain('text-amber-400')
    expect(stars[2].getAttribute('class')).toContain('text-gray-200')
    expect(stars[4].getAttribute('class')).toContain('text-gray-200')
  })
})

const baseReview: Review = {
  id: 'rev-1',
  customerName: 'Asha Rao',
  customerInitials: 'AR',
  avatarBg: 'bg-blue-100',
  source: 'GOOGLE',
  rating: 4,
  title: 'Great service',
  body: 'The staff were friendly and quick.',
  date: '2 days ago',
  status: 'PENDING',
}

describe('ReviewCard', () => {
  it('renders the customer name, source, and status', () => {
    render(<ReviewCard review={baseReview} onViewDetails={vi.fn()} />)
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('does not show a reply preview when there is no reply', () => {
    render(<ReviewCard review={baseReview} onViewDetails={vi.fn()} />)
    expect(screen.queryByText(/reply/i)).not.toBeInTheDocument()
  })

  it('shows a reply preview when a reply exists', () => {
    render(<ReviewCard review={{ ...baseReview, reply: 'Thanks for visiting!' }} onViewDetails={vi.fn()} />)
    expect(screen.getByText('Thanks for visiting!')).toBeInTheDocument()
  })

  it('calls onViewDetails with the review when the button is clicked', async () => {
    const onViewDetails = vi.fn()
    const user = userEvent.setup()
    render(<ReviewCard review={baseReview} onViewDetails={onViewDetails} />)

    await user.click(screen.getByRole('button', { name: /view details/i }))

    expect(onViewDetails).toHaveBeenCalledWith(baseReview)
  })
})
