import { useEffect, useState } from 'react'
import { Button } from '@zendeskgarden/react-buttons'
import { Alert, Notification } from '@zendeskgarden/react-notifications'
import { Spinner } from '@zendeskgarden/react-loaders'
import { settingsStorage, DEFAULT_SETTINGS } from '../utils/settingsStorage'
import { clearAccessCache } from '../utils/accessControl'
import { AccessContainer, Field, RolesList, RoleItem, RoleHint, RoleSearch, RoleSelectionCount, EmailInput } from '../styles/AccessSettings'

const SEARCH_THRESHOLD = 8

async function loadCustomRoles (client) {
  try {
    const response = await client.request({ url: '/api/v2/custom_roles', type: 'GET' })
    return { available: true, roles: response?.custom_roles || [] }
  } catch (error) {
    if (error?.status === 403) return { available: false, roles: [] }
    return { available: true, roles: [] }
  }
}

async function lookupUserIdsByEmails (client, emails) {
  const results = []
  const unresolved = []
  for (const email of emails) {
    const trimmed = email.trim()
    if (!trimmed) continue
    try {
      const response = await client.request({
        url: `/api/v2/users/search?query=${encodeURIComponent(trimmed)}`,
        type: 'GET'
      })
      const match = (response?.users || []).find(u => u.email?.toLowerCase() === trimmed.toLowerCase())
      if (match) {
        results.push({ id: match.id, email: match.email })
      } else {
        unresolved.push(trimmed)
      }
    } catch (error) {
      console.warn('User lookup failed for', trimmed, error)
      unresolved.push(trimmed)
    }
  }
  return { results, unresolved }
}

async function resolveEmailsForUserIds (client, userIds) {
  const emails = []
  for (const id of userIds) {
    try {
      const response = await client.request({ url: `/api/v2/users/${id}.json`, type: 'GET' })
      if (response?.user?.email) emails.push(response.user.email)
    } catch (error) {
      console.warn('User lookup failed for id', id, error)
    }
  }
  return emails
}

export const AccessSettings = ({ client }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [permissionError, setPermissionError] = useState(false)
  const [rolesAvailable, setRolesAvailable] = useState(true)
  const [allRoles, setAllRoles] = useState([])
  const [selectedRoleIds, setSelectedRoleIds] = useState([])
  const [selectedBuiltInRoles, setSelectedBuiltInRoles] = useState([])
  const [emailsText, setEmailsText] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [unresolvedEmails, setUnresolvedEmails] = useState([])

  useEffect(() => {
    let cancelled = false
    async function init () {
      const [settingsResult, rolesResult] = await Promise.all([
        settingsStorage.loadSettings(client),
        loadCustomRoles(client)
      ])
      if (cancelled) return
      setRolesAvailable(rolesResult.available)
      setAllRoles(rolesResult.roles)
      if (settingsResult.success === false && settingsResult.code === 'forbidden') {
        setPermissionError(true)
        setLoading(false)
        return
      }
      const settings = settingsResult.success ? settingsResult.settings : DEFAULT_SETTINGS
      setSelectedRoleIds(settings.access.allowedCustomRoleIds || [])
      setSelectedBuiltInRoles(settings.access.allowedBuiltInRoles || [])
      const emails = await resolveEmailsForUserIds(client, settings.access.allowedUserIds || [])
      if (cancelled) return
      setEmailsText(emails.join(', '))
      setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [client])

  const onSave = async () => {
    setSaving(true)
    setError(null)
    setPermissionError(false)
    setJustSaved(false)
    setUnresolvedEmails([])
    const emails = emailsText.split(',').map(e => e.trim()).filter(Boolean)
    const { results: resolved, unresolved } = await lookupUserIdsByEmails(client, emails)
    const settings = {
      version: 1,
      access: {
        allowedBuiltInRoles: [...selectedBuiltInRoles],
        allowedCustomRoleIds: selectedRoleIds.map(Number),
        allowedUserIds: resolved.map(r => r.id)
      }
    }
    const result = await settingsStorage.saveSettings(client, settings)
    setSaving(false)
    if (!result.success) {
      if (result.code === 'forbidden') {
        setPermissionError(true)
      } else {
        setError(result.error || 'Failed to save settings.')
      }
      return
    }
    clearAccessCache()
    setJustSaved(true)
    setUnresolvedEmails(unresolved)
  }

  if (loading) {
    return <AccessContainer><Spinner size="large" /></AccessContainer>
  }

  return (
    <AccessContainer>
      <Notification type="warning">
        <Notification.Title>Zendesk role permission required</Notification.Title>
        Users and roles granted access here must also have <strong>Edit custom object records</strong>
        enabled on their Zendesk role. Open <em>Admin Center → People → Roles</em> in Zendesk, edit
        each listed role, and enable the custom-object permission.
      </Notification>

      {justSaved && (
        <Notification type="success">
          <Notification.Title>Settings saved</Notification.Title>
          Access rules updated successfully.
          <Notification.Close aria-label="Dismiss" onClick={() => setJustSaved(false)} />
        </Notification>
      )}

      {unresolvedEmails.length > 0 && (
        <Alert type="warning">
          <Alert.Title>Some emails could not be matched</Alert.Title>
          <Alert.Paragraph>
            The following emails did not match any Zendesk user and were not saved. Check for
            typos and try again:
          </Alert.Paragraph>
          <ul>
            {unresolvedEmails.map(email => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        </Alert>
      )}

      {permissionError && (
        <Alert type="error">
          <Alert.Title>Save failed</Alert.Title>
          <Alert.Paragraph>
            Your Zendesk role does not have permission to edit custom object records.
            Ask a Zendesk admin to enable <strong>Edit custom object records</strong> on your role.
          </Alert.Paragraph>
        </Alert>
      )}

      {error && (
        <Alert type="error">
          <Alert.Title>Save failed</Alert.Title>
          <Alert.Paragraph>{error}</Alert.Paragraph>
        </Alert>
      )}

      {(() => {
        const totalRoles = 1 + (rolesAvailable ? allRoles.length : 0)
        const showSearch = totalRoles > SEARCH_THRESHOLD
        const filter = roleSearch.trim().toLowerCase()
        const agentVisible = !filter || 'agent'.includes(filter) || 'all zendesk agents'.includes(filter)
        const visibleCustomRoles = filter
          ? allRoles.filter(r => r.name.toLowerCase().includes(filter))
          : allRoles
        const nothingMatches = !!filter && !agentVisible && visibleCustomRoles.length === 0
        const selectionCount = selectedBuiltInRoles.length + selectedRoleIds.length
        return (
          <Field>
            <div id="acl-roles-label">Roles with access</div>
            {showSearch && (
              <RoleSearch
                type="search"
                placeholder="Search roles…"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                aria-label="Search roles"
              />
            )}
            <RolesList role="group" aria-labelledby="acl-roles-label">
              {agentVisible && (
                <RoleItem htmlFor="acl-role-builtin-agent">
                  <input
                    type="checkbox"
                    id="acl-role-builtin-agent"
                    checked={selectedBuiltInRoles.includes('agent')}
                    onChange={() => {
                      setSelectedBuiltInRoles(prev => (
                        prev.includes('agent')
                          ? prev.filter(r => r !== 'agent')
                          : [...prev, 'agent']
                      ))
                      setJustSaved(false)
                    }}
                  />
                  <span>
                    Agent <em style={{ color: '#68737d', fontWeight: 'normal' }}>(all Zendesk agents)</em>
                  </span>
                </RoleItem>
              )}

              {rolesAvailable && visibleCustomRoles.map(role => {
                const checked = selectedRoleIds.includes(role.id)
                return (
                  <RoleItem key={role.id} htmlFor={`acl-role-${role.id}`}>
                    <input
                      type="checkbox"
                      id={`acl-role-${role.id}`}
                      checked={checked}
                      onChange={() => {
                        setSelectedRoleIds(prev => (
                          prev.includes(role.id)
                            ? prev.filter(id => id !== role.id)
                            : [...prev, role.id]
                        ))
                        setJustSaved(false)
                      }}
                    />
                    <span>{role.name}</span>
                  </RoleItem>
                )
              })}

              {nothingMatches && <RoleHint>No roles match &ldquo;{roleSearch}&rdquo;.</RoleHint>}

              {!filter && rolesAvailable && allRoles.length === 0 && (
                <RoleHint>No additional roles defined on this Zendesk account.</RoleHint>
              )}

              {!filter && !rolesAvailable && (
                <RoleHint>Additional roles are only available on Zendesk Enterprise plans.</RoleHint>
              )}
            </RolesList>
            <RoleSelectionCount>
              {selectionCount === 0 ? 'No roles selected' : `${selectionCount} role${selectionCount === 1 ? '' : 's'} selected`}
            </RoleSelectionCount>
          </Field>
        )
      })()}

      <Field>
        <label htmlFor="acl-emails">User emails with access (comma-separated)</label>
        <EmailInput
          id="acl-emails"
          value={emailsText}
          onChange={(e) => {
            setEmailsText(e.target.value)
            setJustSaved(false)
          }}
          placeholder="alice@example.com, bob@example.com"
        />
      </Field>

      <div>
        <Button isPrimary onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </AccessContainer>
  )
}

export default AccessSettings
