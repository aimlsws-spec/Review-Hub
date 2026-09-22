import { Input, Select } from '@reviewhub/shared-ui'

import type { AudienceLocation } from '@/types'
import type { AudienceForm } from '@/utils/notifications'

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
]

const KYC_OPTIONS = [
  { value: 'yes', label: 'KYC verified' },
  { value: 'no', label: 'Not KYC verified' },
]

interface AudienceFilterFormProps {
  value: AudienceForm
  onChange: (next: AudienceForm) => void
  locations: AudienceLocation[]
}

/** The targeting fields for a broadcast. Leave a field empty to not filter on it; all filled fields must match. */
export function AudienceFilterForm({ value, onChange, locations }: AudienceFilterFormProps) {
  const set = <K extends keyof AudienceForm>(key: K, next: AudienceForm[K]) => onChange({ ...value, [key]: next })
  const cities = locations.find((state) => state.id === value.stateId)?.cities ?? []

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      <Select
        label="State"
        placeholder="All states"
        options={locations.map((state) => ({ value: state.id, label: state.name }))}
        value={value.stateId}
        // A city belongs to one state, so changing the state clears it.
        onChange={(e) => onChange({ ...value, stateId: e.target.value, cityId: '' })}
      />
      <Select
        label="City"
        placeholder={value.stateId ? 'All cities' : 'Choose a state first'}
        options={cities.map((city) => ({ value: city.id, label: city.name }))}
        value={value.cityId}
        disabled={!value.stateId}
        onChange={(e) => set('cityId', e.target.value)}
      />
      <Select
        label="Gender"
        placeholder="Any gender"
        options={GENDER_OPTIONS}
        value={value.gender}
        onChange={(e) => set('gender', e.target.value as AudienceForm['gender'])}
      />
      <Input label="Minimum age" type="number" min={13} max={120} inputMode="numeric" value={value.minAge} onChange={(e) => set('minAge', e.target.value)} />
      <Input label="Maximum age" type="number" min={13} max={120} inputMode="numeric" value={value.maxAge} onChange={(e) => set('maxAge', e.target.value)} />
      <Select
        label="KYC"
        placeholder="Any"
        options={KYC_OPTIONS}
        value={value.kyc}
        onChange={(e) => set('kyc', e.target.value as AudienceForm['kyc'])}
      />
      <Input label="Minimum level" type="number" min={1} inputMode="numeric" value={value.minLevel} onChange={(e) => set('minLevel', e.target.value)} />
      <Input label="Maximum level" type="number" min={1} inputMode="numeric" value={value.maxLevel} onChange={(e) => set('maxLevel', e.target.value)} />
      <Input
        label="Joined in the last (days)"
        type="number"
        min={1}
        inputMode="numeric"
        value={value.joinedWithinDays}
        onChange={(e) => set('joinedWithinDays', e.target.value)}
      />
      <Input
        label="Inactive for at least (days)"
        type="number"
        min={1}
        inputMode="numeric"
        hint="Has not logged in for this long"
        value={value.inactiveForDays}
        onChange={(e) => set('inactiveForDays', e.target.value)}
      />
    </div>
  )
}
