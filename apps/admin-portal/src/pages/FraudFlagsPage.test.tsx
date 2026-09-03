import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFraudFlagsQuery, useHighRiskDevicesQuery, useResolveFraudFlagMutation, useReverseRewardMutation } from '@/hooks/useFraudFlags'

import FraudFlagsPage from './FraudFlagsPage'

vi.mock('@/hooks/useFraudFlags', () => ({
  useFraudFlagsQuery: vi.fn(),
  useHighRiskDevicesQuery: vi.fn(),
  useResolveFraudFlagMutation: vi.fn(),
  useReverseRewardMutation: vi.fn(),
}))

const reverseRewardMock = vi.fn()

const flag = {
  id: 'flag-1',
  submissionId: 'sub-1',
  userId: 'user-1',
  riskLevel: 'HIGH',
  reason: 'Duplicate screenshot detected',
  resolved: false,
  createdAt: '2026-01-01T00:00:00Z',
  user: { id: 'user-1', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com' },
}

const device = {
  id: 'device-1',
  userId: 'user-1',
  name: null,
  platform: 'ANDROID',
  os: 'Android 14',
  isActive: true,
  lastSeenAt: '2026-01-01T00:00:00Z',
  isRooted: true,
  isEmulator: false,
  vpnSuspected: true,
  riskScore: 60,
  createdAt: '2026-01-01T00:00:00Z',
  user: { id: 'user-1', firstName: 'Asha', lastName: 'Rao', email: null, phone: null },
}

function renderPage() {
  return render(<FraudFlagsPage />)
}

describe('FraudFlagsPage', () => {
  beforeEach(() => {
    vi.mocked(useFraudFlagsQuery).mockReturnValue({
      data: { data: { data: { data: [flag], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useHighRiskDevicesQuery).mockReturnValue({
      data: { data: { data: { data: [device], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useResolveFraudFlagMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
    vi.mocked(useReverseRewardMutation).mockReturnValue({ mutate: reverseRewardMock, isPending: false } as never)
    reverseRewardMock.mockReset()
  })

  it('shows the submission flags tab by default', () => {
    renderPage()
    expect(screen.getByText('Duplicate screenshot detected')).toBeInTheDocument()
  })

  it('switches to the high-risk devices tab and shows its data', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /high-risk devices/i }))

    expect(screen.getByText(/android 14/i)).toBeInTheDocument()
    expect(screen.getByText('60')).toBeInTheDocument()
    expect(screen.queryByText('Duplicate screenshot detected')).not.toBeInTheDocument()
  })

  it('shows which risk signals tripped for a flagged device', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /high-risk devices/i }))

    expect(screen.getByText('Rooted')).toBeInTheDocument()
    expect(screen.getByText('VPN suspected')).toBeInTheDocument()
    expect(screen.queryByText('Emulator')).not.toBeInTheDocument()
  })

  it('shows an empty state when no device is above the risk threshold', async () => {
    vi.mocked(useHighRiskDevicesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /high-risk devices/i }))

    expect(screen.getByText(/no high-risk devices/i)).toBeInTheDocument()
  })

  it('requires a reason of at least 10 characters before reversing a reward', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /reverse reward/i }))
    const dialog = within(screen.getByRole('dialog'))
    const reverseButton = dialog.getByRole('button', { name: /^reverse reward$/i })
    expect(reverseButton).toBeDisabled()

    await user.type(dialog.getByLabelText(/reason for reversal/i), 'Confirmed duplicate account fraud')
    expect(reverseButton).toBeEnabled()

    await user.click(reverseButton)
    await waitFor(() => expect(reverseRewardMock).toHaveBeenCalledWith({ flagId: 'flag-1', reason: 'Confirmed duplicate account fraud' }))
  })

  it('does not offer reversal for an already-resolved flag', () => {
    vi.mocked(useFraudFlagsQuery).mockReturnValue({
      data: { data: { data: { data: [{ ...flag, resolved: true }], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)

    renderPage()

    expect(screen.queryByRole('button', { name: /reverse reward/i })).not.toBeInTheDocument()
  })
})
