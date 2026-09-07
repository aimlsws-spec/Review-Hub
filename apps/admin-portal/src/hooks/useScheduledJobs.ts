import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import type { JobType } from '@/types'
import { getApiErrorMessage } from '@/utils'

export interface ScheduledJobFormData {
  jobName: string
  jobType: JobType
  cronExpression: string
  enabled: boolean
}

/** Fetches every scheduled job definition. */
export function useScheduledJobsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.SCHEDULED_JOBS,
    queryFn: () => adminApi.listScheduledJobs(),
  })
}

/** Fetches the paginated execution history for one scheduled job. */
export function useJobExecutionLogsQuery(jobId: string, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.JOB_EXECUTION_LOGS, jobId, params.page],
    queryFn: () => adminApi.listJobExecutionLogs(jobId, params),
    enabled: !!jobId,
  })
}

/** Creates a scheduled job definition. */
export function useCreateScheduledJobMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: ScheduledJobFormData) => adminApi.createScheduledJob(form),
    onSuccess: () => {
      toast.success('Scheduled job created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCHEDULED_JOBS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Updates a scheduled job's cron expression / enabled state. */
export function useUpdateScheduledJobMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: Partial<{ cronExpression: string; enabled: boolean }> }) =>
      adminApi.updateScheduledJob(jobId, data),
    onSuccess: () => {
      toast.success('Scheduled job updated')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCHEDULED_JOBS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Deletes a scheduled job definition. */
export function useDeleteScheduledJobMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => adminApi.deleteScheduledJob(jobId),
    onSuccess: () => {
      toast.success('Scheduled job deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCHEDULED_JOBS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
