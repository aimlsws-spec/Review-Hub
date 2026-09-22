import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAccountRiskQuery } from '@/hooks/useAccountRisk'

import { AccountRiskPanel } from './AccountRiskPanel'

vi.mock('@/hooks/useAccountRisk', () => ({ useAccountRiskQuery: vi.fn() }))

const risk = {
  score: 85,
  level: 'CRITICAL',
  deviceRisk: 25,
  linkPoints: 60,
  linkedAccounts: [
    { userId: 'u2', name: 'Priya Sharma', status: 'ACTIVE', kinds: ['PAN', 'DEVICE'] },
    { userId: 'u3', name: 'Arjun Mehta', status: 'SUSPENDED', kinds: ['IP'] },
  ],
  recentIps: [
    { ip: '203.0.113.9', verdict: 'ANONYMIZER', sources: ['vpn', 'watch-list'] },
    { ip: '198.51.100.4', verdict: 'CLEAN', sources: [] },
    { ip: '10.0.0.5', verdict: 'PRIVATE', sources: [] },
    { ip: '192.0.2.1', verdict: 'UNKNOWN', sources: [] },
  ],
}

const withRisk = (overrides: Record<string, unknown> = {}) =>
  vi.mocked(useAccountRiskQuery).mockReturnValue({ data: { data: { data: { ...risk, ...overrides } } }, isLoading: false, isError: false } as never)

const renderPanel = () => render(<AccountRiskPanel userId="user-1" />)

describe('AccountRiskPanel', () => {
  beforeEach(() => withRisk())

  it('asks for this user only', () => {
    renderPanel()

    expect(useAccountRiskQuery).toHaveBeenCalledWith('user-1')
  })

  it('shows the overall score and what it is made of', () => {
    renderPanel()

    const section = within(screen.getByRole('region', { name: 'Account risk' }))
    expect(section.getByText('CRITICAL')).toBeInTheDocument()
    expect(section.getByText('85')).toBeInTheDocument()
    expect(section.getByText(/Device risk 25/)).toBeInTheDocument()
    expect(section.getByText(/Linked-account points 60/)).toBeInTheDocument()
  })

  describe('linked accounts', () => {
    it('lists each account with its status and how it is tied to this one', () => {
      renderPanel()

      const priya = within(screen.getByText('Priya Sharma').closest('li') as HTMLElement)
      expect(priya.getByText('ACTIVE')).toBeInTheDocument()
      expect(priya.getByText('Same PAN')).toBeInTheDocument()
      expect(priya.getByText('Same device')).toBeInTheDocument()

      const arjun = within(screen.getByText('Arjun Mehta').closest('li') as HTMLElement)
      expect(arjun.getByText('SUSPENDED')).toBeInTheDocument()
      expect(arjun.getByText('Same network')).toBeInTheDocument()
    })

    it('says plainly when there are none, rather than showing an empty box', () => {
      withRisk({ linkedAccounts: [], linkPoints: 0 })
      renderPanel()

      expect(screen.getByText(/no other account shares a pan, bank account, device or network/i)).toBeInTheDocument()
    })
  })

  describe('recent IP addresses', () => {
    it('labels each address with what the reputation check found', () => {
      renderPanel()

      const row = (ip: string) => within(screen.getByText(ip).closest('li') as HTMLElement)
      expect(row('203.0.113.9').getByText('VPN / proxy')).toBeInTheDocument()
      expect(row('203.0.113.9').getByText('vpn, watch-list')).toBeInTheDocument()
      expect(row('198.51.100.4').getByText('Not listed')).toBeInTheDocument()
      expect(row('10.0.0.5').getByText('Local address')).toBeInTheDocument()
      expect(row('192.0.2.1').getByText('Not checked')).toBeInTheDocument()
    })

    it('says so when there are no recent logins', () => {
      withRisk({ recentIps: [] })
      renderPanel()

      expect(screen.getByText('No recent logins.')).toBeInTheDocument()
    })
  })

  it('shows a placeholder while loading, without claiming the account is clean', () => {
    vi.mocked(useAccountRiskQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never)
    renderPanel()

    expect(screen.queryByText(/no other account shares/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Score/)).not.toBeInTheDocument()
  })

  it('says the details could not be loaded, rather than showing an empty (reassuring) report', () => {
    vi.mocked(useAccountRiskQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    renderPanel()

    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
    expect(screen.queryByText(/no other account shares/i)).not.toBeInTheDocument()
  })
})
