import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export interface AiProviderFormData {
  name: string
  provider: string
  apiEndpoint?: string
  model?: string
  enabled?: boolean
  priority?: number
  timeout?: number
}

/** Fetches every configured AI provider, with their models and prompt templates. */
export function useAiProvidersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.AI_PROVIDERS,
    queryFn: () => adminApi.listAiProviders(),
  })
}

/** Fetches the paginated usage log for one AI provider. */
export function useAiUsageLogsQuery(providerId: string, params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AI_USAGE_LOGS, providerId, params.page],
    queryFn: () => adminApi.listAiUsageLogs(providerId, params),
    enabled: !!providerId,
  })
}

/** Registers a new AI provider. */
export function useCreateAiProviderMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (form: AiProviderFormData) => adminApi.createAiProvider(form),
    onSuccess: () => {
      toast.success('AI provider created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Updates an AI provider's settings. */
export function useUpdateAiProviderMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<Omit<AiProviderFormData, 'name' | 'provider'>> }) =>
      adminApi.updateAiProvider(providerId, data),
    onSuccess: () => {
      toast.success('AI provider updated')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Removes an AI provider. */
export function useDeleteAiProviderMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (providerId: string) => adminApi.deleteAiProvider(providerId),
    onSuccess: () => {
      toast.success('AI provider deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Adds a model to an AI provider. */
export function useAddAiModelMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: { modelName: string; version?: string; maxTokens?: number; temperature?: number } }) =>
      adminApi.addAiModel(providerId, data),
    onSuccess: () => {
      toast.success('Model added')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Removes a model from an AI provider. */
export function useRemoveAiModelMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (modelId: string) => adminApi.removeAiModel(modelId),
    onSuccess: () => {
      toast.success('Model removed')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Adds a prompt template to an AI provider. */
export function useAddAiPromptTemplateMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: { name: string; prompt: string; version?: string } }) =>
      adminApi.addAiPromptTemplate(providerId, data),
    onSuccess: () => {
      toast.success('Prompt template added')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Removes a prompt template from an AI provider. */
export function useRemoveAiPromptTemplateMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => adminApi.removeAiPromptTemplate(templateId),
    onSuccess: () => {
      toast.success('Prompt template removed')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_PROVIDERS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
