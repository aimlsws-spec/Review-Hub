import { Spinner } from '@viralkar/shared-ui'
import { useEffect, useState } from 'react'

import { useUpdateMerchantProfileMutation } from '@/hooks/useMerchantProfile'
import type { Merchant } from '@/types'

/** Why a typed-in store location can not be saved, or null when it can (both filled and on the map, or both empty). */
export function storeLocationError(latitude: string, longitude: string): string | null {
  const lat = latitude.trim()
  const lng = longitude.trim()
  if (!lat && !lng) return null
  if (!lat || !lng) return 'Enter both latitude and longitude'
  const latNumber = Number(lat)
  const lngNumber = Number(lng)
  if (!Number.isFinite(latNumber) || Math.abs(latNumber) > 90) return 'Latitude must be a number between -90 and 90'
  if (!Number.isFinite(lngNumber) || Math.abs(lngNumber) > 180) return 'Longitude must be a number between -180 and 180'
  return null
}

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

/**
 * Where the store is, so people near it see its campaigns first when they sort by "Nearest" in the app. Can be filled
 * from this computer's location (the browser asks first), or typed in from Google Maps. A store with no location still
 * shows in the app, after the ones that have one.
 */
export function StoreLocationCard({ merchant }: { merchant: Merchant }) {
  const [latitude, setLatitude] = useState(text(merchant.latitude))
  const [longitude, setLongitude] = useState(text(merchant.longitude))
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const update = useUpdateMerchantProfileMutation()

  useEffect(() => {
    setLatitude(text(merchant.latitude))
    setLongitude(text(merchant.longitude))
  }, [merchant.latitude, merchant.longitude])

  const error = storeLocationError(latitude, longitude)
  const saved = merchant.latitude !== null && merchant.latitude !== undefined
  const changed = latitude !== text(merchant.latitude) || longitude !== text(merchant.longitude)

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice('This browser can not share its location. Type the coordinates from Google Maps instead.')
      return
    }
    setLocating(true)
    setNotice(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setNotice('Filled in from this computer’s location. Check it is your store, then save.')
        setLocating(false)
      },
      () => {
        setNotice('Location was not shared. Type the coordinates from Google Maps instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const save = () => {
    if (error) return
    const lat = latitude.trim()
    update.mutate(lat ? { latitude: Number(lat), longitude: Number(longitude.trim()) } : { latitude: null, longitude: null })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        People near your store see your campaigns first when they sort by <span className="font-medium">Nearest</span> in
        the app. In Google Maps, right-click your store and click the numbers at the top to copy them.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">Latitude</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="23.0225"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="label">Longitude</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="72.5714"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </label>
      </div>
      {error && (latitude || longitude) && <p className="error-text" role="alert">{error}</p>}
      {notice && <p className="text-sm text-gray-600" role="status">{notice}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={useCurrentLocation} disabled={locating}>
          {locating && <Spinner size="sm" />}
          Use my current location
        </button>
        <button type="button" className="btn-primary btn-sm" onClick={save} disabled={!!error || !changed || update.isPending}>
          {update.isPending && <Spinner size="sm" className="text-white" />}
          {latitude.trim() || !saved ? 'Save location' : 'Remove location'}
        </button>
        {saved && !changed && (
          <a
            className="btn-ghost btn-sm"
            href={`https://www.google.com/maps?q=${merchant.latitude},${merchant.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Check on Google Maps
          </a>
        )}
      </div>
    </div>
  )
}
