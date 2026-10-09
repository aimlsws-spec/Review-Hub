import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignDetailQuery } from '@/hooks/useCampaignQueue'
import type { CampaignDetail } from '@/types'

import { CampaignDetailModal } from './CampaignDetailModal'

vi.mock('@/hooks/useCampaignQueue', () => ({ useCampaignDetailQuery: vi.fn() }))

const detail: CampaignDetail = {
  id: 'campaign-1',
  merchantId: 'merchant-1',
  title: 'Mango Cafe Feedback',
  slug: 'mango-cafe-feedback',
  shortDescription: 'Tell us about your visit',
  description: 'Visit Prerna Test Cafe, try any drink and share your honest experience.',
  campaignType: 'REVIEW',
  status: 'PENDING_REVIEW',
  rewardType: 'CASH',
  rewardAmount: '50',
  totalBudget: '150',
  spentBudget: '0',
  remainingBudget: '150',
  createdAt: '2026-10-08T05:00:00.000Z',
  updatedAt: '2026-10-08T06:00:00.000Z',
  visibility: 'PUBLIC',
  maxParticipants: null,
  currentParticipants: 0,
  minimumAge: 18,
  maximumAge: null,
  targetGender: 'ALL',
  minimumFollowers: 0,
  startAt: null,
  endAt: '2026-11-07T18:29:59.999Z',
  thumbnailUrl: null,
  bannerUrl: null,
  tasks: [
    {
      id: 'task-1',
      title: 'Share our post on your story',
      description: null,
      instructions: 'Post our latest photo to your story and upload a screenshot.',
      taskType: 'INSTAGRAM_STORY_SHARE',
      proofType: 'SCREENSHOT',
      verificationType: 'MANUAL',
      completionLimit: 'ONCE',
      required: true,
      taskOrder: 0,
      rewardAmount: null,
      configuration: null,
    },
    {
      id: 'task-2',
      title: 'Scan the code at the counter',
      description: null,
      instructions: null,
      taskType: 'QR_SCAN',
      proofType: 'QR_CODE',
      verificationType: 'SYSTEM',
      completionLimit: 'DAILY',
      required: false,
      taskOrder: 1,
      rewardAmount: null,
      configuration: { qrCode: 'PRERNA-COUNTER-1' },
    },
  ],
  media: [],
  merchant: {
    id: 'merchant-1',
    businessName: 'Prerna Test Cafe',
    email: 'prerna@example.com',
    phone: '+919898012345',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    city: { name: 'Ahmedabad' },
  },
  approvals: [
    { status: 'CHANGES_REQUESTED', comments: 'Say what proof you need.', createdAt: '2026-10-08T05:30:00.000Z', reviewer: { firstName: 'Platform', lastName: 'Admin' } },
  ],
  policyFlags: [],
}

function withDetail(campaign: CampaignDetail) {
  vi.mocked(useCampaignDetailQuery).mockReturnValue({ data: { data: { data: campaign } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
}

describe('CampaignDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withDetail(detail)
  })

  it('shows the merchant, what the campaign says, its money, dates and audience', () => {
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Prerna Test Cafe')).toBeInTheDocument()
    expect(dialog.getByText('Ahmedabad')).toBeInTheDocument()
    expect(dialog.getByText('prerna@example.com')).toBeInTheDocument()
    expect(dialog.getByText(/share your honest experience/)).toBeInTheDocument()
    expect(dialog.getByText('Tell us about your visit')).toBeInTheDocument()
    expect(dialog.getByText('No limit')).toBeInTheDocument()
    expect(dialog.getByText('When activated')).toBeInTheDocument()
    expect(dialog.getByText('Age 18–any')).toBeInTheDocument()
  })

  it("shows the link each task sends participants to, so the admin can check it is the merchant's", () => {
    const linked = {
      ...detail,
      tasks: [{ ...detail.tasks[0], configuration: { targetUrl: 'https://www.instagram.com/prernatestcafe/' } }],
    }
    withDetail(linked as CampaignDetail)
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'https://www.instagram.com/prernatestcafe/' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/prernatestcafe/',
    )
  })

  it('shows the cover image participants will see, so it is approved with the rest', () => {
    withDetail({ ...detail, thumbnailUrl: '/campaign/3f2a.jpg' })
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)

    expect(screen.getByAltText('Campaign cover')).toHaveAttribute('src', expect.stringMatching(/\/uploads\/campaign\/3f2a\.jpg$/))
  })

  it('shows how the campaign is doing when the numbers are there', () => {
    withDetail({ ...detail, performance: { joins: 40, finished: 30, completionRate: 0.75, completions: 30, rewardsPaid: 1500 } })
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Performance so far')).toBeInTheDocument()
    expect(dialog.getByText('30 (75%)')).toBeInTheDocument()
    expect(dialog.getByText('40')).toBeInTheDocument()
  })

  it('leaves the performance section out when there are no numbers', () => {
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)
    expect(screen.queryByText('Performance so far')).not.toBeInTheDocument()
  })

  it('shows every task, how it is checked, and the QR code a scan must match', () => {
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Tasks (2)')).toBeInTheDocument()
    expect(dialog.getByText(/1\. Share our post on your story/)).toBeInTheDocument()
    expect(dialog.getByText(/Instagram story share · Proof: Screenshot · Merchant reviews each one · Once/)).toBeInTheDocument()
    expect(dialog.getByText(/Post our latest photo/)).toBeInTheDocument()
    expect(dialog.getByText('PRERNA-COUNTER-1')).toBeInTheDocument()
  })

  it('shows what earlier reviewers said', () => {
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} />)

    expect(screen.getByText(/by Platform Admin/)).toBeInTheDocument()
    expect(screen.getByText(/Say what proof you need/)).toBeInTheDocument()
  })

  it('moves on to a decision from the detail', async () => {
    const onReview = vi.fn()
    const user = userEvent.setup()
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} onReview={onReview} />)

    await user.click(screen.getByRole('button', { name: 'Request changes' }))

    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ id: 'campaign-1' }), 'request-changes')
  })

  it('does not offer approval when the wording asks for a rating', () => {
    withDetail({
      ...detail,
      policyFlags: [{ rule: 'REQUIRES_RATING', severity: 'BLOCK', field: 'description', excerpt: '5 star', message: 'No rating may be asked for.' }],
    })
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} onReview={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(screen.getByText(/Blocks approval/)).toBeInTheDocument()
  })

  it('offers no decision for a campaign that is not waiting for review', () => {
    withDetail({ ...detail, status: 'ACTIVE' })
    render(<CampaignDetailModal campaignId="campaign-1" onClose={vi.fn()} onReview={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})
