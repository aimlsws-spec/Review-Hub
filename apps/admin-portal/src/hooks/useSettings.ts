import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

/** Fetches all system settings, optionally scoped to a category. */
export function useSettingsQuery(category?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS,
    queryFn: () => adminApi.listSettings(category),
  })
}

/** Updates the value of an existing setting. */
export function useUpdateSettingMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.updateSetting(key, { value }),
    onSuccess: () => {
      toast.success('Setting updated')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Creates a new system setting. */
export function useCreateSettingMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { key: string; value: unknown; dataType?: string; category?: string; description?: string }) =>
      adminApi.createSetting(data),
    onSuccess: () => {
      toast.success('Setting created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
