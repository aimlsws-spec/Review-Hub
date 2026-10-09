import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateMerchantProfileMutation } from '@/hooks/useMerchantProfile'
import type { Merchant } from '@/types'

import { StoreLocationCard, storeLocationError } from './StoreLocationCard'

vi.mock('@/hooks/useMerchantProfile', () => ({ useUpdateMerchantProfileMutation: vi.fn() }))

const mutate = vi.fn()
const merchant = { id: 'merchant-1', businessName: 'Prerna Test Cafe', latitude: null, longitude: null } as unknown as Merchant

describe('storeLocationError', () => {
  it('accepts a point on the map, or nothing at all', () => {
    expect(storeLocationError('23.0225', '72.5714')).toBeNull()
    expect(storeLocationError('', '')).toBeNull()
  })

  it.each([
    ['23.0225', '', 'Enter both latitude and longitude'],
    ['', '72.5714', 'Enter both latitude and longitude'],
    ['95', '72.5', 'Latitude must be a number between -90 and 90'],
    ['north', '72.5', 'Latitude must be a number between -90 and 90'],
    ['23', '200', 'Longitude must be a number between -180 and 180'],
  ])('refuses %s, %s', (latitude, longitude, message) => {
    expect(storeLocationError(latitude, longitude)).toBe(message)
  })
})

describe('StoreLocationCard', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useUpdateMerchantProfileMutation).mockReturnValue({ mutate, isPending: false } as never)
  })

  it('saves a typed-in store location as numbers', async () => {
    const user = userEvent.setup()
    render(<StoreLocationCard merchant={merchant} />)

    await user.type(screen.getByLabelText('Latitude'), '23.0225')
    await user.type(screen.getByLabelText('Longitude'), '72.5714')
    await user.click(screen.getByRole('button', { name: 'Save location' }))

    expect(mutate).toHaveBeenCalledWith({ latitude: 23.0225, longitude: 72.5714 })
  })

  it('does not save half a location', async () => {
    const user = userEvent.setup()
    render(<StoreLocationCard merchant={merchant} />)

    await user.type(screen.getByLabelText('Latitude'), '23.0225')

    expect(screen.getByRole('alert')).toHaveTextContent('Enter both latitude and longitude')
    expect(screen.getByRole('button', { name: 'Save location' })).toBeDisabled()
  })

  it('removes a saved location when both boxes are emptied', async () => {
    const user = userEvent.setup()
    render(<StoreLocationCard merchant={{ ...merchant, latitude: 23.0225, longitude: 72.5714 }} />)

    expect(screen.getByRole('link', { name: 'Check on Google Maps' })).toHaveAttribute('href', 'https://www.google.com/maps?q=23.0225,72.5714')
    await user.clear(screen.getByLabelText('Latitude'))
    await user.clear(screen.getByLabelText('Longitude'))
    await user.click(screen.getByRole('button', { name: 'Remove location' }))

    expect(mutate).toHaveBeenCalledWith({ latitude: null, longitude: null })
  })

  it("fills the boxes from this computer's location when allowed", async () => {
    const user = userEvent.setup()
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: 23.03456789, longitude: 72.56123456 } } as GeolocationPosition),
    )
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    render(<StoreLocationCard merchant={merchant} />)

    await user.click(screen.getByRole('button', { name: 'Use my current location' }))

    expect(screen.getByLabelText('Latitude')).toHaveValue('23.034568')
    expect(screen.getByLabelText('Longitude')).toHaveValue('72.561235')
    expect(screen.getByRole('status')).toHaveTextContent('Check it is your store')
    vi.unstubAllGlobals()
  })

  it('says what to do when the browser does not share its location', async () => {
    const user = userEvent.setup()
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) =>
      failure({ code: 1 } as GeolocationPositionError),
    )
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    render(<StoreLocationCard merchant={merchant} />)

    await user.click(screen.getByRole('button', { name: 'Use my current location' }))

    expect(screen.getByRole('status')).toHaveTextContent('Location was not shared')
    vi.unstubAllGlobals()
  })
})
