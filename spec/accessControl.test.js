import { describe, expect, it, vi, beforeEach } from 'vitest'
import { canConfigureApp, clearAccessCache } from '../src/app/utils/accessControl'

const makeClient = ({ user, records = [] }) => ({
  get: vi.fn().mockResolvedValue({ currentUser: user }),
  request: vi.fn().mockResolvedValue({ custom_object_records: records })
})

const settingsRecord = (access) => ({
  id: 'rec-1',
  name: 'app_settings',
  custom_object_fields: { settings_json: JSON.stringify({ version: 1, access }) }
})

describe('canConfigureApp', () => {
  beforeEach(() => clearAccessCache())

  it('allows built-in Zendesk admins regardless of ACL', async () => {
    const client = makeClient({
      user: { id: 1, role: 'admin', custom_role_id: null },
      records: []
    })
    await expect(canConfigureApp(client)).resolves.toBe(true)
  })

  it('allows agents whose custom_role_id is in allowedCustomRoleIds', async () => {
    const client = makeClient({
      user: { id: 2, role: 'agent', custom_role_id: 42 },
      records: [settingsRecord({ allowedCustomRoleIds: [42], allowedUserIds: [] })]
    })
    await expect(canConfigureApp(client)).resolves.toBe(true)
  })

  it("allows agents when their built-in role is in allowedBuiltInRoles", async () => {
    const client = makeClient({
      user: { id: 5, role: 'agent', custom_role_id: null },
      records: [settingsRecord({
        allowedBuiltInRoles: ['agent'],
        allowedCustomRoleIds: [],
        allowedUserIds: []
      })]
    })
    await expect(canConfigureApp(client)).resolves.toBe(true)
  })

  it('allows agents whose id is in allowedUserIds', async () => {
    const client = makeClient({
      user: { id: 99, role: 'agent', custom_role_id: 1 },
      records: [settingsRecord({ allowedCustomRoleIds: [42], allowedUserIds: [99] })]
    })
    await expect(canConfigureApp(client)).resolves.toBe(true)
  })

  it('denies agents who are in neither list', async () => {
    const client = makeClient({
      user: { id: 3, role: 'agent', custom_role_id: 7 },
      records: [settingsRecord({ allowedCustomRoleIds: [42], allowedUserIds: [99] })]
    })
    await expect(canConfigureApp(client)).resolves.toBe(false)
  })

  it('denies agents when the settings record does not exist yet', async () => {
    const client = makeClient({
      user: { id: 3, role: 'agent', custom_role_id: 7 },
      records: []
    })
    await expect(canConfigureApp(client)).resolves.toBe(false)
  })

  it('memoises per-session; clearAccessCache forces a refetch', async () => {
    const client = makeClient({
      user: { id: 1, role: 'admin' },
      records: []
    })
    await canConfigureApp(client)
    await canConfigureApp(client)
    expect(client.get).toHaveBeenCalledTimes(1)
    clearAccessCache()
    await canConfigureApp(client)
    expect(client.get).toHaveBeenCalledTimes(2)
  })
})
