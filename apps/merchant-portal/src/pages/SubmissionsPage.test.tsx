import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignsQuery } from '@/hooks/useCampaigns'
import { useSubmissionDecisions, useSubmissionEvidenceUrl, useSubmissionsQuery } from '@/hooks/useSubmissions'
import { useAuthStore } from '@/stores/auth.store'
import type { MerchantSubmission } from '@/types'

import SubmissionsPage from './SubmissionsPage'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/hooks/useCampaigns', () => ({ useCampaignsQuery: vi.fn() }))
vi.mock('@/hooks/useSubmissions', () => ({
  useSubmissionsQuery: vi.fn(),
  useSubmissionDecisions: vi.fn(),
  useSubmissionEvidenceUrl: vi.fn(),
}))

const submission: MerchantSubmission = {
  id: 'submission-1',
  status: 'PENDING_MANUAL',
  verificationSource: 'MANUAL',
  attemptNumber: 1,
  createdAt: '2026-10-08T10:00:00.000Z',
  reviewedAt: null,
  rejectionReason: null,
  rewardAmount: null,
  campaign: { id: 'campaign-1', title: 'Mango Cafe Feedback' },
  task: { id: 'task-1', title: 'Share our post on your story', taskType: 'INSTAGRAM_STORY_SHARE', proofType: 'SCREENSHOT', verificationType: 'MANUAL' },
  participantName: 'Prerna M.',
  evidence: { file: { mimeType: 'image/png', fileName: 'story.png' }, link: null },
  ai: null,
  flags: [{ type: 'DUPLICATE_SUBMISSION', riskLevel: 'LOW', reason: 'Same picture as before' }],
}

function withSubmissions(rows: MerchantSubmission[]) {
  vi.mocked(useSubmissionsQuery).mockReturnValue({
    data: { data: { data: { data: rows, total: rows.length, page: 1, limit: 20 } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)
}

function renderPage(path = '/submissions') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SubmissionsPage />
    </MemoryRouter>,
  )
}

describe('SubmissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockImplementation(
      ((selector: (s: { merchant: { id: string } }) => unknown) => selector({ merchant: { id: 'merchant-1' } })) as unknown as typeof useAuthStore,
    )
    vi.mocked(useCampaignsQuery).mockReturnValue({
      data: { data: { data: { data: [{ id: 'campaign-1', title: 'Mango Cafe Feedback' }], total: 1 } } },
    } as never)
    vi.mocked(useSubmissionEvidenceUrl).mockReturnValue({ url: 'blob:proof', isLoading: false, isError: false })
    vi.mocked(useSubmissionDecisions).mockReturnValue({
      approveMutation: { mutate: vi.fn(), isPending: false },
      rejectMutation: { mutate: vi.fn(), isPending: false },
    } as never)
    withSubmissions([submission])
  })

  it('opens on what is waiting for the merchant', () => {
    renderPage()

    expect(useSubmissionsQuery).toHaveBeenCalledWith('merchant-1', expect.objectContaining({ status: 'PENDING_MANUAL', page: 1 }))
    expect(screen.getByLabelText('Status')).toHaveValue('PENDING_MANUAL')
  })

  it('lists each submission with the task, who sent it, the proof and its warnings', () => {
    renderPage()

    const row = screen.getByText('Share our post on your story').closest('tr') as HTMLElement
    expect(within(row).getByText('Mango Cafe Feedback')).toBeInTheDocument()
    expect(within(row).getByText('Prerna M.')).toBeInTheDocument()
    expect(within(row).getByText('Screenshot')).toBeInTheDocument()
    expect(within(row).getByText('1 warning')).toBeInTheDocument()
    expect(within(row).getByText('Waiting for you')).toBeInTheDocument()
  })

  it("shows one campaign's submissions when opened from that campaign", () => {
    renderPage('/submissions?campaignId=campaign-1')

    expect(useSubmissionsQuery).toHaveBeenCalledWith('merchant-1', expect.objectContaining({ campaignId: 'campaign-1' }))
    expect(screen.getByLabelText('Campaign')).toHaveValue('campaign-1')
  })

  it('switches to another status from the first page', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('Status'), 'APPROVED')

    expect(useSubmissionsQuery).toHaveBeenLastCalledWith('merchant-1', expect.objectContaining({ status: 'APPROVED', page: 1 }))
  })

  it('says when nothing is waiting', () => {
    withSubmissions([])
    renderPage()

    expect(screen.getByText('Nothing waiting for you')).toBeInTheDocument()
  })

  it('opens a submission to review it', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Review' }))

    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /approve and pay/i })).toBeInTheDocument()
  })
})
