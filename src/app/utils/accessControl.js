import { settingsStorage } from './settingsStorage'

let cachedResult = null

export function clearAccessCache () {
  cachedResult = null
}

async function loadCurrentUser (client) {
  try {
    const data = await client.get('currentUser')
    return data?.currentUser || null
  } catch {
    return null
  }
}

export async function canConfigureApp (client) {
  if (cachedResult !== null) return cachedResult
  const user = await loadCurrentUser(client)
  if (!user) {
    cachedResult = false
    return false
  }
  if (user.role === 'admin') {
    cachedResult = true
    return true
  }
  const { success, settings } = await settingsStorage.loadSettings(client)
  if (!success) {
    cachedResult = false
    return false
  }
  const builtInAllowed = (settings.access.allowedBuiltInRoles || []).includes(user.role)
  const roleAllowed = settings.access.allowedCustomRoleIds.includes(user.custom_role_id)
  const userAllowed = settings.access.allowedUserIds.includes(user.id)
  cachedResult = builtInAllowed || roleAllowed || userAllowed
  return cachedResult
}
