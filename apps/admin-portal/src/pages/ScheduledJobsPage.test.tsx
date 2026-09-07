import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCreateScheduledJobMutation,
  useDeleteScheduledJobMutation,
  useJobExecutionLogsQuery,
  useScheduledJobsQuery,
  useUpdateScheduledJobMutation,
} from '@/hooks/useScheduledJobs'

import ScheduledJobsPage from './ScheduledJobsPage'

vi.mock('@/hooks/useScheduledJobs', () => ({
  useScheduledJobsQuery: vi.fn(),
  useJobExecutionLogsQuery: vi.fn(),
  useCreateScheduledJobMutation: vi.fn(),
  useUpdateScheduledJobMutation: vi.fn(),
  useDeleteScheduledJobMutation: vi.fn(),
}))

const job = {
  id: 'job-1',
  jobName: 'nightly-settlement-generation',
  jobType: 'REWARD_PROCESSING',
  cronExpression: '0 2 * * *',
  enabled: true,
  lastRun: null,
  nextRun: null,
  retries: 0,
  configuration: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const createMock = vi.fn()
const updateMock = vi.fn()
const removeMock = vi.fn()

function renderPage() {
  return render(<ScheduledJobsPage />)
}

describe('ScheduledJobsPage', () => {
  beforeEach(() => {
    vi.mocked(useScheduledJobsQuery).mockReturnValue({
      data: { data: { data: [job] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useJobExecutionLogsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCreateScheduledJobMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    vi.mocked(useUpdateScheduledJobMutation).mockReturnValue({ mutate: updateMock, isPending: false } as never)
    vi.mocked(useDeleteScheduledJobMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    createMock.mockReset()
    updateMock.mockReset()
    removeMock.mockReset()
  })

  it('shows an empty state when there are no jobs', () => {
    vi.mocked(useScheduledJobsQuery).mockReturnValue({
      data: { data: { data: [] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no scheduled jobs yet/i)).toBeInTheDocument()
  })

  it('renders a job row', () => {
    renderPage()
    expect(screen.getByText('nightly-settlement-generation')).toBeInTheDocument()
    expect(screen.getByText('0 2 * * *')).toBeInTheDocument()
  })

  it('creates a new job', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new job/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/job name/i), 'weekly-report')
    await user.type(dialog.getByLabelText(/cron expression/i), '0 0 * * 0')
    await user.click(dialog.getByRole('button', { name: /create job/i }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ jobName: 'weekly-report', cronExpression: '0 0 * * 0' })),
    )
  })

  it('edits an existing job without changing its name', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/job name/i)).toBeDisabled()
    await user.click(dialog.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ jobId: 'job-1', data: { cronExpression: '0 2 * * *', enabled: true } }),
    )
  })

  it('deletes a job after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('job-1'))
  })

  it('opens the execution logs modal', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /logs/i }))

    expect(screen.getByText(/execution logs/i)).toBeInTheDocument()
  })
})
