import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { ThemeProvider } from '@zendeskgarden/react-theming'
import { AccessSettings } from '../src/app/components/AccessSettings'
import { settingsStorage } from '../src/app/utils/settingsStorage'
import { clearAccessCache } from '../src/app/utils/accessControl'

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })

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

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>)

const makeClient = ({ roles = [], users = [] } = {}) => ({
  request: vi.fn((opts) => {
    if (opts.url === '/api/v2/custom_roles') return Promise.resolve({ custom_roles: roles })
    if (opts.url.startsWith('/api/v2/users/search')) return Promise.resolve({ users })
    const byIdMatch = opts.url.match(/^\/api\/v2\/users\/(\d+)\.json$/)
    if (byIdMatch) {
      const id = Number(byIdMatch[1])
      const user = users.find(u => u.id === id)
      if (user) return Promise.resolve({ user })
    }
    return Promise.reject(httpError(404))
  })
})

describe('AccessSettings', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads current settings and lists custom roles', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedCustomRoleIds: [42], allowedUserIds: [7] } },
      recordId: 'rec-1'
    })
    const client = makeClient({
      roles: [{ id: 42, name: 'Team Lead' }, { id: 99, name: 'Supervisor' }],
      users: [{ id: 7, name: 'Alice', email: 'alice@example.com' }]
    })
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByText('Team Lead')).toBeDefined())
    expect(screen.getByText('Supervisor')).toBeDefined()
    expect(screen.getByDisplayValue('alice@example.com')).toBeDefined()
  })

  it('saves updated settings and clears the access cache', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    settingsStorage.saveSettings.mockResolvedValue({ success: true })
    const client = makeClient({
      roles: [{ id: 42, name: 'Team Lead' }],
      users: [{ id: 7, name: 'Alice', email: 'alice@example.com' }]
    })
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByText('Team Lead')).toBeDefined())

    fireEvent.click(screen.getByRole('checkbox', { name: 'Team Lead' }))

    const emails = screen.getByLabelText(/user emails/i)
    fireEvent.change(emails, { target: { value: 'alice@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(settingsStorage.saveSettings).toHaveBeenCalled())
    const [, saved] = settingsStorage.saveSettings.mock.calls[0]
    expect(saved.access.allowedCustomRoleIds).toContain(42)
    expect(saved.access.allowedUserIds).toContain(7)
    expect(clearAccessCache).toHaveBeenCalled()
  })

  it('shows a permission warning when loadSettings returns forbidden', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: false,
      code: 'forbidden',
      error: 'Insufficient permissions to read custom object records.'
    })
    const client = makeClient({ roles: [], users: [] })
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeDefined())
    const alertTitle = await screen.findByText(/save failed/i)
    const alert = alertTitle.closest('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(within(alert).getAllByText(/edit custom object records/i).length).toBeGreaterThan(0)
  })

  it('shows a permission warning when saveSettings returns forbidden', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    settingsStorage.saveSettings.mockResolvedValue({ success: false, code: 'forbidden' })
    const client = makeClient({ roles: [], users: [] })
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.getByText(/edit custom object records/i)).toBeDefined())
  })

  it('shows a success message after a successful save', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    settingsStorage.saveSettings.mockResolvedValue({ success: true })
    const client = makeClient({ roles: [], users: [] })
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(settingsStorage.saveSettings).toHaveBeenCalled())
    expect(await screen.findByText(/settings saved/i)).toBeDefined()
    expect(screen.getByText(/access rules updated successfully/i)).toBeDefined()
  })

  it('warns about unresolved emails', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    settingsStorage.saveSettings.mockResolvedValue({ success: true })
    const client = {
      request: vi.fn((opts) => {
        if (opts.url === '/api/v2/custom_roles') return Promise.resolve({ custom_roles: [] })
        if (opts.url.startsWith('/api/v2/users/search')) {
          if (opts.url.includes('alice%40example.com')) {
            return Promise.resolve({ users: [{ id: 7, email: 'alice@example.com' }] })
          }
          return Promise.resolve({ users: [] })
        }
        return Promise.reject(httpError(404))
      })
    }
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByLabelText(/user emails/i)).toBeDefined())

    const emails = screen.getByLabelText(/user emails/i)
    fireEvent.change(emails, { target: { value: 'ghost@example.com, alice@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(settingsStorage.saveSettings).toHaveBeenCalled())
    const warningTitle = await screen.findByText(/some emails could not be matched/i)
    const warningAlert = warningTitle.closest('[role="alert"]')
    expect(warningAlert).not.toBeNull()
    expect(within(warningAlert).getByText(/ghost@example.com/)).toBeDefined()
    const [, saved] = settingsStorage.saveSettings.mock.calls[0]
    expect(saved.access.allowedUserIds).toEqual([7])
  })

  it('shows the Agent checkbox even when custom_roles endpoint 403s (non-Enterprise)', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedBuiltInRoles: [], allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    const client = {
      request: vi.fn((opts) => {
        if (opts.url === '/api/v2/custom_roles') return Promise.reject(httpError(403))
        return Promise.resolve({ users: [] })
      })
    }
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByLabelText(/user emails/i)).toBeDefined())
    expect(screen.getByRole('checkbox', { name: /^Agent/ })).toBeDefined()
    expect(screen.getByText(/additional roles are only available on zendesk enterprise/i)).toBeDefined()
  })

  it('saves the built-in Agent role when its checkbox is selected', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedBuiltInRoles: [], allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: null
    })
    settingsStorage.saveSettings.mockResolvedValue({ success: true })
    const client = makeClient({ roles: [], users: [] })
    wrap(<AccessSettings client={client} />)
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /^Agent/ })).toBeDefined())

    fireEvent.click(screen.getByRole('checkbox', { name: /^Agent/ }))
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(settingsStorage.saveSettings).toHaveBeenCalled())
    const [, saved] = settingsStorage.saveSettings.mock.calls[0]
    expect(saved.access.allowedBuiltInRoles).toEqual(['agent'])
  })

  it('loads a previously saved built-in Agent selection into the checkbox', async () => {
    settingsStorage.loadSettings.mockResolvedValue({
      success: true,
      settings: { version: 1, access: { allowedBuiltInRoles: ['agent'], allowedCustomRoleIds: [], allowedUserIds: [] } },
      recordId: 'rec-1'
    })
    const client = makeClient({ roles: [], users: [] })
    wrap(<AccessSettings client={client} />)
    const checkbox = await screen.findByRole('checkbox', { name: /^Agent/ })
    expect(checkbox.checked).toBe(true)
  })

  describe('role search', () => {
    const manyRoles = Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, name: `Role ${i + 1}` }))

    beforeEach(() => {
      settingsStorage.loadSettings.mockResolvedValue({
        success: true,
        settings: { version: 1, access: { allowedBuiltInRoles: [], allowedCustomRoleIds: [], allowedUserIds: [] } },
        recordId: null
      })
      settingsStorage.saveSettings.mockResolvedValue({ success: true })
    })

    it('shows a search input when there are more than 8 total roles', async () => {
      const client = makeClient({ roles: manyRoles })
      wrap(<AccessSettings client={client} />)
      expect(await screen.findByLabelText('Search roles')).toBeDefined()
    })

    it('does not show a search input for short role lists', async () => {
      const client = makeClient({ roles: [{ id: 1, name: 'Team Lead' }] })
      wrap(<AccessSettings client={client} />)
      await screen.findByText('Team Lead')
      expect(screen.queryByLabelText('Search roles')).toBeNull()
    })

    it('filters the role list as the user types', async () => {
      const client = makeClient({
        roles: [
          ...manyRoles,
          { id: 999, name: 'Billing admin' }
        ]
      })
      wrap(<AccessSettings client={client} />)
      const search = await screen.findByLabelText('Search roles')
      fireEvent.change(search, { target: { value: 'billing' } })

      expect(screen.getByText('Billing admin')).toBeDefined()
      expect(screen.queryByText('Role 1')).toBeNull()
      expect(screen.queryByRole('checkbox', { name: /^Agent/ })).toBeNull()
    })

    it('keeps selections that are hidden by the current search filter', async () => {
      const client = makeClient({ roles: manyRoles })
      wrap(<AccessSettings client={client} />)
      await screen.findByLabelText('Search roles')

      fireEvent.click(screen.getByRole('checkbox', { name: 'Role 1' }))

      fireEvent.change(screen.getByLabelText('Search roles'), { target: { value: 'role 7' } })
      expect(screen.queryByText('Role 1')).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(settingsStorage.saveSettings).toHaveBeenCalled())
      const [, saved] = settingsStorage.saveSettings.mock.calls[0]
      expect(saved.access.allowedCustomRoleIds).toContain(100)
    })

    it('shows a no-match hint when the filter excludes everything', async () => {
      const client = makeClient({ roles: manyRoles })
      wrap(<AccessSettings client={client} />)
      const search = await screen.findByLabelText('Search roles')
      fireEvent.change(search, { target: { value: 'zzz-no-match' } })
      expect(screen.getByText(/No roles match/)).toBeDefined()
    })
  })
})
