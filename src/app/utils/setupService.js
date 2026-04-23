import { DEFAULT_SETTINGS } from './settingsStorage'

const RULES_OBJECT_KEY = 'modal_trigger_rules'
const RULES_FIELD_KEY = 'modal_trigger_rules'
const SETTINGS_OBJECT_KEY = 'modal_manager_settings'
const SETTINGS_FIELD_KEY = 'settings_json'
const SETTINGS_RECORD_NAME = 'app_settings'

export const REQUIRED_RESOURCES = [
  {
    id: 'rules_object',
    kind: 'object',
    title: 'Custom object: Modal trigger rules',
    description: 'Holds one record per configured rule.'
  },
  {
    id: 'rules_field',
    kind: 'field',
    title: 'Field: rule payload',
    description: 'Textarea field storing the rule as JSON.'
  },
  {
    id: 'settings_object',
    kind: 'object',
    title: 'Custom object: ModalManager settings',
    description: 'Holds app-level configuration (ACL, etc).'
  },
  {
    id: 'settings_field',
    kind: 'field',
    title: 'Field: settings payload',
    description: 'Textarea field storing the settings JSON blob.'
  },
  {
    id: 'settings_seed',
    kind: 'record',
    title: 'Seed record: app_settings',
    description: 'The single record holding live settings for this app.'
  }
]

async function probeObject (client, key) {
  try {
    await client.request({ url: `/api/v2/custom_objects/${key}`, type: 'GET' })
    return 'exists'
  } catch (error) {
    if (error.status === 404) return 'missing'
    throw error
  }
}

async function probeField (client, objectKey, fieldKey) {
  try {
    await client.request({
      url: `/api/v2/custom_objects/${objectKey}/fields/${fieldKey}`,
      type: 'GET'
    })
    return 'exists'
  } catch (error) {
    if (error.status === 404) return 'missing'
    throw error
  }
}

async function probeSeedRecord (client) {
  try {
    const response = await client.request({
      url: `/api/v2/custom_objects/${SETTINGS_OBJECT_KEY}/records?page[size]=100`,
      type: 'GET'
    })
    const record = (response?.custom_object_records || []).find(r => r.name === SETTINGS_RECORD_NAME)
    return { status: record ? 'exists' : 'missing', record: record || null }
  } catch (error) {
    if (error.status === 404) return { status: 'missing', record: null }
    throw error
  }
}

function isAlreadyExists (error) {
  if (!error) return false
  if (error.status !== 422) return false
  const body = error.responseJSON || {}
  const text = `${body.error || ''} ${body.description || ''} ${JSON.stringify(body.details || '')}`.toLowerCase()
  return text.includes('already')
}

async function createObject (client, { key, title, titlePlural }) {
  const body = {
    custom_object: {
      key,
      title,
      title_pluralized: titlePlural,
      raw_title: title,
      raw_title_pluralized: titlePlural
    }
  }
  try {
    await client.request({
      url: '/api/v2/custom_objects',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(body)
    })
  } catch (error) {
    if (isAlreadyExists(error)) return
    throw error
  }
}

async function createField (client, { objectKey, fieldKey, title, type }) {
  const body = {
    custom_object_field: {
      type,
      key: fieldKey,
      title
    }
  }
  try {
    await client.request({
      url: `/api/v2/custom_objects/${objectKey}/fields`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(body)
    })
  } catch (error) {
    if (isAlreadyExists(error)) return
    throw error
  }
}

async function createSeedRecord (client) {
  const body = {
    custom_object_record: {
      name: SETTINGS_RECORD_NAME,
      custom_object_fields: {
        [SETTINGS_FIELD_KEY]: JSON.stringify(DEFAULT_SETTINGS)
      }
    }
  }
  try {
    await client.request({
      url: `/api/v2/custom_objects/${SETTINGS_OBJECT_KEY}/records`,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(body)
    })
  } catch (error) {
    if (isAlreadyExists(error)) return
    throw error
  }
}

async function probeWriteAccess (client, seedRecord) {
  if (!seedRecord) return { status: 'skipped' }
  const existing = seedRecord.custom_object_fields?.[SETTINGS_FIELD_KEY]
  if (existing === undefined || existing === null) return { status: 'skipped' }
  try {
    const body = {
      custom_object_record: {
        custom_object_fields: { [SETTINGS_FIELD_KEY]: existing }
      }
    }
    await client.request({
      url: `/api/v2/custom_objects/${SETTINGS_OBJECT_KEY}/records/${seedRecord.id}`,
      type: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify(body)
    })
    return { status: 'ok' }
  } catch (error) {
    if (error.status === 403) return { status: 'forbidden' }
    return { status: 'error', details: error }
  }
}

async function collectResources (client) {
  const resources = {}
  resources.rules_object = { status: await probeObject(client, RULES_OBJECT_KEY) }
  resources.rules_field = resources.rules_object.status === 'exists'
    ? { status: await probeField(client, RULES_OBJECT_KEY, RULES_FIELD_KEY) }
    : { status: 'missing' }
  resources.settings_object = { status: await probeObject(client, SETTINGS_OBJECT_KEY) }
  resources.settings_field = resources.settings_object.status === 'exists'
    ? { status: await probeField(client, SETTINGS_OBJECT_KEY, SETTINGS_FIELD_KEY) }
    : { status: 'missing' }

  let seedRecord = null
  if (resources.settings_object.status === 'exists' && resources.settings_field.status === 'exists') {
    const probed = await probeSeedRecord(client)
    resources.settings_seed = { status: probed.status }
    seedRecord = probed.record
  } else {
    resources.settings_seed = { status: 'missing' }
  }

  const allPresent = REQUIRED_RESOURCES.every(r => resources[r.id]?.status === 'exists')
  return { resources, seedRecord, allPresent }
}

export const setupService = {
  async probeSchema (client) {
    const { resources, seedRecord, allPresent } = await collectResources(client)
    const writePermission = seedRecord
      ? await probeWriteAccess(client, seedRecord)
      : { status: 'skipped' }
    return { resources, writePermission, allPresent }
  },

  async applySchema (client) {
    try {
      const { resources } = await collectResources(client)
      const created = []

      if (resources.rules_object.status === 'missing') {
        await createObject(client, {
          key: RULES_OBJECT_KEY,
          title: 'Modal trigger rule',
          titlePlural: 'Modal trigger rules'
        })
        created.push('rules_object')
      }
      if (resources.rules_field.status === 'missing') {
        await createField(client, {
          objectKey: RULES_OBJECT_KEY,
          fieldKey: RULES_FIELD_KEY,
          title: 'Rule payload',
          type: 'textarea'
        })
        created.push('rules_field')
      }
      if (resources.settings_object.status === 'missing') {
        await createObject(client, {
          key: SETTINGS_OBJECT_KEY,
          title: 'ModalManager setting',
          titlePlural: 'ModalManager settings'
        })
        created.push('settings_object')
      }
      if (resources.settings_field.status === 'missing') {
        await createField(client, {
          objectKey: SETTINGS_OBJECT_KEY,
          fieldKey: SETTINGS_FIELD_KEY,
          title: 'Settings JSON',
          type: 'textarea'
        })
        created.push('settings_field')
      }
      if (resources.settings_seed.status === 'missing') {
        await createSeedRecord(client)
        created.push('settings_seed')
      }

      return { success: true, created }
    } catch (error) {
      if (error?.status === 403) {
        return { success: false, code: 'forbidden', error: 'Insufficient permissions for custom object administration.', details: error }
      }
      return { success: false, error: 'Failed to apply schema', details: error }
    }
  }
}
