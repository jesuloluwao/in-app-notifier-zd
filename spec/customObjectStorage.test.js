import { describe, expect, it, vi } from 'vitest'
import { customObjectStorage } from '../src/app/utils/customObjectStorage'

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })

describe('customObjectStorage 403 handling', () => {
  it('saveRule maps a 403 rejection to forbidden', async () => {
    const client = {
      request: vi.fn((opts) => {
        if (opts.url.includes('records?page[size]=100')) {
          return Promise.resolve({ custom_object_records: [] })
        }
        return Promise.reject(httpError(403))
      })
    }
    const result = await customObjectStorage.saveRule(client, {
      id: 'r1', name: 'r', conditions: [], message: '', enabled: true, priority: 0
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
    expect(result.error).toMatch(/Your Zendesk role does not have permission/i)
  })

  it('deleteRule maps a 403 rejection to forbidden', async () => {
    const record = {
      id: 'rec-1',
      custom_object_fields: { modal_trigger_rules: JSON.stringify({ id: 'r1' }) }
    }
    const client = {
      request: vi.fn((opts) => {
        if (opts.type === 'GET') {
          return Promise.resolve({ custom_object_records: [record] })
        }
        return Promise.reject(httpError(403))
      })
    }
    const result = await customObjectStorage.deleteRule(client, 'r1')
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
    expect(result.error).toMatch(/Your Zendesk role does not have permission/i)
  })

  it('deleteRule surfaces a 403 from the initial load instead of masking as not found', async () => {
    const deleteSpy = vi.fn(() => Promise.resolve())
    const client = {
      request: vi.fn((opts) => {
        if (opts.type === 'DELETE') return deleteSpy(opts)
        return Promise.reject(httpError(403))
      })
    }
    const result = await customObjectStorage.deleteRule(client, 'r1')
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
    expect(result.error).toMatch(/Your Zendesk role does not have permission/i)
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('loadAllRules maps a 403 rejection to forbidden', async () => {
    const client = { request: vi.fn(() => Promise.reject(httpError(403))) }
    const result = await customObjectStorage.loadAllRules(client)
    expect(result.success).toBe(false)
    expect(result.code).toBe('forbidden')
    expect(result.error).toMatch(/Your Zendesk role does not have permission/i)
  })

  it('does not expose an initialize method', () => {
    expect(customObjectStorage.initialize).toBeUndefined()
  })
})
