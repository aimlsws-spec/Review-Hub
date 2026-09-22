import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { merchantApi } from '@/api/merchant.api'

import { useWordingCheck } from './useWordingCheck'

vi.mock('@/api/merchant.api', () => ({ merchantApi: { checkCampaignWording: vi.fn() } }))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const answer = (allowed: boolean) => ({ data: { data: { allowed, findings: [] } } }) as never

describe('useWordingCheck', () => {
  beforeEach(() => {
    vi.mocked(merchantApi.checkCampaignWording).mockReset()
  })

  it('does not ask the server when there is nothing worth checking yet', async () => {
    const { result } = renderHook(() => useWordingCheck('merchant-1', { title: 'Hi', description: '' }), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(merchantApi.checkCampaignWording).not.toHaveBeenCalled()
    expect(result.current).toBeUndefined()
  })

  it('does not ask the server without a merchant', async () => {
    renderHook(() => useWordingCheck(undefined, { title: 'A proper title' }), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(merchantApi.checkCampaignWording).not.toHaveBeenCalled()
  })

  it('checks once the merchant pauses, sending the trimmed text', async () => {
    vi.mocked(merchantApi.checkCampaignWording).mockResolvedValue(answer(true))

    const { result } = renderHook(() => useWordingCheck('merchant-1', { title: '  A proper title  ', description: 'Tell us honestly.' }), { wrapper })

    await waitFor(() => expect(result.current).toEqual({ allowed: true, findings: [] }))
    expect(merchantApi.checkCampaignWording).toHaveBeenCalledWith('merchant-1', {
      title: 'A proper title',
      shortDescription: '',
      description: 'Tell us honestly.',
    })
  })

  it('waits while the text is still changing instead of asking on every keystroke', async () => {
    vi.mocked(merchantApi.checkCampaignWording).mockResolvedValue(answer(true))

    const { rerender } = renderHook(({ title }) => useWordingCheck('merchant-1', { title }), {
      wrapper,
      initialProps: { title: 'Winter drive' },
    })
    rerender({ title: 'Winter drive now' })
    rerender({ title: 'Winter drive now on' })

    // The text already there is checked at once (editing an existing campaign); the two edits in between never are.
    await waitFor(() => expect(merchantApi.checkCampaignWording).toHaveBeenCalledTimes(2))
    const sent = vi.mocked(merchantApi.checkCampaignWording).mock.calls.map((call) => call[1].title)
    expect(sent).toEqual(['Winter drive', 'Winter drive now on'])
  })

  it('stays quiet when the check fails: the server checks again on submit', async () => {
    vi.mocked(merchantApi.checkCampaignWording).mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useWordingCheck('merchant-1', { title: 'A proper title' }), { wrapper })

    await waitFor(() => expect(merchantApi.checkCampaignWording).toHaveBeenCalled())
    expect(result.current).toBeUndefined()
  })
})
