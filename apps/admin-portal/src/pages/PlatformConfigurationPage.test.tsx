import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePlatformConfigurationQuery, useUpdatePlatformConfigurationMutation } from '@/hooks/usePlatformConfiguration'

import PlatformConfigurationPage from './PlatformConfigurationPage'

vi.mock('@/hooks/usePlatformConfiguration', () => ({
  usePlatformConfigurationQuery: vi.fn(),
  useUpdatePlatformConfigurationMutation: vi.fn(),
}))

const config = {
  id: 'config-1',
  platformName: 'VIRAL KAR',
  supportEmail: 'support@viralkar.com',
  supportPhone: '+911234567890',
  commissionPercentage: 0.1,
  minimumWithdrawal: 100,
  maximumWithdrawal: 50000,
  maintenanceMode: false,
  appVersion: '1.0.0',
  apiVersion: 'v1',
}

const saveMock = vi.fn()

function renderPage() {
  return render(<PlatformConfigurationPage />)
}

describe('PlatformConfigurationPage', () => {
  beforeEach(() => {
    vi.mocked(usePlatformConfigurationQuery).mockReturnValue({
      data: { data: { data: config } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useUpdatePlatformConfigurationMutation).mockReturnValue({ mutate: saveMock, isPending: false } as never)
    saveMock.mockReset()
  })

  it('renders the current configuration values', () => {
    renderPage()

    expect(screen.getByLabelText(/platform name/i)).toHaveValue('VIRAL KAR')
    expect(screen.getByLabelText(/support email/i)).toHaveValue('support@viralkar.com')
    expect(screen.getByText(/app v1\.0\.0/i)).toBeInTheDocument()
  })

  it('saves updated configuration', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.clear(screen.getByLabelText(/platform name/i))
    await user.type(screen.getByLabelText(/platform name/i), 'ReviewHub')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ platformName: 'ReviewHub' })),
    )
  })
})
