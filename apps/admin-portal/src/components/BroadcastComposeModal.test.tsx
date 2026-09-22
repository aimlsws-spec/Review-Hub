import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAudienceLocationsQuery,
  useAudiencePreviewQuery,
  useCreateBroadcastMutation,
  useNotificationTemplatesQuery,
} from '@/hooks/useNotificationCenter'
import type { AudienceReach } from '@/types'

import { BroadcastComposeModal } from './BroadcastComposeModal'

vi.mock('@/hooks/useNotificationCenter', () => ({
  useAudienceLocationsQuery: vi.fn(),
  useAudiencePreviewQuery: vi.fn(),
  useCreateBroadcastMutation: vi.fn(),
  useNotificationTemplatesQuery: vi.fn(),
}))
// No waiting: the audience check should follow the form immediately in these tests.
vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }))

const templates = [
  { id: 't1', name: 'Happy hour', title: 'Happy hour!', body: 'Hi {{firstName}}, tasks are live.', channel: 'PUSH', isActive: true },
  { id: 't2', name: 'Retired template', title: 'Old', body: 'Old', channel: 'IN_APP', isActive: false },
]
const locations = [{ id: 's1', name: 'Gujarat', cities: [{ id: 'c1', name: 'Ahmedabad' }] }]
const reach: AudienceReach = { total: 120, byChannel: { IN_APP: 118, PUSH: 90, EMAIL: 100 } }

const sendMock = vi.fn()
const onClose = vi.fn()

const previewResult = (data: AudienceReach | undefined, extra: Record<string, unknown> = {}) =>
  vi.mocked(useAudiencePreviewQuery).mockReturnValue({ data: data && { data: { data } }, isFetching: false, isError: false, ...extra } as never)

const renderModal = (props: Partial<Parameters<typeof BroadcastComposeModal>[0]> = {}) =>
  render(<BroadcastComposeModal onClose={onClose} {...props} />)

async function fillMessage(user: ReturnType<typeof userEvent.setup>, title = 'Happy hour!', message = 'Hi {{firstName}}, tasks are live.') {
  // userEvent treats "{" as a key command, so braces are doubled to type them literally.
  await user.type(screen.getByLabelText('Title'), title.replace(/[{[]/g, '$&$&'))
  await user.type(screen.getByLabelText('Message'), message.replace(/[{[]/g, '$&$&'))
}

const reviewButton = () => screen.getByRole('button', { name: 'Review and send' })

describe('BroadcastComposeModal', () => {
  beforeEach(() => {
    vi.mocked(useNotificationTemplatesQuery).mockReturnValue({ data: { data: { data: templates } } } as never)
    vi.mocked(useAudienceLocationsQuery).mockReturnValue({ data: { data: { data: locations } } } as never)
    vi.mocked(useCreateBroadcastMutation).mockReturnValue({ mutate: sendMock, isPending: false } as never)
    previewResult(reach)
    sendMock.mockReset()
    onClose.mockReset()
  })

  describe('before anything is written', () => {
    it('cannot be sent, and says what is missing', () => {
      renderModal()

      expect(reviewButton()).toBeDisabled()
      expect(screen.getByText('Add a title')).toBeInTheDocument()
      expect(screen.getByText('Add a message')).toBeInTheDocument()
    })

    it('starts on in-app and push, with everyone as the audience', () => {
      renderModal()

      expect(screen.getByLabelText(/In-app/)).toBeChecked()
      expect(screen.getByLabelText(/Push/)).toBeChecked()
      expect(screen.getByLabelText(/Email/)).not.toBeChecked()
      expect(screen.getByLabelText('State')).toHaveValue('')
    })
  })

  describe('the audience', () => {
    it('shows how many users match, and what each channel would reach', () => {
      renderModal()

      expect(screen.getByRole('status')).toHaveTextContent('120 users match')
      expect(screen.getByLabelText(/In-app/)).toHaveAccessibleName(/reaches 118/)
      expect(screen.getByLabelText(/Push/)).toHaveAccessibleName(/reaches 90/)
      expect(screen.getByLabelText(/Email/)).toHaveAccessibleName(/reaches 100/)
    })

    it('says "1 user matches" in the singular', () => {
      previewResult({ total: 1, byChannel: { IN_APP: 1, PUSH: 1, EMAIL: 1 } })
      renderModal()

      expect(screen.getByRole('status')).toHaveTextContent('1 user matches')
    })

    it('asks the server about the filters as they are chosen', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.selectOptions(screen.getByLabelText('State'), 'Gujarat')
      await user.selectOptions(screen.getByLabelText('City'), 'Ahmedabad')
      await user.selectOptions(screen.getByLabelText('Gender'), 'Female')

      expect(useAudiencePreviewQuery).toHaveBeenLastCalledWith({ stateIds: ['s1'], cityIds: ['c1'], gender: 'FEMALE' }, true)
    })

    it('shows a waiting message before the first answer arrives', () => {
      previewResult(undefined)
      renderModal()

      expect(screen.getByRole('status')).toHaveTextContent('Checking who this reaches')
    })

    it('shows the last known number, dimmed, while a new answer loads, and will not allow sending on it', async () => {
      const user = userEvent.setup()
      previewResult(reach, { isFetching: true })
      renderModal()
      await fillMessage(user)

      expect(screen.getByRole('status')).toHaveTextContent('120 users match (updating…)')
      expect(reviewButton()).toBeDisabled()
    })

    it('says when the check itself fails', () => {
      previewResult(undefined, { isError: true })
      renderModal()

      expect(screen.getByRole('status')).toHaveTextContent('Could not check the audience')
    })

    it('blocks contradictory filters, and does not ask the server about them', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.type(screen.getByLabelText('Minimum age'), '40')
      await user.type(screen.getByLabelText('Maximum age'), '20')

      expect(screen.getByRole('status')).toHaveTextContent('Minimum age cannot be above maximum age')
      expect(useAudiencePreviewQuery).toHaveBeenLastCalledWith({ minAge: 40, maxAge: 20 }, false)
    })

    it('blocks sending to nobody', async () => {
      const user = userEvent.setup()
      previewResult({ total: 0, byChannel: { IN_APP: 0, PUSH: 0, EMAIL: 0 } })
      renderModal()
      await fillMessage(user)

      expect(screen.getByRole('alert')).toHaveTextContent('No users match these filters')
      expect(reviewButton()).toBeDisabled()
    })

    it('blocks a channel choice that reaches no one, e.g. push when nobody has a device', async () => {
      const user = userEvent.setup()
      previewResult({ total: 50, byChannel: { IN_APP: 50, PUSH: 0, EMAIL: 40 } })
      renderModal()
      await fillMessage(user)

      await user.click(screen.getByLabelText(/In-app/)) // leaves push only

      expect(screen.getByRole('alert')).toHaveTextContent('None of the selected channels can reach anyone')
      expect(reviewButton()).toBeDisabled()
    })
  })

  describe('the message', () => {
    it('previews the message for a sample user', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)

      expect(screen.getByLabelText('Message preview')).toHaveTextContent('Hi Priya, tasks are live.')
    })

    it('refuses a placeholder that would reach users as literal text', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user, 'Bonus', 'You earned {{amount}}')

      expect(screen.getByRole('alert')).toHaveTextContent('{{amount}}')
      expect(reviewButton()).toBeDisabled()
    })

    it('requires at least one channel', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)

      await user.click(screen.getByLabelText(/In-app/))
      await user.click(screen.getByLabelText(/Push/))

      expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one channel')
      expect(reviewButton()).toBeDisabled()
    })

    it('counts characters against the limits', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Title'), 'Hello')

      expect(screen.getByText('5/100')).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveAttribute('maxLength', '100')
      expect(screen.getByLabelText('Message')).toHaveAttribute('maxLength', '500')
    })
  })

  describe('templates', () => {
    it('offers only active templates', () => {
      renderModal()

      expect(screen.getByRole('option', { name: 'Happy hour' })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'Retired template' })).not.toBeInTheDocument()
    })

    it('fills in the title, message and channel from the chosen template', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.selectOptions(screen.getByLabelText('Start from a template'), 'Happy hour')

      expect(screen.getByLabelText('Title')).toHaveValue('Happy hour!')
      expect(screen.getByLabelText('Message')).toHaveValue('Hi {{firstName}}, tasks are live.')
      expect(screen.getByLabelText(/Push/)).toBeChecked()
      expect(screen.getByLabelText(/In-app/)).not.toBeChecked()
      expect(reviewButton()).toBeEnabled()
    })

    it('opens already filled in when started from a template', () => {
      renderModal({ template: templates[0] as never })

      expect(screen.getByLabelText('Title')).toHaveValue('Happy hour!')
      expect(screen.getByLabelText('Start from a template')).toHaveValue('t1')
    })
  })

  describe('scheduling', () => {
    it('hides the time picker until scheduling is chosen', async () => {
      const user = userEvent.setup()
      renderModal()

      expect(screen.queryByLabelText('Send at')).not.toBeInTheDocument()
      await user.click(screen.getByLabelText('Schedule for later'))
      expect(screen.getByLabelText('Send at')).toBeInTheDocument()
    })

    it('needs a time once scheduling is chosen', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Schedule for later'))

      expect(screen.getByRole('alert')).toHaveTextContent('Pick a date and time to send')
      expect(reviewButton()).toBeDisabled()
    })

    it('refuses a time under a minute away', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Schedule for later'))

      fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2000-01-01T10:00' } })

      expect(screen.getByRole('alert')).toHaveTextContent('Schedule at least one minute ahead')
      expect(reviewButton()).toBeDisabled()
    })

    it('does not let the picker offer a time in the past', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByLabelText('Schedule for later'))

      const min = screen.getByLabelText('Send at').getAttribute('min') as string
      expect(new Date(min).getTime()).toBeGreaterThan(Date.now())
    })

    it('sends the chosen time as an exact UTC instant', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Schedule for later'))
      fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2099-06-15T14:30' } })

      await user.click(reviewButton())
      await user.click(screen.getByRole('button', { name: 'Confirm and schedule' }))

      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ scheduledAt: new Date('2099-06-15T14:30').toISOString() }))
    })
  })

  describe('smart timing', () => {
    const smartTimingBox = () => screen.getByLabelText("Send at each person's best time")

    it('is off by default and explains what it does', () => {
      renderModal()

      expect(smartTimingBox()).not.toBeChecked()
      expect(screen.getByText(/at the hour they are usually active/i)).toBeInTheDocument()
      expect(screen.getByText(/never sent between 10 PM and 9 AM/i)).toBeInTheDocument()
    })

    it('is not sent unless it is ticked', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)

      await user.click(reviewButton())
      await user.click(screen.getByRole('button', { name: 'Confirm and send now' }))

      expect(sendMock.mock.calls[0][0]).not.toHaveProperty('smartTiming')
    })

    it('is sent when ticked, and shown on the confirmation step', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(smartTimingBox())

      await user.click(reviewButton())
      expect(screen.getByText(/each person at the hour they are usually active/i)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Confirm and send now' }))

      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ smartTiming: true }))
    })

    it('works together with a scheduled time', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Schedule for later'))
      fireEvent.change(screen.getByLabelText('Send at'), { target: { value: '2099-06-15T14:30' } })
      await user.click(smartTimingBox())

      await user.click(reviewButton())
      await user.click(screen.getByRole('button', { name: 'Confirm and schedule' }))

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ smartTiming: true, scheduledAt: new Date('2099-06-15T14:30').toISOString() }),
      )
    })

    it('is switched off for a system announcement, which must go straight away, even if it was ticked before', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(smartTimingBox())

      await user.selectOptions(screen.getByLabelText('Type'), 'SYSTEM')

      expect(smartTimingBox()).toBeDisabled()
      expect(smartTimingBox()).not.toBeChecked()
      expect(screen.getByText(/system announcements are always sent straight away/i)).toBeInTheDocument()

      await user.click(reviewButton())
      await user.click(screen.getByRole('button', { name: 'Confirm and send now' }))
      expect(sendMock.mock.calls[0][0]).not.toHaveProperty('smartTiming')
    })

    it('comes back when the type is changed away from system', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.selectOptions(screen.getByLabelText('Type'), 'SYSTEM')
      await user.selectOptions(screen.getByLabelText('Type'), 'PROMOTIONAL')

      expect(smartTimingBox()).toBeEnabled()
    })
  })

  describe('confirming and sending', () => {
    it('shows exactly what is about to happen before anything is sent', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.selectOptions(screen.getByLabelText('State'), 'Gujarat')
      await fillMessage(user)

      await user.click(reviewButton())

      expect(screen.getByRole('heading', { name: 'Confirm broadcast' })).toBeInTheDocument()
      expect(screen.getByText('Hi Priya, tasks are live.')).toBeInTheDocument()
      expect(screen.getByText('Gujarat')).toBeInTheDocument()
      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.getByText('In-app, Push')).toBeInTheDocument()
      expect(screen.getByText('Immediately')).toBeInTheDocument()
      expect(screen.getByText(/cannot be recalled/i)).toBeInTheDocument()
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('lets the admin go back and change something', async () => {
      const user = userEvent.setup()
      renderModal()
      await fillMessage(user)
      await user.click(reviewButton())

      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(screen.getByRole('heading', { name: 'New broadcast' })).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveValue('Happy hour!')
    })

    it('sends only after the explicit confirmation, with a trimmed message and no schedule for "now"', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.selectOptions(screen.getByLabelText('Type'), 'Campaign')
      await user.click(screen.getByLabelText(/Email/))
      await fillMessage(user, '  Happy hour!  ', '  Tasks are live.  ')

      await user.click(reviewButton())
      await user.click(screen.getByRole('button', { name: 'Confirm and send now' }))

      expect(sendMock).toHaveBeenCalledTimes(1)
      expect(sendMock).toHaveBeenCalledWith({
        title: 'Happy hour!',
        message: 'Tasks are live.',
        type: 'CAMPAIGN',
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        audience: {},
      })
    })

    it('sends the chosen audience filters', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.selectOptions(screen.getByLabelText('State'), 'Gujarat')
      await user.type(screen.getByLabelText('Minimum age'), '18')
      await user.selectOptions(screen.getByLabelText('KYC'), 'KYC verified')
      await fillMessage(user)

      await user.click(reviewButton())
      await user.click(screen.getByRole('button', { name: 'Confirm and send now' }))

      expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ audience: { stateIds: ['s1'], minAge: 18, kycVerified: true } }))
    })

    it('cannot be sent twice while a send is in progress', async () => {
      const user = userEvent.setup()
      vi.mocked(useCreateBroadcastMutation).mockReturnValue({ mutate: sendMock, isPending: true } as never)
      renderModal()
      await fillMessage(user)
      await user.click(reviewButton())

      expect(screen.getByRole('button', { name: 'Confirm and send now' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    })

    it('closes without sending when cancelled', async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onClose).toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    })
  })
})
