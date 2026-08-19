import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin.api'
import { QUERY_KEYS } from '@/constants'

/** Fetches the paginated, entity-filterable audit log. */
export function useAuditLogsQuery(params: { page: number; limit: number; entity?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.AUDIT_LOGS, params.page, params.entity],
    queryFn: () => adminApi.listAuditLogs({ ...params, entity: params.entity || undefined }),
  })
}
