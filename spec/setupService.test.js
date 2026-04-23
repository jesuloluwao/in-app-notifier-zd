import { describe, expect, it, vi } from 'vitest'
import { setupService, REQUIRED_RESOURCES } from '../src/app/utils/setupService'

const httpError = (status, extra = {}) => Object.assign(new Error(`HTTP ${status}`), { status, ...extra })

function routingClient (routes) {
  return {
    request: vi.fn((opts) => {
      const match = routes.find(r =>
        r.method === opts.type && r.url === opts.url
      )
      if (!match) return Promise.reject(httpError(404, { url: opts.url }))
      if (typeof match.response === 'function') return match.response(opts)
      if (match.reject) return Promise.reject(httpError(match.reject.status))
      return Promise.resolve(match.response)
    })
  }
}

describe('setupService.REQUIRED_RESOURCES', () => {
  it('lists all 5 required resources in the documented order', () => {
    expect(REQUIRED_RESOURCES.map(r => r.id)).toEqual([
      'rules_object', 'rules_field', 'settings_object', 'settings_field', 'settings_seed'
    ])
  })
})

describe('setupService.probeSchema', () => {
  it('marks everything missing when all GETs 404', async () => {
    const client = routingClient([])
    const report = await setupService.probeSchema(client)
    for (const id of ['rules_object', 'rules_field', 'settings_object', 'settings_field', 'settings_seed']) {
      expect(report.resources[id].status).toBe('missing')
    }
    expect(report.writePermission.status).toBe('skipped')
  })

  it('marks present resources exists and runs the write probe when seed present', async () => {
    const client = routingClient([
      { method: 'GET', url: '/api/v2/custom_objects/modal_trigger_rules', response: { custom_object: { key: 'modal_trigger_rules' } } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_trigger_rules/fields/modal_trigger_rules', response: { custom_object_field: { key: 'modal_trigger_rules' } } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_manager_settings', response: { custom_object: { key: 'modal_manager_settings' } } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_manager_settings/fields/settings_json', response: { custom_object_field: { key: 'settings_json' } } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_manager_settings/records?page[size]=100', response: { custom_object_records: [{ id: 'rec-1', name: 'app_settings', custom_object_fields: { settings_json: '{"version":1,"access":{"allowedCustomRoleIds":[],"allowedUserIds":[]}}' } }] } },
      { method: 'PATCH', url: '/api/v2/custom_objects/modal_manager_settings/records/rec-1', response: { custom_object_record: { id: 'rec-1' } } }
    ])
    const report = await setupService.probeSchema(client)
    for (const id of ['rules_object', 'rules_field', 'settings_object', 'settings_field', 'settings_seed']) {
      expect(report.resources[id].status).toBe('exists')
    }
    expect(report.writePermission.status).toBe('ok')
  })

  it('marks writePermission forbidden when the probe PATCH 403s', async () => {
    const client = routingClient([
      { method: 'GET', url: '/api/v2/custom_objects/modal_trigger_rules', response: { custom_object: {} } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_trigger_rules/fields/modal_trigger_rules', response: { custom_object_field: {} } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_manager_settings', response: { custom_object: {} } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_manager_settings/fields/settings_json', response: { custom_object_field: {} } },
      { method: 'GET', url: '/api/v2/custom_objects/modal_manager_settings/records?page[size]=100', response: { custom_object_records: [{ id: 'rec-1', name: 'app_settings', custom_object_fields: { settings_json: '{"version":1,"access":{"allowedCustomRoleIds":[],"allowedUserIds":[]}}' } }] } },
      { method: 'PATCH', url: '/api/v2/custom_objects/modal_manager_settings/records/rec-1', reject: { status: 403 } }
    ])
    const report = await setupService.probeSchema(client)
    expect(report.writePermission.status).toBe('forbidden')
  })
})

describe('setupService.applySchema', () => {
  it('creates only the missing resources', async () => {
    const postedUrls = []
    const client = {
      request: vi.fn((opts) => {
        if (opts.type === 'GET' && opts.url === '/api/v2/custom_objects/modal_trigger_rules') {
          return Promise.resolve({ custom_object: {} })
        }
        if (opts.type === 'GET' && opts.url === '/api/v2/custom_objects/modal_trigger_rules/fields/modal_trigger_rules') {
          return Promise.resolve({ custom_object_field: {} })
        }
        if (opts.type === 'POST') {
          postedUrls.push(opts.url)
          return Promise.resolve({})
        }
        return Promise.reject(httpError(404))
      })
    }
    const result = await setupService.applySchema(client)
    expect(result.success).toBe(true)
    expect(postedUrls).toEqual([
      '/api/v2/custom_objects',
      '/api/v2/custom_objects/modal_manager_settings/fields',
      '/api/v2/custom_objects/modal_manager_settings/records'
    ])
  })

  it('treats 422 "already exists" as success for creates', async () => {
    const client = {
      request: vi.fn((opts) => {
        if (opts.type === 'GET') return Promise.reject(httpError(404))
        return Promise.reject(httpError(422, { responseJSON: { error: 'RecordValidation', description: 'already exists' } }))
      })
    }
    const result = await setupService.applySchema(client)
    expect(result.success).toBe(true)
  })

  it('reports failure with code forbidden when a create 403s', async () => {
    const client = {
      request: vi.fn((opts) => {
        if (opts.type === 'GET') return Promise.reject(httpError(404))
        return Promise.reject(httpError(403))
      })
    }
    const result = await setupService.applySchema(client)
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
  })
})
