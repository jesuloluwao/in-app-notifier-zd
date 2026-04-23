import styled from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';

export const AddRuleButton = styled.div`
  margin-bottom: 20px;
`;

export const RuleCard = styled.div`
  border: 1px solid ${p => getColor({ theme: p.theme, variable: 'border.default' })};
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
  opacity: ${props => props.enabled ? 1 : 0.6};
  background-color: ${p => getColor({ theme: p.theme, variable: 'background.default' })};
`;

export const RuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 4px 0 0 0;
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};
  }
`;

export const PriorityBadge = styled.span`
  display: inline-block;
  background-color: ${p => getColor({ theme: p.theme, variable: 'background.primaryEmphasis' })};
  color: ${p => getColor({ theme: p.theme, variable: 'foreground.onEmphasis' })};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

export const RuleContent = styled.div`
  margin-bottom: 12px;
  color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};

  > div {
    margin-bottom: 8px;
  }

  strong {
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};
  }

  ul {
    margin: 4px 0;
    padding-left: 20px;
  }

  p {
    margin: 4px 0;
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.subtle' })};
  }
`;

export const RuleActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${p => getColor({ theme: p.theme, variable: 'foreground.subtle' })};

  h3 {
    margin-bottom: 8px;
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};
  }

  p {
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.subtle' })};
  }
`;