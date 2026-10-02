import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { downloadBlob, getApiErrorMessage, requireValue } from '@/utils'

/** How this merchant's campaigns are doing over the last `days` days. */
export function useAnalyticsOverviewQuery(merchantId: string | undefined, days: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ANALYTICS, merchantId, days],
    queryFn: async () => (await merchantApi.getAnalyticsOverview(requireValue(merchantId, 'merchantId'), days)).data.data,
    enabled: !!merchantId,
    // Rewards are paid in the background and the figures move slowly; refetching on every focus would only cost database work.
    staleTime: 60 * 1000,
  })
}

export type ReportFormat = 'csv' | 'xlsx' | 'pdf'

/** Downloads the campaign report for the period in the chosen format. The server names the file; this is a fallback. */
export function useDownloadCampaignReportMutation(merchantId: string | undefined) {
  return useMutation({
    mutationFn: async ({ days, format }: { days: number; format: ReportFormat }) => {
      const res = await merchantApi.downloadCampaignReport(requireValue(merchantId, 'merchantId'), days, format)
      const disposition = String(res.headers['content-disposition'] ?? '')
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `campaign-report-last-${days}-days.${format}`
      downloadBlob(res.data, filename)
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
