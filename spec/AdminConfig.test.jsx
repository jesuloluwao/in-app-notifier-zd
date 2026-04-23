import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ThemeProvider } from '@zendeskgarden/react-theming'
import { AdminConfig } from '../src/app/components/AdminConfig'
import { ClientContext } from '../src/app/contexts/ClientProvider'
import { customObjectStorage } from '../src/app/utils/customObjectStorage'
import { settingsStorage } from '../src/app/utils/settingsStorage'
import { setupService } from '../src/app/utils/setupService'

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })

vi.mock('../src/app/utils/customObjectStorage', () => ({
  customObjectStorage: {
    loadAllRules: vi.fn(),
    saveRule: vi.fn(),
    deleteRule: vi.fn()
  }
}))

vi.mock('../src/app/utils/settingsStorage', () => ({
  settingsStorage: {
    loadSettings: vi.fn(),
    saveSettings: vi.fn()
  },
  DEFAULT_SETTINGS: { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } }
}))

vi.mock('../src/app/utils/accessControl', () => ({
  clearAccessCache: vi.fn()
}))

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

const makeClient = () => ({
  invoke: vi.fn(),
  request: vi.fn((opts) => {
    if (opts.url === '/api/v2/custom_roles') return Promise.resolve({ custom_roles: [] })
    if (opts.url && opts.url.startsWith('/api/v2/users/')) return Promise.resolve({ user: null })
    return Promise.reject(httpError(404))
  })
})

const wrap = (client) => render(
  <ThemeProvider>
    <ClientContext.Provider value={client}>
      <AdminConfig />
    </ClientContext.Provider>
  </ThemeProvider>
)

describe('AdminConfig', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    setupService.probeSchema.mockResolvedValue({
      resources: {
        rules_object: { status: 'exists' },
        rules_field: { status: 'exists' },
        settings_object: { status: 'exists' },
        settings_field: { status: 'exists' },
        settings_seed: { status: 'exists' }
      },
      writePermission: { status: 'ok' },
      allPresent: true
    })
  })

  it('renders the Rules tab by default with an empty rule list', async () => {
    customObjectStorage.loadAllRules.mockResolvedValue({ success: true, rules: [] })
    wrap(makeClient())
    await waitFor(() => expect(screen.getByRole('button', { name: /add new rule/i })).toBeDefined())
    expect(screen.getByText(/no rules configured/i)).toBeDefined()
  })

  it('switches to the Access tab and renders AccessSettings', async () => {
    customObjectStorage.loadAllRules.mockResolvedValue({ success: true, rules: [] })
    wrap(makeClient())
    await waitFor(() => expect(screen.getByRole('button', { name: /add new rule/i })).toBeDefined())

    fireEvent.click(screen.getByRole('tab', { name: /access/i }))

    await waitFor(() =>
      expect(screen.getByText(/zendesk role permission required/i)).toBeDefined()
    )
  })

  it('switches to the Setup tab and renders SetupWizard in healthcheck mode', async () => {
    customObjectStorage.loadAllRules.mockResolvedValue({ success: true, rules: [] })
    wrap(makeClient())
    await waitFor(() => expect(screen.getByRole('button', { name: /add new rule/i })).toBeDefined())

    fireEvent.click(screen.getByRole('tab', { name: /setup/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /re-check/i })).toBeDefined()
    )
    expect(screen.queryByRole('button', { name: /create required resources/i })).toBeNull()
  })

  it('shows a permission alert when loadAllRules returns forbidden', async () => {
    customObjectStorage.loadAllRules.mockResolvedValue({
      success: false,
      code: 'forbidden',
      error: 'Your Zendesk role does not have permission to edit custom object records.'
    })
    wrap(makeClient())
    const title = await screen.findByText(/permission required/i)
    const alert = title.closest('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toMatch(/edit custom object records/i)
  })

  it('does not call customObjectStorage.initialize', async () => {
    customObjectStorage.loadAllRules.mockResolvedValue({ success: true, rules: [] })
    wrap(makeClient())
    await waitFor(() => expect(customObjectStorage.loadAllRules).toHaveBeenCalled())
    expect(customObjectStorage.initialize).toBeUndefined()
  })

  it('does not flash the spinner on reload after delete', async () => {
    const rule = {
      id: '1',
      name: 'Test Rule',
      conditions: [],
      enabled: true,
      priority: 0,
      triggerType: 'ticket_opened'
    }
    let resolveSecond
    const secondPromise = new Promise((resolve) => { resolveSecond = resolve })
    customObjectStorage.loadAllRules
      .mockResolvedValueOnce({ success: true, rules: [rule] })
      .mockReturnValueOnce(secondPromise)
    customObjectStorage.deleteRule.mockResolvedValue({ success: true })

    wrap(makeClient())

    await waitFor(() => expect(screen.getByText('Test Rule')).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(customObjectStorage.deleteRule).toHaveBeenCalledWith(
      expect.anything(),
      '1'
    ))
    await waitFor(() => expect(customObjectStorage.loadAllRules).toHaveBeenCalledTimes(2))

    // Reload is in flight with showSpinner=false — RuleList must stay mounted
    // (no spinner flash). With the bug, loading=true would unmount the list.
    expect(screen.getByRole('button', { name: /add new rule/i })).toBeDefined()
    expect(screen.getByText('Test Rule')).toBeDefined()

    resolveSecond({ success: true, rules: [] })
    await waitFor(() => expect(screen.getByText(/no rules configured/i)).toBeDefined())
  })
})
