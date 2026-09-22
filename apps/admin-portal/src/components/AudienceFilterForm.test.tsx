import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AudienceLocation } from '@/types'
import { EMPTY_AUDIENCE_FORM, type AudienceForm } from '@/utils/notifications'

import { AudienceFilterForm } from './AudienceFilterForm'

const locations: AudienceLocation[] = [
  { id: 's1', name: 'Gujarat', cities: [{ id: 'c1', name: 'Ahmedabad' }, { id: 'c2', name: 'Surat' }] },
  { id: 's2', name: 'Maharashtra', cities: [{ id: 'c3', name: 'Pune' }] },
]

/** Keeps real form state so typing behaves as it does on the page. */
function Harness({ initial = EMPTY_AUDIENCE_FORM, onChange }: { initial?: AudienceForm; onChange?: (form: AudienceForm) => void }) {
  const [form, setForm] = useState(initial)
  return (
    <AudienceFilterForm
      value={form}
      locations={locations}
      onChange={(next) => {
        setForm(next)
        onChange?.(next)
      }}
    />
  )
}

describe('AudienceFilterForm', () => {
  it('starts with nothing filtered', () => {
    render(<Harness />)

    expect(screen.getByLabelText('State')).toHaveValue('')
    expect(screen.getByLabelText('Gender')).toHaveValue('')
    expect(screen.getByLabelText('Minimum age')).toHaveValue(null)
  })

  it('keeps the city picker off until a state is chosen', () => {
    render(<Harness />)

    expect(screen.getByLabelText('City')).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Choose a state first' })).toBeInTheDocument()
  })

  it('offers only the chosen state’s cities', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.selectOptions(screen.getByLabelText('State'), 'Gujarat')

    expect(screen.getByLabelText('City')).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Ahmedabad' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Surat' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Pune' })).not.toBeInTheDocument()
  })

  it('clears the city when the state changes, since a city belongs to one state', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('State'), 'Gujarat')
    await user.selectOptions(screen.getByLabelText('City'), 'Surat')
    await user.selectOptions(screen.getByLabelText('State'), 'Maharashtra')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ stateId: 's2', cityId: '' }))
    expect(screen.getByLabelText('City')).toHaveValue('')
  })

  it('reports each field as it is filled in', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Gender'), 'Female')
    await user.type(screen.getByLabelText('Minimum age'), '18')
    await user.type(screen.getByLabelText('Maximum level'), '5')
    await user.selectOptions(screen.getByLabelText('KYC'), 'KYC verified')
    await user.type(screen.getByLabelText('Inactive for at least (days)'), '30')

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gender: 'FEMALE', minAge: '18', maxLevel: '5', kyc: 'yes', inactiveForDays: '30' }),
    )
  })

  it('shows values it is given', () => {
    render(<Harness initial={{ ...EMPTY_AUDIENCE_FORM, stateId: 's1', cityId: 'c2', gender: 'MALE', joinedWithinDays: '7' }} />)

    expect(screen.getByLabelText('State')).toHaveValue('s1')
    expect(screen.getByLabelText('City')).toHaveValue('c2')
    expect(screen.getByLabelText('Gender')).toHaveValue('MALE')
    expect(screen.getByLabelText('Joined in the last (days)')).toHaveValue(7)
  })
})
