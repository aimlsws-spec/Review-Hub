import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi, type CampaignTaskInput } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage, requireValue } from '@/utils'

const tasksKey = (campaignId: string | undefined) => [...QUERY_KEYS.CAMPAIGNS, campaignId, 'tasks']

/** One campaign with its tasks, for the task editor. */
export function useCampaignTasksQuery(campaignId: string | undefined) {
  return useQuery({
    queryKey: tasksKey(campaignId),
    queryFn: () => merchantApi.getCampaign(requireValue(campaignId, 'campaignId')),
    enabled: !!campaignId,
  })
}

/** Add, change and remove a campaign's tasks. Each refreshes the task list on success. */
export function useCampaignTaskMutations(campaignId: string | undefined, options?: { onSaveSuccess?: () => void }) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: tasksKey(campaignId) })

  const saveMutation = useMutation({
    mutationFn: ({ taskId, input }: { taskId?: string; input: CampaignTaskInput }) =>
      taskId
        ? merchantApi.updateCampaignTask(requireValue(campaignId, 'campaignId'), taskId, input)
        : merchantApi.createCampaignTask(requireValue(campaignId, 'campaignId'), input),
    onSuccess: (_, { taskId }) => {
      toast.success(taskId ? 'Task updated' : 'Task added')
      refresh()
      options?.onSaveSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => merchantApi.deleteCampaignTask(requireValue(campaignId, 'campaignId'), taskId),
    onSuccess: () => {
      toast.success('Task removed')
      refresh()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  return { saveMutation, deleteMutation }
}
