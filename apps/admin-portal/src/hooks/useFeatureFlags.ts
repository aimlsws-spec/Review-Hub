import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import type { FeatureFlag } from '@/types'

/** Fetches all feature flags. */
export function useFeatureFlagsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.FEATURE_FLAGS,
    queryFn: () => adminApi.listFeatureFlags(),
  })
}

/** Toggles a feature flag's enabled state. */
export function useToggleFeatureFlagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (flag: FeatureFlag) => adminApi.updateFeatureFlag(flag.key, { enabled: !flag.enabled }),
    onSuccess: (_, flag) => {
      toast.success(`${flag.key} ${flag.enabled ? 'disabled' : 'enabled'}`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEATURE_FLAGS })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Updates a feature flag's rollout percentage. */
export function useUpdateFeatureFlagRolloutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, rolloutPercentage }: { key: string; rolloutPercentage: number }) =>
      adminApi.updateFeatureFlag(key, { rolloutPercentage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEATURE_FLAGS }),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Creates a new feature flag. */
export function useCreateFeatureFlagMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { key: string; description?: string; rolloutPercentage?: number }) => adminApi.createFeatureFlag(data),
    onSuccess: () => {
      toast.success('Feature flag created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FEATURE_FLAGS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
