import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export interface DailyRewardPrizeFormData {
  label: string
  amount: number
  weight: number
  isActive: boolean
}

/** Fetches the paginated list of daily reward prizes. */
export function useDailyRewardPrizesQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DAILY_REWARD_PRIZES, params.page],
    queryFn: () => adminApi.listDailyRewardPrizes(params),
  })
}

/** Creates or updates a daily reward prize depending on whether `editingId` is provided. */
export function useSaveDailyRewardPrizeMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ editingId, form }: { editingId: string | null; form: DailyRewardPrizeFormData }) =>
      editingId
        ? adminApi.updateDailyRewardPrize(editingId, form)
        : adminApi.createDailyRewardPrize(form),
    onSuccess: (_, { editingId }) => {
      toast.success(editingId ? 'Prize updated' : 'Prize created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_REWARD_PRIZES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Deletes a daily reward prize. */
export function useDeleteDailyRewardPrizeMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteDailyRewardPrize(id),
    onSuccess: () => {
      toast.success('Prize deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_REWARD_PRIZES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
