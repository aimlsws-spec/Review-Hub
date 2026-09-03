import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCreateFeatureFlagMutation,
  useFeatureFlagsQuery,
  useToggleFeatureFlagMutation,
  useUpdateFeatureFlagRolloutMutation,
} from '@/hooks/useFeatureFlags'

import FeatureFlagsPage from './FeatureFlagsPage'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlagsQuery: vi.fn(),
  useToggleFeatureFlagMutation: vi.fn(),
  useUpdateFeatureFlagRolloutMutation: vi.fn(),
  useCreateFeatureFlagMutation: vi.fn(),
}))

const flag = {
  id: 'flag-1',
  key: 'ai_verification',
  description: 'Enables AI-assisted submission verification',
  enabled: true,
  rolloutPercentage: 50,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const toggleMock = vi.fn()
const updateRolloutMock = vi.fn()
const createMock = vi.fn()

function renderPage() {
  return render(<FeatureFlagsPage />)
}

describe('FeatureFlagsPage', () => {
  beforeEach(() => {
    vi.mocked(useFeatureFlagsQuery).mockReturnValue({ data: { data: { data: [flag] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    vi.mocked(useToggleFeatureFlagMutation).mockReturnValue({ mutate: toggleMock } as never)
    vi.mocked(useUpdateFeatureFlagRolloutMutation).mockReturnValue({ mutate: updateRolloutMock } as never)
    vi.mocked(useCreateFeatureFlagMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    toggleMock.mockReset()
    updateRolloutMock.mockReset()
    createMock.mockReset()
  })

  it('shows an empty state when there are no flags', () => {
    vi.mocked(useFeatureFlagsQuery).mockReturnValue({ data: { data: { data: [] } }, isLoading: false, isError: false, refetch: vi.fn() } as never)
    renderPage()
    expect(screen.getByText(/no feature flags yet/i)).toBeInTheDocument()
  })

  it('renders a flag with its key, description, and rollout', () => {
    renderPage()

    expect(screen.getByText('ai_verification')).toBeInTheDocument()
    expect(screen.getByText(/enables ai-assisted submission verification/i)).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('toggles a flag', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('switch'))
    expect(toggleMock).toHaveBeenCalledWith(flag)
  })

  it('updates the rollout percentage', () => {
    renderPage()

    fireEvent.change(screen.getByRole('slider'), { target: { value: '75' } })

    expect(updateRolloutMock).toHaveBeenCalledWith({ key: 'ai_verification', rolloutPercentage: 75 })
  })

  it('creates a new feature flag', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new flag/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/^key/i), 'reward_multiplier')
    await user.type(dialog.getByLabelText(/description/i), 'Applies a seasonal reward multiplier')
    await user.click(dialog.getByRole('button', { name: /^create$/i }))

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({ key: 'reward_multiplier', description: 'Applies a seasonal reward multiplier', rolloutPercentage: 0 }),
    )
  })
})
