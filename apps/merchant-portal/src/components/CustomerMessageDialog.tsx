import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Textarea, Modal } from '@reviewhub/shared-ui'
import type { Customer } from '@/types/customer'

export interface CustomerMessageFormValues {
  subject: string
  message: string
}

interface CustomerMessageDialogProps {
  customer: Customer | null
  onClose: () => void
  onSend: (customer: Customer, values: CustomerMessageFormValues) => void
}

export function CustomerMessageDialog({ customer, onClose, onSend }: CustomerMessageDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerMessageFormValues>({ defaultValues: { subject: '', message: '' } })

  useEffect(() => {
    reset({ subject: '', message: '' })
  }, [customer, reset])

  return (
    <Modal
      open={customer !== null}
      onClose={onClose}
      title="Send Message"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit((values) => {
              if (customer) onSend(customer, values)
            })}
          >
            Send Message
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="form-group">
          <span className="label">Recipient</span>
          <p className="mt-1 text-sm text-gray-700">
            {customer?.name} &middot; {customer?.email} &middot; {customer?.phone}
          </p>
        </div>
        <Input label="Subject" placeholder="Optional subject" {...register('subject')} />
        <Textarea
          label="Message"
          required
          rows={4}
          placeholder="Write your message..."
          error={errors.message?.message}
          {...register('message', { required: 'Message is required' })}
        />
        <p className="text-xs text-gray-400">This is a local preview only &mdash; no email or SMS will be sent.</p>
      </form>
    </Modal>
  )
}
