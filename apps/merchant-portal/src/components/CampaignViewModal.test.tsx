import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignTasksQuery } from '@/hooks/useCampaignTasks'
import type { Campaign, CampaignWithTasks } from '@/types'

import { CampaignViewModal } from './CampaignViewModal'

vi.mock('@/hooks/useCampaignTasks', () => ({ useCampaignTasksQuery: vi.fn() }))

const row = {
  id: 'campaign-1',
  title: 'Mango Cafe Feedback',
  status: 'CHANGES_REQUESTED',
} as Campaign

const detail = {
  ...row,
  merchantId: 'merchant-1',
  slug: 'mango',
  shortDescription: 'Tell us about your visit',
  description: 'Visit Prerna Test Cafe, try any drink and share your honest experience.',
  thumbnailUrl: null,
  campaignType: 'REVIEW',
  rewardType: 'CASH',
  rewardAmount: '50',
  totalBudget: '150',
  spentBudget: '0',
  remainingBudget: '150',
  maxParticipants: null,
  currentParticipants: 0,
  startAt: null,
  endAt: '2026-11-07T18:29:59.999Z',
  createdAt: '2026-10-08T05:00:00.000Z',
  updatedAt: '2026-10-08T06:00:00.000Z',
  minimumAge: 18,
  maximumAge: null,
  targetGender: 'ALL',
  minimumFollowers: 0,
  tasks: [
    {
      id: 'task-1',
      campaignId: 'campaign-1',
      title: 'Share our post on your story',
      description: null,
      instructions: 'Post our latest photo to your story and upload a screenshot.',
      taskType: 'INSTAGRAM_STORY_SHARE',
      verificationType: 'MANUAL',
      taskOrder: 0,
      required: true,
      proofType: 'SCREENSHOT',
      completionLimit: 'ONCE',
      configuration: null,
    },
  ],
  approvals: [{ status: 'CHANGES_REQUESTED', comments: 'Please add an end date.', createdAt: '2026-10-08T05:30:00.000Z' }],
} as CampaignWithTasks

function withDetail(campaign: CampaignWithTasks) {
  vi.mocked(useCampaignTasksQuery).mockReturnValue({ data: { data: { data: campaign } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
}

describe('CampaignViewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withDetail(detail)
  })

  it('shows what the merchant set up: wording, money, dates, audience and tasks', () => {
    render(<CampaignViewModal campaign={row} onClose={vi.fn()} />)

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Tell us about your visit')).toBeInTheDocument()
    expect(dialog.getByText(/share your honest experience/)).toBeInTheDocument()
    // Total budget and, with nothing spent yet, what remains.
    expect(dialog.getAllByText('₹150.00')).toHaveLength(2)
    expect(dialog.getByText('When you activate it')).toBeInTheDocument()
    expect(dialog.getByText('Age 18–any')).toBeInTheDocument()
    expect(dialog.getByText(/1\. Share our post on your story/)).toBeInTheDocument()
    expect(dialog.getByText(/Instagram story share · Screenshot · I review each one · Once per person/)).toBeInTheDocument()
  })

  it('shows what the admin asked to change, at the top and in the history', () => {
    render(<CampaignViewModal campaign={row} onClose={vi.fn()} />)

    expect(screen.getByText('Changes requested by Viralkar')).toBeInTheDocument()
    expect(screen.getAllByText(/Please add an end date\./)).toHaveLength(2)
    expect(screen.getByText(/make the changes, then submit it again/i)).toBeInTheDocument()
  })

  it('goes on to edit the campaign or its tasks while it can still change', async () => {
    const onEdit = vi.fn()
    const onEditTasks = vi.fn()
    const user = userEvent.setup()
    render(<CampaignViewModal campaign={row} onClose={vi.fn()} onEdit={onEdit} onEditTasks={onEditTasks} />)

    await user.click(screen.getByRole('button', { name: 'Edit campaign' }))
    await user.click(screen.getByRole('button', { name: 'Edit tasks' }))

    expect(onEdit).toHaveBeenCalled()
    expect(onEditTasks).toHaveBeenCalled()
  })

  it('is read-only once the campaign is live', () => {
    withDetail({ ...detail, status: 'ACTIVE', approvals: [{ status: 'APPROVED', comments: null, createdAt: '2026-10-08T07:00:00.000Z' }] })
    render(<CampaignViewModal campaign={{ ...row, status: 'ACTIVE' }} onClose={vi.fn()} onEdit={vi.fn()} onEditTasks={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Edit campaign' })).not.toBeInTheDocument()
    expect(screen.queryByText(/by Viralkar/)).not.toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })
})
