import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { PlatformConfiguration } from '@/types'
import { getApiErrorMessage } from '@/utils'

/** Fetches the singleton platform configuration. */
export function usePlatformConfigurationQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.PLATFORM_CONFIGURATION,
    queryFn: () => adminApi.getPlatformConfiguration(),
  })
}

/** Updates the platform configuration. */
export function useUpdatePlatformConfigurationMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Omit<PlatformConfiguration, 'id' | 'appVersion' | 'apiVersion'>>) =>
      adminApi.updatePlatformConfiguration(data),
    onSuccess: () => {
      toast.success('Platform configuration updated')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLATFORM_CONFIGURATION })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
