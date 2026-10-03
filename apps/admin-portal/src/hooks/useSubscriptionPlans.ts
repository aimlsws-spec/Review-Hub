import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { SubscriptionPlanForm } from '@/types'
import { getApiErrorMessage } from '@/utils'

/** Every subscription plan, switched on or off, with how many merchants are on each. */
export function useSubscriptionPlansQuery() {
  return useQuery({ queryKey: QUERY_KEYS.SUBSCRIPTION_PLANS, queryFn: () => adminApi.listSubscriptionPlans() })
}

/** Creates a plan, or updates one when `planId` is given (the code can not change). */
export function useSaveSubscriptionPlanMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ planId, form }: { planId: string | null; form: SubscriptionPlanForm }) => {
      if (!planId) return adminApi.createSubscriptionPlan(form)
      // The code never changes, and the server refuses it on an update.
      const changes: Partial<SubscriptionPlanForm> = { ...form }
      delete changes.code
      return adminApi.updateSubscriptionPlan(planId, changes as Omit<SubscriptionPlanForm, 'code'>)
    },
    onSuccess: (_, { planId }) => {
      toast.success(planId ? 'Plan updated' : 'Plan created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUBSCRIPTION_PLANS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
