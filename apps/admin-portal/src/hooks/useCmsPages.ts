import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'
import type { CMSPageStatus } from '@/types'

export interface CmsPageFormData {
  title: string
  slug: string
  content: string
  metaTitle: string
  metaDescription: string
  status: CMSPageStatus
}

/** Fetches the paginated list of CMS pages. */
export function useCmsPagesQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CMS_PAGES, params.page],
    queryFn: () => adminApi.listCmsPages(params),
  })
}

/** Creates or updates a CMS page depending on whether `editingId` is provided. */
export function useSaveCmsPageMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ editingId, form }: { editingId: string | null; form: CmsPageFormData }) =>
      editingId ? adminApi.updateCmsPage(editingId, form) : adminApi.createCmsPage(form),
    onSuccess: (_, { editingId }) => {
      toast.success(editingId ? 'Page updated' : 'Page created')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CMS_PAGES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Deletes a CMS page. */
export function useDeleteCmsPageMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCmsPage(id),
    onSuccess: () => {
      toast.success('Page deleted')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CMS_PAGES })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
