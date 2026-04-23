import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ThemeProvider } from '@zendeskgarden/react-theming'
import { SetupWizard } from '../src/app/components/SetupWizard'
import { setupService } from '../src/app/utils/setupService'

vi.mock('../src/app/utils/setupService', () => ({
  setupService: {
    probeSchema: vi.fn(),
    applySchema: vi.fn()
  },
  REQUIRED_RESOURCES: [
    { id: 'rules_object', kind: 'object', title: 'Custom object: rules', description: '' },
    { id: 'rules_field', kind: 'field', title: 'Field: rules', description: '' },
    { id: 'settings_object', kind: 'object', title: 'Custom object: settings', description: '' },
    { id: 'settings_field', kind: 'field', title: 'Field: settings', description: '' },
    { id: 'settings_seed', kind: 'record', title: 'Seed record', description: '' }
  ]
}))

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>)

describe('SetupWizard', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows each required resource with its probed status', async () => {
    setupService.probeSchema.mockResolvedValue({
      resources: {
        rules_object: { status: 'exists' },
        rules_field: { status: 'missing' },
        settings_object: { status: 'missing' },
        settings_field: { status: 'missing' },
        settings_seed: { status: 'missing' }
      },
      writePermission: { status: 'skipped' },
      allPresent: false
    })
    wrap(<SetupWizard client={{}} onComplete={() => {}} />)
    await waitFor(() => expect(screen.getByText('Custom object: rules')).toBeDefined())
    expect(screen.getByText('Field: rules')).toBeDefined()
    expect(screen.getByRole('button', { name: /create required resources/i })).toBeDefined()
  })

  it('runs applySchema when the action button is clicked and invokes onComplete on success', async () => {
    setupService.probeSchema
      .mockResolvedValueOnce({
        resources: {
          rules_object: { status: 'missing' }, rules_field: { status: 'missing' },
          settings_object: { status: 'missing' }, settings_field: { status: 'missing' },
          settings_seed: { status: 'missing' }
        },
        writePermission: { status: 'skipped' },
        allPresent: false
      })
      .mockResolvedValueOnce({
        resources: {
          rules_object: { status: 'exists' }, rules_field: { status: 'exists' },
          settings_object: { status: 'exists' }, settings_field: { status: 'exists' },
          settings_seed: { status: 'exists' }
        },
        writePermission: { status: 'ok' },
        allPresent: true
      })
    setupService.applySchema.mockResolvedValue({ success: true, created: ['rules_object'] })

    const onComplete = vi.fn()
    wrap(<SetupWizard client={{}} onComplete={onComplete} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /create required resources/i })).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: /create required resources/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(setupService.applySchema).toHaveBeenCalledTimes(1)
  })

  it('surfaces a permission error when applySchema returns forbidden', async () => {
    setupService.probeSchema.mockResolvedValue({
      resources: {
        rules_object: { status: 'missing' }, rules_field: { status: 'missing' },
        settings_object: { status: 'missing' }, settings_field: { status: 'missing' },
        settings_seed: { status: 'missing' }
      },
      writePermission: { status: 'skipped' },
      allPresent: false
    })
    setupService.applySchema.mockResolvedValue({ success: false, code: 'forbidden' })
    wrap(<SetupWizard client={{}} onComplete={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /create required resources/i })).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: /create required resources/i }))
    await waitFor(() => expect(screen.getByText(/insufficient permissions/i)).toBeDefined())
  })

  it('shows a Re-check button instead of Create when mode="healthcheck"', async () => {
    setupService.probeSchema.mockResolvedValue({
      resources: {
        rules_object: { status: 'exists' }, rules_field: { status: 'exists' },
        settings_object: { status: 'exists' }, settings_field: { status: 'exists' },
        settings_seed: { status: 'exists' }
      },
      writePermission: { status: 'ok' },
      allPresent: true
    })
    wrap(<SetupWizard client={{}} mode="healthcheck" onComplete={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /re-check/i })).toBeDefined())
    expect(screen.queryByRole('button', { name: /create required resources/i })).toBeNull()
  })
})
