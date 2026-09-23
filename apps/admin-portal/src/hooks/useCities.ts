import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

/** States to pick from when adding a city. The list is complete and rarely changes. */
export function useLocationStatesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.LOCATION_STATES,
    queryFn: () => adminApi.listLocationStates(),
    staleTime: 60 * 60 * 1000,
  })
}

export function useCitiesQuery(params: { page: number; limit: number; stateId?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CITIES, params.page, params.stateId, params.includeInactive],
    queryFn: () => adminApi.listCities(params),
  })
}

export function useCreateCityMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { stateId: string; name: string }) => adminApi.createCity(data),
    onSuccess: () => {
      toast.success('City added')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CITIES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useUpdateCityMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cityId, data }: { cityId: string; data: Partial<{ name: string; isActive: boolean }> }) =>
      adminApi.updateCity(cityId, data),
    onSuccess: () => {
      toast.success('City updated')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CITIES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
