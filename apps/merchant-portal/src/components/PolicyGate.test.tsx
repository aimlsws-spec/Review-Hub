import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '@/contexts/AuthContext'
import { useAcceptPoliciesMutation, useContentPage, usePolicyStatus } from '@/hooks/useLegal'
import type { PolicyStatus } from '@/types'

import { PolicyGate } from './PolicyGate'

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@/hooks/useLegal', () => ({
  usePolicyStatus: vi.fn(),
  useAcceptPoliciesMutation: vi.fn(),
  useContentPage: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const logoutMock = vi.fn()
const acceptMock = vi.fn()

const status = (acceptedReward: boolean): PolicyStatus[] => [
  { policy: 'TERMS_OF_SERVICE', title: 'Terms & Conditions', slug: 'terms-and-conditions', version: 'v', acceptedAt: '2026-10-01T00:00:00Z' },
  { policy: 'PRIVACY_POLICY', title: 'Privacy Policy', slug: 'privacy-policy', version: 'v', acceptedAt: '2026-10-01T00:00:00Z' },
  { policy: 'REWARD_POLICY', title: 'Reward Policy', slug: 'reward-policy', version: 'v', acceptedAt: acceptedReward ? '2026-10-01T00:00:00Z' : null },
]

describe('PolicyGate', () => {
  beforeEach(() => {
    logoutMock.mockReset()
    acceptMock.mockReset()
    vi.mocked(useAuth).mockReturnValue({ logout: logoutMock } as never)
    vi.mocked(useAcceptPoliciesMutation).mockReturnValue({ mutate: acceptMock, isPending: false } as never)
    vi.mocked(useContentPage).mockReturnValue({ isLoading: false, isError: false, data: undefined } as never)
  })

  it('shows nothing once every current policy is accepted', () => {
    vi.mocked(usePolicyStatus).mockReturnValue({ data: status(true) } as never)

    render(<PolicyGate />)

    expect(screen.queryByText('Before you continue')).not.toBeInTheDocument()
  })

  it('asks for the documents still to accept, and records the acceptance', async () => {
    vi.mocked(usePolicyStatus).mockReturnValue({ data: status(false) } as never)
    const user = userEvent.setup()

    render(<PolicyGate />)

    expect(screen.getByText(/accept our Reward Policy to keep using the portal/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /i accept/i }))
    expect(acceptMock).toHaveBeenCalled()
  })

  it('signs out when the merchant declines', async () => {
    vi.mocked(usePolicyStatus).mockReturnValue({ data: status(false) } as never)
    const user = userEvent.setup()

    render(<PolicyGate />)
    await user.click(screen.getByRole('button', { name: /not now, sign out/i }))

    expect(logoutMock).toHaveBeenCalled()
  })

  it('opens a document from its link', async () => {
    vi.mocked(usePolicyStatus).mockReturnValue({ data: status(false) } as never)
    vi.mocked(useContentPage).mockImplementation(
      (slug) =>
        (slug === 'reward-policy'
          ? { isLoading: false, isError: false, data: { slug, title: 'Reward Policy', content: 'Rewards are paid for honest feedback.' } }
          : { isLoading: false, isError: false, data: undefined }) as never,
    )
    const user = userEvent.setup()

    render(<PolicyGate />)
    await user.click(screen.getByRole('button', { name: 'Reward Policy' }))

    expect(await screen.findByText('Rewards are paid for honest feedback.')).toBeInTheDocument()
  })

  it('says so when a document is not published yet', async () => {
    vi.mocked(usePolicyStatus).mockReturnValue({ data: status(false) } as never)
    vi.mocked(useContentPage).mockImplementation(
      (slug) =>
        (slug
          ? { isLoading: false, isError: true, error: Object.assign(new Error('nf'), { isAxiosError: true, response: { status: 404 } }) }
          : { isLoading: false, isError: false, data: undefined }) as never,
    )
    const user = userEvent.setup()

    render(<PolicyGate />)
    await user.click(screen.getByRole('button', { name: 'Privacy Policy' }))

    expect(await screen.findByText(/has not been published yet/i)).toBeInTheDocument()
  })
})
