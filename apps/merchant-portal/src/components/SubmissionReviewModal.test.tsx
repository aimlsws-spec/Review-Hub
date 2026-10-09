import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSubmissionDecisions, useSubmissionEvidenceUrl } from '@/hooks/useSubmissions'
import type { MerchantSubmission } from '@/types'

import { SubmissionReviewModal } from './SubmissionReviewModal'

vi.mock('@/hooks/useSubmissions', () => ({ useSubmissionDecisions: vi.fn(), useSubmissionEvidenceUrl: vi.fn() }))

const waitingSubmission: MerchantSubmission = {
  id: 'submission-1',
  status: 'PENDING_MANUAL',
  verificationSource: 'HYBRID',
  attemptNumber: 1,
  createdAt: '2026-10-08T10:00:00.000Z',
  reviewedAt: null,
  rejectionReason: null,
  rewardAmount: null,
  campaign: { id: 'campaign-1', title: 'Mango Cafe Feedback' },
  task: { id: 'task-1', title: 'Share our post on your story', taskType: 'INSTAGRAM_STORY_SHARE', proofType: 'SCREENSHOT', verificationType: 'HYBRID' },
  participantName: 'Prerna M.',
  evidence: { file: { mimeType: 'image/png', fileName: 'story.png' }, link: null },
  ai: { status: 'COMPLETED', decision: 'APPROVE', confidence: 0.9, fraudScore: 0.1, explanation: 'Readable story screenshot.' },
  flags: [{ type: 'DUPLICATE_SUBMISSION', riskLevel: 'HIGH', reason: 'Same picture as another person sent' }],
}

const approve = vi.fn()
const reject = vi.fn()

function renderModal(submission: MerchantSubmission = waitingSubmission) {
  return render(<SubmissionReviewModal merchantId="merchant-1" submission={submission} onClose={vi.fn()} />)
}

describe('SubmissionReviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSubmissionEvidenceUrl).mockReturnValue({ url: 'blob:proof', isLoading: false, isError: false })
    vi.mocked(useSubmissionDecisions).mockReturnValue({
      approveMutation: { mutate: approve, isPending: false },
      rejectMutation: { mutate: reject, isPending: false },
    } as never)
  })

  it('shows the proof picture, who sent it, what the AI thinks and the warnings', () => {
    renderModal()

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('img', { name: /proof sent for share our post/i })).toHaveAttribute('src', 'blob:proof')
    expect(dialog.getByText(/From Prerna M\./)).toBeInTheDocument()
    expect(dialog.getByText(/the ai thinks it looks genuine \(90% sure\)/i)).toBeInTheDocument()
    expect(dialog.getByText(/can not confirm the proof shows your business/i)).toBeInTheDocument()
    expect(dialog.getByText(/same picture as another person sent/i)).toBeInTheDocument()
  })

  it('shows a link sent as proof, opening safely in a new tab', () => {
    renderModal({ ...waitingSubmission, evidence: { file: null, link: 'https://instagram.com/p/abc' } })

    const link = screen.getByRole('link', { name: 'https://instagram.com/p/abc' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('approves and pays', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /approve and pay/i }))

    expect(approve).toHaveBeenCalledWith('submission-1')
  })

  it('asks why before rejecting, and needs a real reason', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /^reject$/i }))
    const confirm = screen.getByRole('button', { name: /reject submission/i })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/why are you rejecting it/i), '  Not our post  ')
    await user.click(confirm)

    expect(reject).toHaveBeenCalledWith({ submissionId: 'submission-1', reason: 'Not our post' })
  })

  it('only shows a submission that is already decided, with no way to decide it again', () => {
    renderModal({ ...waitingSubmission, status: 'APPROVED', rewardAmount: 50, reviewedAt: '2026-10-08T11:00:00.000Z' })

    expect(screen.queryByRole('button', { name: /approve and pay/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Reward: ₹50\.00/)).toBeInTheDocument()
  })
})
