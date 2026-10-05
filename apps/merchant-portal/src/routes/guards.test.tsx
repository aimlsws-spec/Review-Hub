import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth.store'

import { BusinessRequiredRoute } from './guards'

vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

function signedInWith(merchant: { id: string } | null) {
  vi.mocked(useAuthStore).mockImplementation(((selector: (s: unknown) => unknown) => selector({ merchant })) as never)
}

function renderTeamRoute() {
  return render(
    <MemoryRouter initialEntries={['/team']}>
      <Routes>
        <Route element={<BusinessRequiredRoute />}>
          <Route path="/team" element={<p>Team page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('BusinessRequiredRoute', () => {
  it('sends a new sign-up without a business to set up their profile', () => {
    signedInWith(null)
    renderTeamRoute()

    expect(screen.queryByText('Team page')).not.toBeInTheDocument()
    expect(screen.getByText('Set up your business profile first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set up profile' })).toHaveAttribute('href', '/profile')
  })

  it('shows the page once the person has a business', () => {
    signedInWith({ id: 'merchant-1' })
    renderTeamRoute()

    expect(screen.getByText('Team page')).toBeInTheDocument()
  })
})
