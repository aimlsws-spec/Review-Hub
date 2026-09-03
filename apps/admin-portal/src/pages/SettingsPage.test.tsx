import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateSettingMutation, useSettingsQuery, useUpdateSettingMutation } from '@/hooks/useSettings'

import SettingsPage from './SettingsPage'

vi.mock('@/hooks/useSettings', () => ({
  useSettingsQuery: vi.fn(),
  useUpdateSettingMutation: vi.fn(),
  useCreateSettingMutation: vi.fn(),
}))

const editableSetting = {
  id: 'setting-1',
  key: 'withdrawal.min_amount',
  value: '100',
  dataType: 'STRING',
  category: 'withdrawal',
  description: 'Minimum withdrawal amount',
  editable: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const readonlySetting = {
  ...editableSetting,
  id: 'setting-2',
  key: 'platform.name',
  value: 'VIRAL KAR',
  editable: false,
}

const updateMock = vi.fn()
const createMock = vi.fn()

function renderPage() {
  return render(<SettingsPage />)
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(useSettingsQuery).mockReturnValue({
      data: { data: { data: [editableSetting, readonlySetting] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useUpdateSettingMutation).mockReturnValue({ mutate: updateMock, isPending: false } as never)
    vi.mocked(useCreateSettingMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    updateMock.mockReset()
    createMock.mockReset()
  })

  it('shows an empty state when there are no settings', () => {
    vi.mocked(useSettingsQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    renderPage()
    expect(screen.getByText(/no settings yet/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const refetch = vi.fn()
    vi.mocked(useSettingsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders settings, marking non-editable ones', () => {
    renderPage()

    expect(screen.getByText('withdrawal.min_amount')).toBeInTheDocument()
    expect(screen.getByText('platform.name')).toBeInTheDocument()
    expect(screen.getByText(/not editable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('edits and saves an existing setting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /edit/i }))
    const dialog = within(screen.getByRole('dialog'))
    const valueInput = dialog.getByLabelText(/value/i)
    await user.clear(valueInput)
    await user.type(valueInput, '250')
    await user.click(dialog.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ key: 'withdrawal.min_amount', value: '250' }))
  })

  it('creates a new setting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new setting/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^key/i), 'feature.beta_enabled')
    await user.type(dialog.getByLabelText(/^value/i), 'true')
    await user.click(dialog.getByRole('button', { name: /^create$/i }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        key: 'feature.beta_enabled',
        value: 'true',
        dataType: 'STRING',
        category: undefined,
        description: undefined,
      }),
    )
  })
})
