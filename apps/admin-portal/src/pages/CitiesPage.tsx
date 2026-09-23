import {
  PageHeader,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  Badge,
  Modal,
  Input,
  Select,
  Spinner,
} from '@reviewhub/shared-ui'
import { useState } from 'react'

import { ITEMS_PER_PAGE } from '@/constants'
import { useCitiesQuery, useCreateCityMutation, useLocationStatesQuery, useUpdateCityMutation } from '@/hooks/useCities'
import type { City } from '@/types'

export default function CitiesPage() {
  const [page, setPage] = useState(1)
  const [stateFilter, setStateFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newStateId, setNewStateId] = useState('')
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<City | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const { data: statesData } = useLocationStatesQuery()
  const states = statesData?.data.data ?? []
  const stateOptions = states.map((s) => ({ value: s.id, label: s.name }))

  const { data, isLoading, isError, refetch } = useCitiesQuery({
    page,
    limit: ITEMS_PER_PAGE,
    stateId: stateFilter || undefined,
    includeInactive,
  })

  const cities = data?.data.data.data ?? []
  const total = data?.data.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  const { mutate: createCity, isPending: creating } = useCreateCityMutation(() => {
    setAddOpen(false)
    setNewName('')
  })
  const { mutate: updateCity, isPending: updating } = useUpdateCityMutation(() => setRenaming(null))

  const openRename = (city: City) => {
    setRenaming(city)
    setRenameValue(city.name)
  }

  const canCreate = newStateId.length > 0 && newName.trim().length >= 2

  return (
    <div>
      <PageHeader
        title="Cities"
        subtitle="The starter list of cities people can choose from at sign-up. States are already complete — this fills out the cities over time."
        primaryAction={<button className="btn-primary" onClick={() => setAddOpen(true)}>Add city</button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select
            options={[{ value: '', label: 'All states' }, ...stateOptions]}
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setPage(1) }}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            checked={includeInactive}
            onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1) }}
          />
          Show switched-off cities too
        </label>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : cities.length === 0 ? (
        <EmptyState title="No cities found" description="Add a city, or clear the state filter." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">City</th>
                <th className="table-th">State</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cities.map((city) => (
                <tr key={city.id} className="table-tr">
                  <td className="table-td font-medium text-gray-900">{city.name}</td>
                  <td className="table-td text-gray-500">{city.state?.name ?? '—'}</td>
                  <td className="table-td">
                    <Badge variant={city.isActive ? 'green' : 'gray'}>{city.isActive ? 'Active' : 'Switched off'}</Badge>
                  </td>
                  <td className="table-td text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => openRename(city)}>Rename</button>
                      <button
                        className="btn-ghost btn-sm"
                        disabled={updating}
                        onClick={() => updateCity({ cityId: city.id, data: { isActive: !city.isActive } })}
                      >
                        {city.isActive ? 'Switch off' : 'Switch on'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add city"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!canCreate || creating}
              onClick={() => createCity({ stateId: newStateId, name: newName.trim() })}
            >
              {creating && <Spinner size="sm" className="text-white" />}
              Add city
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="State"
            required
            placeholder="Select a state"
            options={stateOptions}
            value={newStateId}
            onChange={(e) => setNewStateId(e.target.value)}
          />
          <Input
            label="City name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
      </Modal>

      {renaming && (
        <Modal
          open
          onClose={() => setRenaming(null)}
          title="Rename city"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setRenaming(null)} disabled={updating}>Cancel</button>
              <button
                className="btn-primary"
                disabled={renameValue.trim().length < 2 || updating}
                onClick={() => updateCity({ cityId: renaming.id, data: { name: renameValue.trim() } })}
              >
                {updating && <Spinner size="sm" className="text-white" />}
                Save
              </button>
            </>
          }
        >
          <Input label="City name" required value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
        </Modal>
      )}
    </div>
  )
}
