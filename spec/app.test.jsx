import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { ClientProvider } from '../src/app/contexts/ClientProvider'
import App from '../src/app/App'
import { setupService } from '../src/app/utils/setupService'
import { canConfigureApp, clearAccessCache } from '../src/app/utils/accessControl'

vi.mock('../src/app/utils/customObjectStorage', () => ({
  customObjectStorage: {
    loadAllRules: vi.fn().mockResolvedValue({ success: true, rules: [] })
  }
}))

vi.mock('../src/app/utils/setupService', () => ({
  setupService: {
    probeSchema: vi.fn(),
    applySchema: vi.fn()
  }
}))

vi.mock('../src/app/utils/accessControl', () => ({
  canConfigureApp: vi.fn(),
  clearAccessCache: vi.fn()
}))

vi.mock('../src/app/components/AdminConfig', () => ({
  AdminConfig: () => <div>ADMIN_CONFIG</div>
}))

vi.mock('../src/app/components/SetupWizard', () => ({
  SetupWizard: (props) => <div>SETUP_WIZARD:{props.mode}</div>
}))

const allExistProbe = () => ({
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

const missingProbe = () => ({
  resources: {
    rules_object: { status: 'missing' },
    rules_field: { status: 'missing' },
    settings_object: { status: 'missing' },
    settings_field: { status: 'missing' },
    settings_seed: { status: 'missing' }
  },
  writePermission: { status: 'skipped' },
  allPresent: false
})

const forbiddenProbe = () => ({
  resources: {
    rules_object: { status: 'exists' },
    rules_field: { status: 'exists' },
    settings_object: { status: 'exists' },
    settings_field: { status: 'exists' },
    settings_seed: { status: 'exists' }
  },
  writePermission: { status: 'forbidden' },
  allPresent: true
})

const mockClient = {
  on: vi.fn((event, callback) => {
    if (event === 'app.registered') {
      setTimeout(callback, 0)
    }
  }),
  get: vi.fn().mockResolvedValue({ currentUser: { locale: 'en' } }),
  context: vi.fn().mockResolvedValue({ location: 'ticket_sidebar' }),
  invoke: vi.fn()
}

describe('App Components', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    document.body.innerHTML = '<div id="root"></div>'
    vi.stubGlobal('ZAFClient', {
      init: vi.fn().mockReturnValue(mockClient)
    })
    mockClient.context.mockResolvedValue({ location: 'ticket_sidebar' })
    mockClient.get.mockResolvedValue({ currentUser: { locale: 'en', role: 'admin' } })
    setupService.probeSchema.mockResolvedValue(allExistProbe())
    canConfigureApp.mockResolvedValue(true)
  })

  it('renders TicketSideBar and shows the correct content', async () => {
    render(
      <ClientProvider>
        <App />
      </ClientProvider>
    )

    expect(mockClient.on).toHaveBeenCalledWith('app.registered', expect.any(Function))

    await waitFor(() =>
      expect(mockClient.invoke).toHaveBeenCalledWith('resize', { width: '100%', height: '0px' })
    )
  })

  it('renders Modal and shows the correct content', async () => {
    mockClient.context.mockImplementation(() => Promise.resolve({ location: 'modal' }))
    render(
      <ClientProvider>
        <App />
      </ClientProvider>
    )

    expect(mockClient.on).toHaveBeenCalledWith('app.registered', expect.any(Function))

    await waitFor(() => expect(screen.getByText('Loading...')).toBeDefined())
  })

  describe('nav_bar gate', () => {
    beforeEach(() => {
      mockClient.context.mockResolvedValue({ location: 'nav_bar' })
    })

    it('renders SetupWizard in bootstrap mode when schema is missing and user is admin', async () => {
      setupService.probeSchema.mockResolvedValue(missingProbe())
      mockClient.get.mockResolvedValue({ currentUser: { locale: 'en', role: 'admin' } })

      render(
        <ClientProvider>
          <App />
        </ClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SETUP_WIZARD:bootstrap')).toBeDefined()
      })
      expect(canConfigureApp).not.toHaveBeenCalled()
    })

    it('shows a passive "setup not complete" message when schema is missing and user is not admin', async () => {
      setupService.probeSchema.mockResolvedValue(missingProbe())
      mockClient.get.mockResolvedValue({ currentUser: { locale: 'en', role: 'agent' } })

      render(
        <ClientProvider>
          <App />
        </ClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /setup not complete/i })).toBeDefined()
      })
      expect(screen.queryByText('SETUP_WIZARD:bootstrap')).toBeNull()
      expect(canConfigureApp).not.toHaveBeenCalled()
    })

    it('renders AdminConfig when schema complete and user is allowed', async () => {
      setupService.probeSchema.mockResolvedValue(allExistProbe())
      canConfigureApp.mockResolvedValue(true)

      render(
        <ClientProvider>
          <App />
        </ClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('ADMIN_CONFIG')).toBeDefined()
      })
    })

    it('renders access-denied message when schema complete and user not allowed', async () => {
      setupService.probeSchema.mockResolvedValue(allExistProbe())
      canConfigureApp.mockResolvedValue(false)

      render(
        <ClientProvider>
          <App />
        </ClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /access denied/i })).toBeDefined()
      })
      expect(screen.queryByText('ADMIN_CONFIG')).toBeNull()
      expect(screen.queryByText(/SETUP_WIZARD:/)).toBeNull()
    })

    it('renders access-denied when probeSchema returns forbidden writePermission', async () => {
      setupService.probeSchema.mockResolvedValue(forbiddenProbe())

      render(
        <ClientProvider>
          <App />
        </ClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /access denied/i })).toBeDefined()
      })
      expect(screen.queryByText(/SETUP_WIZARD:/)).toBeNull()
      expect(canConfigureApp).not.toHaveBeenCalled()
    })

    it('passes onComplete handler to SetupWizard that clears access cache', async () => {
      setupService.probeSchema.mockResolvedValue(missingProbe())
      mockClient.get.mockResolvedValue({ currentUser: { locale: 'en', role: 'admin' } })

      render(
        <ClientProvider>
          <App />
        </ClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('SETUP_WIZARD:bootstrap')).toBeDefined()
      })

      expect(clearAccessCache).not.toHaveBeenCalled()
    })
  })
})
