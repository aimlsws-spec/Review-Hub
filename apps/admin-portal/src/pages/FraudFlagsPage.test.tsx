import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFraudFlagsQuery, useHighRiskDevicesQuery, useResolveFraudFlagMutation } from '@/hooks/useFraudFlags'

import FraudFlagsPage from './FraudFlagsPage'

vi.mock('@/hooks/useFraudFlags', () => ({
  useFraudFlagsQuery: vi.fn(),
  useHighRiskDevicesQuery: vi.fn(),
  useResolveFraudFlagMutation: vi.fn(),
}))

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
})
