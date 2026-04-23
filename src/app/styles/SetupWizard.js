import styled from 'styled-components'
import { getColor } from '@zendeskgarden/react-theming'

export const WizardContainer = styled.div`
  padding: 20px;
  max-width: 800px;
`

export const ChecklistRow = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid ${p => getColor({ theme: p.theme, variable: 'border.subtle' })};
`

export const RowText = styled.div`
  flex: 1;
`

export const RowTitle = styled.div`
  font-weight: 600;
`

export const RowDescription = styled.div`
  font-size: 12px;
  color: ${p => getColor({ theme: p.theme, variable: 'foreground.subtle' })};
`

export const RowStatus = styled.div`
  min-width: 110px;
  text-align: right;
  font-weight: 600;
  color: ${p => {
    const variable = {
      exists: 'foreground.success',
      created: 'foreground.success',
      ok: 'foreground.success',
      missing: 'foreground.warning',
      forbidden: 'foreground.danger',
      error: 'foreground.danger',
      skipped: 'foreground.subtle'
    }[p.$status] || 'foreground.default'
    return getColor({ theme: p.theme, variable })
  }};
`

export const Actions = styled.div`
  margin-top: 20px;
  display: flex;
  gap: 12px;
`
