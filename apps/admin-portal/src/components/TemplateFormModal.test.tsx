import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateTemplateMutation, useUpdateTemplateMutation } from '@/hooks/useNotificationCenter'

import { TemplateFormModal } from './TemplateFormModal'

vi.mock('@/hooks/useNotificationCenter', () => ({
  useCreateTemplateMutation: vi.fn(),
  useUpdateTemplateMutation: vi.fn(),
}))

const existing = {
  id: 't1',
  name: 'Happy hour',
  slug: 'happy-hour',
  subject: 'Happy hour is on!',
  title: 'Happy hour!',
  body: 'Hi {{firstName}}, tasks are live.',
  channel: 'PUSH',
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
}

const createMock = vi.fn()
const updateMock = vi.fn()
const onClose = vi.fn()

// userEvent treats "{" as a key command, so braces are doubled to type them literally.
const literal = (text: string) => text.replace(/[{[]/g, '$&$&')

describe('TemplateFormModal', () => {
  beforeEach(() => {
    vi.mocked(useCreateTemplateMutation).mockReturnValue({ mutate: createMock, isPending: false } as never)
    vi.mocked(useUpdateTemplateMutation).mockReturnValue({ mutate: updateMock, isPending: false } as never)
    createMock.mockReset()
    updateMock.mockReset()
    onClose.mockReset()
  })

  describe('creating', () => {
    it('cannot be saved until it has a name, title and message', async () => {
      const user = userEvent.setup()
      render(<TemplateFormModal onClose={onClose} />)

      const save = screen.getByRole('button', { name: 'Create template' })
      expect(save).toBeDisabled()

      await user.type(screen.getByLabelText('Name'), 'Weekend')
      await user.type(screen.getByLabelText('Title'), 'Weekend!')
      expect(save).toBeDisabled()

      await user.type(screen.getByLabelText('Message'), 'The weekend is here.')
      expect(save).toBeEnabled()
    })

    it('saves trimmed text with in-app as the default channel, active, and no empty subject', async () => {
      const user = userEvent.setup()
      render(<TemplateFormModal onClose={onClose} />)

      await user.type(screen.getByLabelText('Name'), '  Weekend  ')
      await user.type(screen.getByLabelText('Title'), '  Weekend!  ')
      await user.type(screen.getByLabelText('Message'), '  The weekend is here.  ')
      await user.click(screen.getByRole('button', { name: 'Create template' }))

      expect(createMock).toHaveBeenCalledWith({
        name: 'Weekend',
        title: 'Weekend!',
        body: 'The weekend is here.',
        subject: undefined,
        channel: 'IN_APP',
        isActive: true,
      })
      expect(updateMock).not.toHaveBeenCalled()
    })

    it('saves the channel, subject and availability the admin chose', async () => {
      const user = userEvent.setup()
      render(<TemplateFormModal onClose={onClose} />)

      await user.type(screen.getByLabelText('Name'), 'Promo')
      await user.type(screen.getByLabelText('Title'), 'Promo!')
      await user.type(screen.getByLabelText('Message'), 'Big news.')
      await user.type(screen.getByLabelText('Email subject'), 'Big news inside')
      await user.selectOptions(screen.getByLabelText('Usually sent by'), 'Email')
      await user.click(screen.getByLabelText('Available when creating a broadcast'))
      await user.click(screen.getByRole('button', { name: 'Create template' }))

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Big news inside', channel: 'EMAIL', isActive: false }),
      )
    })

    it('warns about a placeholder that cannot be filled in, and will not save it', async () => {
      const user = userEvent.setup()
      render(<TemplateFormModal onClose={onClose} />)

      await user.type(screen.getByLabelText('Name'), 'Bad')
      await user.type(screen.getByLabelText('Title'), 'Bad')
      await user.type(screen.getByLabelText('Message'), literal('You earned {{amount}}'))

      expect(screen.getByRole('alert')).toHaveTextContent('{{amount}}')
      expect(screen.getByRole('button', { name: 'Create template' })).toBeDisabled()
    })

    it('treats whitespace-only fields as empty', async () => {
      const user = userEvent.setup()
      render(<TemplateFormModal onClose={onClose} />)

      await user.type(screen.getByLabelText('Name'), '   ')
      await user.type(screen.getByLabelText('Title'), '   ')
      await user.type(screen.getByLabelText('Message'), '   ')

      expect(screen.getByRole('button', { name: 'Create template' })).toBeDisabled()
    })
  })

  describe('editing', () => {
    it('opens with the existing values', () => {
      render(<TemplateFormModal template={existing as never} onClose={onClose} />)

      expect(screen.getByRole('heading', { name: 'Edit template' })).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toHaveValue('Happy hour')
      expect(screen.getByLabelText('Title')).toHaveValue('Happy hour!')
      expect(screen.getByLabelText('Message')).toHaveValue('Hi {{firstName}}, tasks are live.')
      expect(screen.getByLabelText('Email subject')).toHaveValue('Happy hour is on!')
      expect(screen.getByLabelText('Usually sent by')).toHaveValue('PUSH')
      expect(screen.getByLabelText('Available when creating a broadcast')).toBeChecked()
    })

    it('saves changes to that template, not a new one', async () => {
      const user = userEvent.setup()
      render(<TemplateFormModal template={existing as never} onClose={onClose} />)

      await user.clear(screen.getByLabelText('Title'))
      await user.type(screen.getByLabelText('Title'), 'Happy hour, now!')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(updateMock).toHaveBeenCalledWith({
        templateId: 't1',
        payload: expect.objectContaining({ title: 'Happy hour, now!', name: 'Happy hour', channel: 'PUSH' }),
      })
      expect(createMock).not.toHaveBeenCalled()
    })

    it('falls back to in-app for a template written for a channel the form cannot send on (SMS)', () => {
      render(<TemplateFormModal template={{ ...existing, channel: 'SMS' } as never} onClose={onClose} />)

      expect(screen.getByLabelText('Usually sent by')).toHaveValue('IN_APP')
    })
  })

  it('cannot be saved twice while saving', () => {
    vi.mocked(useCreateTemplateMutation).mockReturnValue({ mutate: createMock, isPending: true } as never)
    render(<TemplateFormModal template={existing as never} onClose={onClose} />)

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('closes without saving when cancelled', async () => {
    const user = userEvent.setup()
    render(<TemplateFormModal onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })
})
