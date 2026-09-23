import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCitiesQuery, useCreateCityMutation, useLocationStatesQuery, useUpdateCityMutation } from '@/hooks/useCities'

import CitiesPage from './CitiesPage'

vi.mock('@/hooks/useCities', () => ({
  useLocationStatesQuery: vi.fn(),
  useCitiesQuery: vi.fn(),
  useCreateCityMutation: vi.fn(),
  useUpdateCityMutation: vi.fn(),
}))

const tamilNadu = { id: 'state-1', name: 'Tamil Nadu', code: 'TN' }

const city = {
  id: 'city-1',
  stateId: 'state-1',
  name: 'Coimbatore',
  isActive: true,
  state: { name: 'Tamil Nadu' },
}

const createMock = vi.fn()
const updateMock = vi.fn()

function renderPage() {
  return render(<CitiesPage />)
}

describe('CitiesPage', () => {
  beforeEach(() => {
    vi.mocked(useLocationStatesQuery).mockReturnValue({
      data: { data: { data: [tamilNadu] } },
      isLoading: false,
    } as never)
    vi.mocked(useCitiesQuery).mockReturnValue({
      data: { data: { data: { data: [city], total: 1, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCreateCityMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    vi.mocked(useUpdateCityMutation).mockReturnValue({ mutate: updateMock, isPending: false } as never)
    createMock.mockReset()
    updateMock.mockReset()
  })

  it('shows an empty state when there are no cities', () => {
    vi.mocked(useCitiesQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no cities found/i)).toBeInTheDocument()
  })

  it('renders a city row with its state and active status', () => {
    renderPage()

    const table = within(screen.getByRole('table'))
    expect(table.getByText('Coimbatore')).toBeInTheDocument()
    expect(table.getByText('Tamil Nadu')).toBeInTheDocument()
    expect(table.getByText('Active')).toBeInTheDocument()
  })

  it('requires a state and a name before adding a city', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add city/i }))
    const dialog = screen.getByRole('dialog')
    const addButton = within(dialog).getByRole('button', { name: /add city/i })
    expect(addButton).toBeDisabled()

    await user.selectOptions(within(dialog).getByLabelText(/state/i), 'state-1')
    await user.type(within(dialog).getByLabelText(/city name/i), 'Salem')
    expect(addButton).toBeEnabled()

    await user.click(addButton)
    await waitFor(() => expect(createMock).toHaveBeenCalledWith({ stateId: 'state-1', name: 'Salem' }))
  })

  it('switches a city off', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /switch off/i }))
    expect(updateMock).toHaveBeenCalledWith({ cityId: 'city-1', data: { isActive: false } })
  })
})
