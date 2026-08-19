import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export interface FaqFormData {
  category: string
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
}

/** Fetches the paginated list of FAQs. */
export function useFaqsQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.FAQS, params.page],
    queryFn: () => adminApi.listFaqs(params),
  })
}

/** Creates or updates an FAQ depending on whether `editingId` is provided. */
export function useSaveFaqMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ editingId, form }: { editingId: string | null; form: FaqFormData }) =>
      editingId ? adminApi.updateFaq(editingId, form) : adminApi.createFaq(form),
    onSuccess: (_, { editingId }) => {
      toast.success(editingId ? 'FAQ updated' : 'FAQ created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAQS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Deletes an FAQ. */
export function useDeleteFaqMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteFaq(id),
    onSuccess: () => {
      toast.success('FAQ deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAQS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
