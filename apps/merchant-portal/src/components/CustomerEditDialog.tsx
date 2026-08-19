import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Select, Modal } from '@reviewhub/shared-ui'
import type { Customer, CustomerStatus, CustomerType } from '@/types/customer'

export interface CustomerEditFormValues {
  name: string
  email: string
  phone: string
  status: CustomerStatus
  type: CustomerType
}

interface CustomerEditDialogProps {
  customer: Customer | null
  onClose: () => void
  onSave: (customerId: string, values: CustomerEditFormValues) => void
}

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

const TYPE_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Returning', label: 'Returning' },
  { value: 'VIP', label: 'VIP' },
]

export function CustomerEditDialog({ customer, onClose, onSave }: CustomerEditDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerEditFormValues>()

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
        type: customer.type,
      })
    }
  }, [customer, reset])

  return (
    <Modal
      open={customer !== null}
      onClose={onClose}
      title="Edit Customer"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit((values) => {
              if (customer) onSave(customer.id, values)
            })}
          >
            Save Changes
          </button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <Input
          label="Full Name"
          required
          error={errors.name?.message}
          {...register('name', { required: 'Name is required' })}
        />
        <Input
          label="Email"
          type="email"
          required
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />
        <Input
          label="Phone"
          required
          error={errors.phone?.message}
          {...register('phone', {
            required: 'Phone is required',
            pattern: { value: /^\+?[\d\s-]{7,15}$/, message: 'Enter a valid phone number' },
          })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            required
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status', { required: 'Status is required' })}
          />
          <Select
            label="Customer Type"
            required
            options={TYPE_OPTIONS}
            error={errors.type?.message}
            {...register('type', { required: 'Customer type is required' })}
          />
        </div>
      </form>
    </Modal>
  )
}
