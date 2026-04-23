import styled from 'styled-components';
import { getColor } from '@zendeskgarden/react-theming';

export const EditorContainer = styled.div`
  border: 1px solid ${p => getColor({ theme: p.theme, variable: 'border.default' })};
  border-radius: 4px;
  background-color: ${p => getColor({ theme: p.theme, variable: 'background.default' })};
  width: 100%;
  max-width: 900px;
  box-sizing: border-box;

  /* Normal block flow. The AdminEditorLayout above is the scroll container
     and the EditorActions below uses position: sticky to stay pinned to the
     bottom of the visible scroll area. */
  display: block;
`;

export const EditorHeader = styled.div`
  padding: 20px 20px 0 20px;
  margin-bottom: 24px;
`;

export const EditorTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};
`;

export const EditorForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 20px 20px 20px;
`;

export const EditorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid ${p => getColor({ theme: p.theme, variable: 'border.default' })};
  background-color: ${p => getColor({ theme: p.theme, variable: 'background.default' })};
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;

  & > button {
    flex: 0 1 auto;
  }
`;

export const EditorSection = styled.div`
  margin-bottom: 24px;
  
  h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.default' })};
  }
  
  p {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: ${p => getColor({ theme: p.theme, variable: 'foreground.subtle' })};
  }
`;