import { useCallback, useEffect, useState } from 'react'
import { Button } from '@zendeskgarden/react-buttons'
import { Alert, Notification } from '@zendeskgarden/react-notifications'
import { Spinner } from '@zendeskgarden/react-loaders'
import { setupService, REQUIRED_RESOURCES } from '../utils/setupService'
import {
  WizardContainer,
  ChecklistRow,
  RowText,
  RowTitle,
  RowDescription,
  RowStatus,
  Actions
} from '../styles/SetupWizard'

const STATUS_LABEL = {
  exists: 'Exists',
  missing: 'Missing',
  created: 'Created',
  ok: 'OK',
  forbidden: 'Forbidden',
  error: 'Error',
  skipped: 'Skipped (setup incomplete)'
}

const PERMISSION_DOC_URL = 'https://support.zendesk.com/hc/en-us/articles/6034512432026'

export const SetupWizard = ({ client, mode = 'bootstrap', onComplete }) => {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await setupService.probeSchema(client)
      setReport(next)
    } catch (err) {
      setError('Failed to probe schema: ' + (err?.message || 'unknown error'))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => { refresh() }, [refresh])

  const onApply = async () => {
    setApplying(true)
    setError(null)
    const result = await setupService.applySchema(client)
    if (!result.success) {
      if (result.code === 'forbidden') {
        setError(`Insufficient permissions — this Zendesk account cannot create custom objects. See ${PERMISSION_DOC_URL}.`)
      } else {
        setError(result.error || 'Failed to create resources.')
      }
      setApplying(false)
      return
    }
    await refresh()
    setApplying(false)
    if (typeof onComplete === 'function') onComplete()
  }

  if (loading && !report) {
    return <WizardContainer><Spinner size="large" /></WizardContainer>
  }

  return (
    <WizardContainer>
      <h2>ModalManager setup</h2>
      <p>The app needs a few Zendesk custom objects and fields before it can be used.</p>

      {error && (
        <Alert type="error" style={{ marginBottom: '16px' }}>
          <Alert.Title>Setup error</Alert.Title>
          <Alert.Paragraph>{error}</Alert.Paragraph>
        </Alert>
      )}

      {REQUIRED_RESOURCES.map(resource => {
        const status = report?.resources?.[resource.id]?.status || 'missing'
        return (
          <ChecklistRow key={resource.id}>
            <RowText>
              <RowTitle>{resource.title}</RowTitle>
              <RowDescription>{resource.description}</RowDescription>
            </RowText>
            <RowStatus $status={status}>{STATUS_LABEL[status] || status}</RowStatus>
          </ChecklistRow>
        )
      })}

      <ChecklistRow>
        <RowText>
          <RowTitle>Current user can write custom object records</RowTitle>
          <RowDescription>
            Configurators must have &quot;Edit custom object records&quot; enabled on their Zendesk role.
          </RowDescription>
        </RowText>
        <RowStatus $status={report?.writePermission?.status || 'skipped'}>
          {STATUS_LABEL[report?.writePermission?.status] || report?.writePermission?.status}
        </RowStatus>
      </ChecklistRow>

      {report?.writePermission?.status === 'forbidden' && (
        <Notification type="warning" style={{ marginTop: '12px' }}>
          <Notification.Title>Permission issue</Notification.Title>
          Your Zendesk role is missing <strong>Edit custom object records</strong>. Open <em>Admin Center → People → Roles</em>, edit the relevant role, and enable the custom-object permission.
        </Notification>
      )}

      <Actions>
        {mode === 'bootstrap' && (
          <Button isPrimary onClick={onApply} disabled={applying}>
            {applying ? 'Creating…' : 'Create required resources'}
          </Button>
        )}
        {mode === 'healthcheck' && (
          <Button onClick={refresh} disabled={loading}>
            {loading ? 'Checking…' : 'Re-check'}
          </Button>
        )}
      </Actions>
    </WizardContainer>
  )
}

export default SetupWizard
