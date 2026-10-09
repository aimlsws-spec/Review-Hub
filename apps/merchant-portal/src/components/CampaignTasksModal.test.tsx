import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignTaskMutations, useCampaignTasksQuery } from '@/hooks/useCampaignTasks'
import type { Campaign, CampaignTask } from '@/types'

import { CampaignTasksModal, toTaskInput } from './CampaignTasksModal'

vi.mock('@/hooks/useCampaignTasks', () => ({ useCampaignTasksQuery: vi.fn(), useCampaignTaskMutations: vi.fn() }))

const campaign = { id: 'campaign-1', title: 'Mango Cafe Feedback', status: 'DRAFT' } as Campaign

const task: CampaignTask = {
  id: 'task-1',
  campaignId: 'campaign-1',
  title: 'Upload your bill',
  description: null,
  instructions: 'Take a photo of your bill',
  taskType: 'SCREENSHOT',
  verificationType: 'MANUAL',
  taskOrder: 0,
  required: true,
  proofType: 'SCREENSHOT',
  completionLimit: 'ONCE',
  configuration: null,
}

const saveMutate = vi.fn()
const deleteMutate = vi.fn()

function withTasks(tasks: CampaignTask[]) {
  vi.mocked(useCampaignTasksQuery).mockReturnValue({
    data: { data: { data: { ...campaign, tasks } } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never)
}

describe('CampaignTasksModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withTasks([task])
    vi.mocked(useCampaignTaskMutations).mockReturnValue({
      saveMutation: { mutate: saveMutate, isPending: false },
      deleteMutation: { mutate: deleteMutate, isPending: false },
    } as never)
  })

  it('lists the tasks in order with what each asks for', () => {
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/1\. Upload your bill/)).toBeInTheDocument()
    expect(dialog.getByText(/Upload a screenshot · Screenshot · I review each one · Once per person/)).toBeInTheDocument()
  })

  it('says a campaign needs a task before it can be submitted, when it has none', () => {
    withTasks([])
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    expect(screen.getByText(/can not be submitted without one/i)).toBeInTheDocument()
  })

  it('adds a task after the last one', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add task/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/task title/i), '  Share your honest feedback ')
    await user.selectOptions(dialog.getByLabelText(/what the participant does/i), 'URL')
    await user.selectOptions(dialog.getByLabelText(/proof to upload/i), 'URL')
    await user.click(dialog.getByRole('button', { name: /^add task$/i }))

    expect(saveMutate).toHaveBeenCalledWith({
      input: expect.objectContaining({
        title: 'Share your honest feedback',
        taskType: 'URL',
        proofType: 'URL',
        verificationType: 'MANUAL',
        completionLimit: 'ONCE',
        required: true,
        taskOrder: 1,
      }),
    })
  })

  it('needs the code for a QR task, and asks for no proof or reviewer', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add task/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/task title/i), 'Scan the code at the counter')
    await user.selectOptions(dialog.getByLabelText(/what the participant does/i), 'QR_SCAN')
    expect(dialog.queryByLabelText(/proof to upload/i)).not.toBeInTheDocument()
    expect(dialog.queryByLabelText(/who checks it/i)).not.toBeInTheDocument()

    await user.click(dialog.getByRole('button', { name: /^add task$/i }))
    expect(await dialog.findByText(/enter the qr code value/i)).toBeInTheDocument()
    expect(saveMutate).not.toHaveBeenCalled()

    await user.type(dialog.getByLabelText(/qr code value/i), 'PRERNA-COUNTER-1')
    await user.click(dialog.getByRole('button', { name: /^add task$/i }))
    expect(saveMutate).toHaveBeenCalledWith({
      input: expect.objectContaining({ taskType: 'QR_SCAN', verificationType: 'SYSTEM', configuration: { qrCode: 'PRERNA-COUNTER-1' } }),
    })
    expect(saveMutate.mock.calls[0][0].input).not.toHaveProperty('proofType')
  })

  it('needs a link to Instagram for an Instagram task, refusing a link to another site', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add task/i }))
    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText(/task title/i), 'Follow Prerna Cafe')
    await user.selectOptions(dialog.getByLabelText(/what the participant does/i), 'INSTAGRAM_FOLLOW')

    await user.click(dialog.getByRole('button', { name: /^add task$/i }))
    expect(await dialog.findByText('Add the link to Instagram')).toBeInTheDocument()

    await user.type(dialog.getByLabelText(/link to instagram/i), 'https://instagram-login.example.com/prerna')
    await user.click(dialog.getByRole('button', { name: /^add task$/i }))
    expect(await dialog.findByText('This must be a link to Instagram')).toBeInTheDocument()
    expect(saveMutate).not.toHaveBeenCalled()

    await user.clear(dialog.getByLabelText(/link to instagram/i))
    await user.type(dialog.getByLabelText(/link to instagram/i), ' https://www.instagram.com/prernatestcafe/ ')
    await user.click(dialog.getByRole('button', { name: /^add task$/i }))
    expect(saveMutate).toHaveBeenCalledWith({
      input: expect.objectContaining({
        taskType: 'INSTAGRAM_FOLLOW',
        configuration: { targetUrl: 'https://www.instagram.com/prernatestcafe/' },
      }),
    })
  })

  it('shows each task\'s link, and warns about an online task that has none', () => {
    withTasks([
      { ...task, configuration: { targetUrl: 'https://prernacafe.in/menu' } },
      { ...task, id: 'task-2', title: 'Review us', taskType: 'GOOGLE_REVIEW', taskOrder: 1 },
    ])
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'https://prernacafe.in/menu' })).toBeInTheDocument()
    expect(screen.getByText(/no link to google yet/i)).toBeInTheDocument()
  })

  it('edits a task without sending its type, which can not change', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText(/what the participant does/i)).toBeDisabled()
    await user.clear(dialog.getByLabelText(/task title/i))
    await user.type(dialog.getByLabelText(/task title/i), 'Upload a photo of your bill')
    await user.click(dialog.getByRole('button', { name: /save task/i }))

    expect(saveMutate).toHaveBeenCalledWith({ taskId: 'task-1', input: expect.objectContaining({ title: 'Upload a photo of your bill' }) })
    expect(saveMutate.mock.calls[0][0].input).not.toHaveProperty('taskType')
  })

  it('offers no task whose feature is not built yet', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add task/i }))
    const select = within(screen.getByRole('dialog')).getByLabelText(/what the participant does/i)
    const offered = within(select).getAllByRole('option').map((option) => option.getAttribute('value'))

    expect(offered).toEqual(expect.arrayContaining(['GOOGLE_REVIEW', 'INSTAGRAM_FOLLOW', 'INSTAGRAM_STORY_SHARE', 'QR_SCAN']))
    for (const off of ['WATCH_VIDEO', 'WEBSITE_VISIT', 'APP_INSTALL', 'SURVEY', 'REFERRAL', 'CUSTOM', 'FILE_UPLOAD', 'TEXT']) {
      expect(offered).not.toContain(off)
    }
  })

  it('asks for proof that shows the task was done, never a written answer', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add task/i }))
    const select = within(screen.getByRole('dialog')).getByLabelText(/proof to upload/i)

    expect(within(select).getAllByRole('option').map((option) => option.getAttribute('value'))).toEqual(['SCREENSHOT', 'VIDEO', 'URL'])
  })

  it('says what each checking choice means, and offers none that pays without the merchant', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /add task/i }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/nothing is paid until you approve/i)).toBeInTheDocument()

    const choices = within(dialog.getByLabelText(/who checks it/i)).getAllByRole('option').map((option) => option.getAttribute('value'))
    expect(choices).toEqual(['MANUAL', 'HYBRID'])
    await user.selectOptions(dialog.getByLabelText(/who checks it/i), 'HYBRID')
    expect(dialog.getByText(/you still approve or reject every submission/i)).toBeInTheDocument()
  })

  it('edits an older "AI pays automatically" task as "AI checks, then I confirm"', async () => {
    const user = userEvent.setup()
    withTasks([{ ...task, verificationType: 'AI' }])
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    expect(screen.getByText(/AI checks, then I confirm/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(within(screen.getByRole('dialog')).getByLabelText(/who checks it/i)).toHaveValue('HYBRID')
  })

  it('still shows what an older task of a switched-off kind is', async () => {
    withTasks([{ ...task, taskType: 'APP_INSTALL', title: 'Install our app' }])
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^edit$/i }))

    expect(within(screen.getByRole('dialog')).getByLabelText(/what the participant does/i)).toHaveValue('APP_INSTALL')
  })

  it('removes a task after confirming', async () => {
    const user = userEvent.setup()
    render(<CampaignTasksModal campaign={campaign} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^remove$/i }))
    const dialogs = screen.getAllByRole('dialog')
    await user.click(within(dialogs[dialogs.length - 1]).getByRole('button', { name: /^remove$/i }))

    expect(deleteMutate).toHaveBeenCalledWith('task-1', expect.anything())
  })

  it('only shows the tasks of a campaign that is no longer a draft', () => {
    render(<CampaignTasksModal campaign={{ ...campaign, status: 'ACTIVE' }} onClose={vi.fn()} />)

    expect(screen.getByText(/can only be changed while the campaign is a draft/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add task/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })
})

describe('toTaskInput', () => {
  const base = {
    title: 'Check in',
    taskType: 'LOCATION_CHECKIN' as const,
    description: '',
    instructions: '',
    proofType: 'SCREENSHOT' as const,
    verificationType: 'MANUAL' as const,
    completionLimit: 'ONCE' as const,
    required: true,
    targetUrl: '',
    qrCode: '',
    latitude: '23.0225',
    longitude: '72.5714',
    radiusMeters: '',
  }

  it('sends a location task as a point with the default radius, checked by the system', () => {
    expect(toTaskInput(base)).toMatchObject({
      verificationType: 'SYSTEM',
      configuration: { latitude: 23.0225, longitude: 72.5714, radiusMeters: 200 },
    })
    expect(toTaskInput(base)).not.toHaveProperty('proofType')
  })
})
