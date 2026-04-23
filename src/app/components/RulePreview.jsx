import React from 'react';
import DOMPurify from 'dompurify';
import { Modal } from '@zendeskgarden/react-modals';
import { Button } from '@zendeskgarden/react-buttons';
import styled from 'styled-components';

const MessageContent = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #49545C;
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #2F3941;
  }
  
  h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #2F3941;
  }
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #2F3941;
  }
  
  p {
    margin-bottom: 12px;
  }
  
  ul, ol {
    margin-bottom: 12px;
    padding-left: 24px;
  }
  
  li {
    margin-bottom: 4px;
  }
  
  a {
    color: #1F73B7;
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }
`;

export const RulePreview = ({ rule, onClose }) => {
  return (
    <Modal onClose={onClose}>
      <Modal.Header>{rule.name || 'Rule Preview'}</Modal.Header>
      <Modal.Body>
        <MessageContent dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rule.message || '') }} />
      </Modal.Body>
      <Modal.Footer>
        <Modal.FooterItem>
          <Button isPrimary onClick={onClose}>Close</Button>
        </Modal.FooterItem>
      </Modal.Footer>
      <Modal.Close aria-label="Close preview modal" />
    </Modal>
  );
};