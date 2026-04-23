import styled from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';

export const ConditionRow = styled.div`
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid ${p => getColor({ theme: p.theme, variable: 'border.default' })};
  border-radius: 4px;
  background-color: ${p => getColor({ theme: p.theme, variable: 'background.default' })};
`;

export const ConditionActions = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
`;

export const AddConditionButton = styled.div`
  margin-top: 10px;
`;
