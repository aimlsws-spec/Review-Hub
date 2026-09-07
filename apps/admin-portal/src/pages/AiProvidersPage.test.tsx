import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAddAiModelMutation,
  useAddAiPromptTemplateMutation,
  useAiProvidersQuery,
  useAiUsageLogsQuery,
  useCreateAiProviderMutation,
  useDeleteAiProviderMutation,
  useRemoveAiModelMutation,
  useRemoveAiPromptTemplateMutation,
  useUpdateAiProviderMutation,
} from '@/hooks/useAiProviders'

import AiProvidersPage from './AiProvidersPage'

vi.mock('@/hooks/useAiProviders', () => ({
  useAiProvidersQuery: vi.fn(),
  useAiUsageLogsQuery: vi.fn(),
  useCreateAiProviderMutation: vi.fn(),
  useUpdateAiProviderMutation: vi.fn(),
  useDeleteAiProviderMutation: vi.fn(),
  useAddAiModelMutation: vi.fn(),
  useRemoveAiModelMutation: vi.fn(),
  useAddAiPromptTemplateMutation: vi.fn(),
  useRemoveAiPromptTemplateMutation: vi.fn(),
}))

const provider = {
  id: 'provider-1',
  name: 'openai-primary',
  provider: 'openai',
  apiEndpoint: null,
  model: 'gpt-4o-mini',
  enabled: true,
  priority: 0,
  timeout: 30000,
  configuration: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  models: [],
  prompts: [],
}

const createMock = vi.fn()
const updateMock = vi.fn()
const removeMock = vi.fn()
const addModelMock = vi.fn()
const removeModelMock = vi.fn()
const addTemplateMock = vi.fn()
const removeTemplateMock = vi.fn()

function renderPage() {
  return render(<AiProvidersPage />)
}

describe('AiProvidersPage', () => {
  beforeEach(() => {
    vi.mocked(useAiProvidersQuery).mockReturnValue({
      data: { data: { data: [provider] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useAiUsageLogsQuery).mockReturnValue({
      data: { data: { data: { data: [], total: 0, page: 1, limit: 20 } } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    vi.mocked(useCreateAiProviderMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    vi.mocked(useUpdateAiProviderMutation).mockReturnValue({ mutate: updateMock, isPending: false } as never)
    vi.mocked(useDeleteAiProviderMutation).mockReturnValue({ mutate: removeMock, isPending: false } as never)
    vi.mocked(useAddAiModelMutation).mockReturnValue({ mutate: addModelMock, isPending: false } as never)
    vi.mocked(useRemoveAiModelMutation).mockReturnValue({ mutate: removeModelMock, isPending: false } as never)
    vi.mocked(useAddAiPromptTemplateMutation).mockReturnValue({ mutate: addTemplateMock, isPending: false } as never)
    vi.mocked(useRemoveAiPromptTemplateMutation).mockReturnValue({ mutate: removeTemplateMock, isPending: false } as never)
    createMock.mockReset()
    updateMock.mockReset()
    removeMock.mockReset()
    addModelMock.mockReset()
  })

  it('shows an empty state when there are no providers', () => {
    vi.mocked(useAiProvidersQuery).mockReturnValue({
      data: { data: { data: [] } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never)
    renderPage()
    expect(screen.getByText(/no ai providers configured/i)).toBeInTheDocument()
  })

  it('renders a provider row', () => {
    renderPage()
    expect(screen.getByText('openai-primary')).toBeInTheDocument()
    expect(screen.getByText('openai')).toBeInTheDocument()
  })

  it('creates a new provider', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new provider/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^name/i), 'anthropic-primary')
    await user.type(dialog.getByLabelText(/^provider/i), 'anthropic')
    await user.click(dialog.getByRole('button', { name: /create provider/i }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'anthropic-primary', provider: 'anthropic' })),
    )
  })

  it('deletes a provider after confirming', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('provider-1'))
  })

  it('opens the manage modal and adds a model', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /manage/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByPlaceholderText(/gpt-4o-mini/i), 'gpt-4o')
    await user.click(dialog.getByRole('button', { name: /^add$/i }))

    await waitFor(() =>
      expect(addModelMock).toHaveBeenCalledWith({ providerId: 'provider-1', data: { modelName: 'gpt-4o' } }),
    )
  })
})
