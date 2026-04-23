import styled from 'styled-components'

export const AccessContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const RolesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d8dcde;
  border-radius: 4px;
  max-height: 240px;
  overflow-y: auto;
`

export const RoleItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;

  input[type='checkbox'] {
    margin: 0;
    cursor: pointer;
  }
`

export const RoleHint = styled.p`
  margin: 0;
  color: #68737d;
  font-size: 13px;
  font-style: italic;
`

export const RoleSearch = styled.input`
  padding: 8px 10px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid #d8dcde;
  border-radius: 4px;

  &:focus {
    outline: none;
    border-color: #1f73b7;
    box-shadow: 0 0 0 2px rgba(31, 115, 183, 0.15);
  }
`

export const RoleSelectionCount = styled.div`
  font-size: 12px;
  color: #68737d;
`

export const EmailInput = styled.textarea`
  min-height: 80px;
  padding: 8px;
  font-family: inherit;
  font-size: 14px;
`
