import styled from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';

export const AdminContainer = styled.div`
  padding: 20px;

  /* Inner content is width-constrained so long lines wrap nicely; the
     scrollbar lives on <body> at the far right of the iframe. */
  & > * {
    max-width: 1200px;
  }
`;

/* Wrapper used only when rendering the RuleEditor. Normal block flow — the
   iframe body is the single scroll container, so there's exactly one
   scrollbar on the far right of the iframe. */
export const AdminEditorLayout = styled.div`
  padding: 20px;
  box-sizing: border-box;
`;

export const AdminHeader = styled.div`
  margin-bottom: 30px;
`;

export const AdminTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};
`;

export const TabPanelContent = styled.div`
  padding-top: 16px;
`;
