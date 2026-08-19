import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { merchantApi } from '@/api/merchant.api'
import { QUERY_KEYS } from '@/constants'
import { getApiErrorMessage } from '@/utils'

export function useDocumentsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.DOCUMENTS,
    queryFn: () => merchantApi.getDocuments(merchantId!),
    enabled: !!merchantId,
  })
}

export function useBankAccountsQuery(merchantId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.BANK_ACCOUNTS,
    queryFn: () => merchantApi.getBankAccounts(merchantId!),
    enabled: !!merchantId,
  })
}

interface UploadDocumentInput {
  documentType: string
  documentNumber?: string
}

export function useUploadDocumentMutation(merchantId: string | undefined, selectedFile: File | null, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UploadDocumentInput) => {
      if (!selectedFile) throw new Error('Please select a file')
      return merchantApi.uploadDocument(merchantId!, { ...data, file: selectedFile })
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

interface BankAccountInput {
  bankName: string
  accountHolderName: string
  accountNumber: string
  ifscCode: string
  branch?: string
  upiId?: string
}

export function useAddBankAccountMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BankAccountInput) => merchantApi.addBankAccount(merchantId!, data),
    onSuccess: () => {
      toast.success('Bank account added')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useRemoveBankAccountMutation(merchantId: string | undefined, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => merchantApi.deleteBankAccount(merchantId!, id),
    onSuccess: () => {
      toast.success('Bank account removed')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS })
      onSuccess?.()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useSetPrimaryBankAccountMutation(merchantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => merchantApi.setPrimaryBankAccount(merchantId!, id),
    onSuccess: () => {
      toast.success('Primary account updated')
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
