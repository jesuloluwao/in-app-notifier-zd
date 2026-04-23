const OBJECT_KEY = 'modal_manager_settings'
const RECORD_NAME = 'app_settings'

export const DEFAULT_SETTINGS = Object.freeze({
  version: 1,
  access: Object.freeze({
    allowedBuiltInRoles: [],
    allowedCustomRoleIds: [],
    allowedUserIds: []
  })
})

async function findRecord (client) {
  try {
    const response = await client.request({
      url: `/api/v2/custom_objects/${OBJECT_KEY}/records?page[size]=100`,
      type: 'GET'
    })
    const records = response?.custom_object_records || []
    return records.find(r => r.name === RECORD_NAME) || null
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

function parseRecord (record) {
  if (!record) return { ...DEFAULT_SETTINGS }
  const raw = record.custom_object_fields?.settings_json
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = JSON.parse(raw)
    return {
      version: parsed.version || 1,
      access: {
        allowedBuiltInRoles: parsed?.access?.allowedBuiltInRoles || [],
        allowedCustomRoleIds: parsed?.access?.allowedCustomRoleIds || [],
        allowedUserIds: parsed?.access?.allowedUserIds || []
      }
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const settingsStorage = {
  async loadSettings (client) {
    try {
      const record = await findRecord(client)
      return {
        success: true,
        settings: parseRecord(record),
        recordId: record?.id || null
      }
    } catch (error) {
      if (error?.status === 404) {
        return { success: true, settings: { ...DEFAULT_SETTINGS }, recordId: null }
      }
      if (error?.status === 403) {
        return { success: false, code: 'forbidden', error: 'Insufficient permissions to read custom object records.' }
      }
      return { success: false, error: 'Failed to load settings', details: error }
    }
  },

  async saveSettings (client, settings) {
    try {
      const existing = await findRecord(client)
      const body = {
        custom_object_record: {
          name: RECORD_NAME,
          custom_object_fields: { settings_json: JSON.stringify(settings) }
        }
      }
      if (existing) {
        const response = await client.request({
          url: `/api/v2/custom_objects/${OBJECT_KEY}/records/${existing.id}`,
          type: 'PATCH',
          contentType: 'application/json',
          data: JSON.stringify(body)
        })
        return { success: true, data: response }
      }
      const response = await client.request({
        url: `/api/v2/custom_objects/${OBJECT_KEY}/records`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(body)
      })
      return { success: true, data: response }
    } catch (error) {
      if (error?.status === 403) {
        return { success: false, code: 'forbidden', error: 'Insufficient permissions to write custom object records.' }
      }
      return { success: false, error: 'Failed to save settings', details: error }
    }
  }
}
