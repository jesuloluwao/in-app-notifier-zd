import { describe, expect, it, vi } from 'vitest'
import { settingsStorage, DEFAULT_SETTINGS } from '../src/app/utils/settingsStorage'

const makeClient = (requestImpl) => ({ request: vi.fn(requestImpl) })
const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })

describe('settingsStorage.loadSettings', () => {
  it('returns default settings when no record exists (empty list)', async () => {
    const client = makeClient(() => Promise.resolve({ custom_object_records: [] }))
    const result = await settingsStorage.loadSettings(client)
    expect(result.success).toBe(true)
    expect(result.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.recordId).toBeNull()
  })

  it('returns default settings when endpoint 404s', async () => {
    const client = makeClient(() => Promise.reject(httpError(404)))
    const result = await settingsStorage.loadSettings(client)
    expect(result.success).toBe(true)
    expect(result.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.recordId).toBeNull()
  })

  it('maps a 403 GET rejection to a friendly forbidden error', async () => {
    const client = makeClient(() => Promise.reject(httpError(403)))
    const result = await settingsStorage.loadSettings(client)
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
    expect(result.error).toMatch(/insufficient permissions/i)
  })

  it('parses the settings_json field when a record exists', async () => {
    const payload = {
      version: 1,
      access: { allowedBuiltInRoles: ['agent'], allowedCustomRoleIds: [123], allowedUserIds: [456] }
    }
    const client = makeClient(() => Promise.resolve({
      custom_object_records: [{
        id: 'rec-1',
        name: 'app_settings',
        custom_object_fields: { settings_json: JSON.stringify(payload) }
      }]
    }))
    const result = await settingsStorage.loadSettings(client)
    expect(result.success).toBe(true)
    expect(result.settings).toEqual(payload)
    expect(result.recordId).toBe('rec-1')
  })

  it('defaults allowedBuiltInRoles to an empty array when absent from the stored blob', async () => {
    const legacyPayload = {
      version: 1,
      access: { allowedCustomRoleIds: [1], allowedUserIds: [2] }
    }
    const client = makeClient(() => Promise.resolve({
      custom_object_records: [{
        id: 'rec-legacy',
        name: 'app_settings',
        custom_object_fields: { settings_json: JSON.stringify(legacyPayload) }
      }]
    }))
    const result = await settingsStorage.loadSettings(client)
    expect(result.success).toBe(true)
    expect(result.settings.access.allowedBuiltInRoles).toEqual([])
    expect(result.settings.access.allowedCustomRoleIds).toEqual([1])
  })
})

describe('settingsStorage.saveSettings', () => {
  it('creates a new record when no recordId exists', async () => {
    const calls = []
    const client = makeClient((opts) => {
      calls.push(opts)
      if (opts.type === 'GET') return Promise.resolve({ custom_object_records: [] })
      return Promise.resolve({ custom_object_record: { id: 'new-1' } })
    })
    const settings = { version: 1, access: { allowedCustomRoleIds: [7], allowedUserIds: [] } }
    const result = await settingsStorage.saveSettings(client, settings)
    expect(result.success).toBe(true)
    const post = calls.find(c => c.type === 'POST')
    expect(post.url).toBe('/api/v2/custom_objects/modal_manager_settings/records')
    expect(JSON.parse(post.data)).toEqual({
      custom_object_record: {
        name: 'app_settings',
        custom_object_fields: { settings_json: JSON.stringify(settings) }
      }
    })
  })

  it('updates the existing record when one is present', async () => {
    const calls = []
    const client = makeClient((opts) => {
      calls.push(opts)
      if (opts.type === 'GET') {
        return Promise.resolve({
          custom_object_records: [{
            id: 'rec-9',
            name: 'app_settings',
            custom_object_fields: { settings_json: JSON.stringify({ version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } }) }
          }]
        })
      }
      return Promise.resolve({ custom_object_record: { id: 'rec-9' } })
    })
    const settings = { version: 1, access: { allowedCustomRoleIds: [1], allowedUserIds: [2] } }
    const result = await settingsStorage.saveSettings(client, settings)
    expect(result.success).toBe(true)
    const patch = calls.find(c => c.type === 'PATCH')
    expect(patch.url).toBe('/api/v2/custom_objects/modal_manager_settings/records/rec-9')
  })

  it('maps 403 responses to a friendly permission error', async () => {
    const client = makeClient((opts) => {
      if (opts.type === 'GET') return Promise.resolve({ custom_object_records: [] })
      return Promise.reject(httpError(403))
    })
    const settings = { version: 1, access: { allowedCustomRoleIds: [], allowedUserIds: [] } }
    const result = await settingsStorage.saveSettings(client, settings)
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
  })
})
