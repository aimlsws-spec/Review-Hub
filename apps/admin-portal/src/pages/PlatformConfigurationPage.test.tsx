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
  minimumWithdrawal: 1000,
  maximumWithdrawal: 50000,
  dailyWithdrawalLimit: 50000,
  monthlyWithdrawalLimit: null,
  bankCoolingHours: 24,
  payoutMode: 'GATEWAY',
  manualTopUpApprovalThreshold: 100000,
  tdsRate: 0,
  tdsAnnualThreshold: 0,
  tdsSection: null,
  maintenanceMode: false,
  maintenanceMessage: null,
  minimumAppVersion: '1.0.0',
  updateUrl: null,
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

  describe('withdrawal rules', () => {
    it('shows the current limits, the waiting time and how withdrawals are paid', () => {
      renderPage()

      expect(screen.getByLabelText(/minimum withdrawal/i)).toHaveValue(1000)
      expect(screen.getByLabelText(/daily limit/i)).toHaveValue(50000)
      expect(screen.getByLabelText(/monthly limit/i)).toHaveValue(null)
      expect(screen.getByLabelText(/waiting time/i)).toHaveValue(24)
      expect(screen.getByLabelText(/how approved withdrawals are paid/i)).toHaveValue('GATEWAY')
    })

    it('saves the rules, sending an empty monthly limit as null so it is cleared', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.clear(screen.getByLabelText(/daily limit/i))
      await user.type(screen.getByLabelText(/daily limit/i), '20000')
      await user.clear(screen.getByLabelText(/waiting time/i))
      await user.type(screen.getByLabelText(/waiting time/i), '12')
      await user.selectOptions(screen.getByLabelText(/how approved withdrawals are paid/i), 'MANUAL')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() =>
        expect(saveMock).toHaveBeenCalledWith(
          expect.objectContaining({ dailyWithdrawalLimit: 20000, monthlyWithdrawalLimit: null, bankCoolingHours: 12, payoutMode: 'MANUAL', minimumWithdrawal: 1000 }),
        ),
      )
    })

    it('sends a monthly limit when one is entered', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.type(screen.getByLabelText(/monthly limit/i), '200000')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ monthlyWithdrawalLimit: 200000 })))
    })

    it.each([
      ['a minimum above the maximum', { label: /minimum withdrawal/i, value: '60000' }, /minimum withdrawal can not be more than the maximum/i],
      ['a minimum above the daily limit', { label: /daily limit/i, value: '500' }, /nobody could withdraw/i],
      ['a monthly limit below the daily limit', { label: /monthly limit/i, value: '100' }, /monthly limit can not be less than the daily limit/i],
    ])('explains %s and does not let it be saved', async (_label, change, message) => {
      const user = userEvent.setup()
      renderPage()

      await user.clear(screen.getByLabelText(change.label))
      await user.type(screen.getByLabelText(change.label), change.value)

      expect(screen.getByRole('alert')).toHaveTextContent(message)
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
      expect(saveMock).not.toHaveBeenCalled()
    })
  })

  describe('top-up approval', () => {
    it('shows the amount above which a second admin is needed, and sends a change to it', async () => {
      const user = userEvent.setup()
      renderPage()
      expect(screen.getByLabelText(/second admin needed above/i)).toHaveValue(100000)

      await user.clear(screen.getByLabelText(/second admin needed above/i))
      await user.type(screen.getByLabelText(/second admin needed above/i), '50000')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ manualTopUpApprovalThreshold: 50000 })))
    })

    it('says that 0 credits every top-up straight away', () => {
      renderPage()
      expect(screen.getByText(/0 credits every top-up straight away/i)).toBeInTheDocument()
    })
  })

  describe('TDS', () => {
    it('shows the rate as a percent, and starts with none kept back', () => {
      renderPage()

      expect(screen.getByLabelText(/tds rate/i)).toHaveValue(0)
      expect(screen.getByLabelText(/income tax section/i)).toHaveValue('')
      expect(screen.getByText(/set them only as your tax adviser tells you/i)).toBeInTheDocument()
    })

    it('shows a saved rate as a percent: a fraction of 0.1 reads as 10', () => {
      vi.mocked(usePlatformConfigurationQuery).mockReturnValue({
        data: { data: { data: { ...config, tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 20000 } } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never)
      renderPage()

      expect(screen.getByLabelText(/tds rate/i)).toHaveValue(10)
      expect(screen.getByLabelText(/income tax section/i)).toHaveValue('194R')
      expect(screen.getByLabelText(/yearly threshold/i)).toHaveValue(20000)
    })

    it('sends the rate to the server as a fraction, with the section and threshold', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.clear(screen.getByLabelText(/tds rate/i))
      await user.type(screen.getByLabelText(/tds rate/i), '10')
      await user.type(screen.getByLabelText(/income tax section/i), ' 194R ')
      await user.clear(screen.getByLabelText(/yearly threshold/i))
      await user.type(screen.getByLabelText(/yearly threshold/i), '20000')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ tdsRate: 0.1, tdsSection: '194R', tdsAnnualThreshold: 20000 })))
    })

    it('sends a rate with decimals without floating point noise', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.clear(screen.getByLabelText(/tds rate/i))
      await user.type(screen.getByLabelText(/tds rate/i), '7.5')
      await user.type(screen.getByLabelText(/income tax section/i), '194R')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ tdsRate: 0.075 })))
    })

    it('will not let a rate be saved without the section', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.clear(screen.getByLabelText(/tds rate/i))
      await user.type(screen.getByLabelText(/tds rate/i), '10')

      expect(screen.getByRole('alert')).toHaveTextContent(/income tax section before turning on tds/i)
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })

    it('sends no section at all when it is left empty, so a section can be cleared', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ tdsRate: 0, tdsSection: null })))
    })
  })

  describe('app availability', () => {
    it('shows maintenance off and the minimum version, with no warning until maintenance is turned on', () => {
      renderPage()

      expect(screen.getByLabelText(/maintenance mode/i)).not.toBeChecked()
      expect(screen.getByLabelText(/minimum app version/i)).toHaveValue('1.0.0')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('warns that turning maintenance on turns everyone away, and that admins can still sign in', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByLabelText(/maintenance mode/i))

      expect(screen.getByRole('alert')).toHaveTextContent(/turns away every user and merchant.*administrators can still sign in/i)
    })

    it('sends maintenance with the message, the minimum version and the update link', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByLabelText(/maintenance mode/i))
      await user.type(screen.getByLabelText(/message shown during maintenance/i), '  Back at 6 PM  ')
      await user.clear(screen.getByLabelText(/minimum app version/i))
      await user.type(screen.getByLabelText(/minimum app version/i), '1.4.0')
      await user.type(screen.getByLabelText(/update link/i), 'https://play.google.com/store/apps/details?id=x')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() =>
        expect(saveMock).toHaveBeenCalledWith(
          expect.objectContaining({
            maintenanceMode: true,
            maintenanceMessage: 'Back at 6 PM',
            minimumAppVersion: '1.4.0',
            updateUrl: 'https://play.google.com/store/apps/details?id=x',
          }),
        ),
      )
    })

    it('sends null for an empty message and link, so they can be cleared', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMessage: null, updateUrl: null })))
    })

    it('shows a saved message and link', () => {
      vi.mocked(usePlatformConfigurationQuery).mockReturnValue({
        data: { data: { data: { ...config, maintenanceMessage: 'Back soon', updateUrl: 'https://store.example/app', minimumAppVersion: '2.1.0' } } },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never)
      renderPage()

      expect(screen.getByLabelText(/message shown during maintenance/i)).toHaveValue('Back soon')
      expect(screen.getByLabelText(/update link/i)).toHaveValue('https://store.example/app')
      expect(screen.getByLabelText(/minimum app version/i)).toHaveValue('2.1.0')
    })

    it.each(['1', '1.2', 'latest', 'v1.2.3', ''])('will not save the minimum app version %j', async (version) => {
      const user = userEvent.setup()
      renderPage()

      await user.clear(screen.getByLabelText(/minimum app version/i))
      if (version) await user.type(screen.getByLabelText(/minimum app version/i), version)

      expect(screen.getByText(/must look like 1\.4\.0/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })

    it('will not save an update link that is not https', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.type(screen.getByLabelText(/update link/i), 'http://example.com/app')

      expect(screen.getByText(/must start with https/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    })
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
