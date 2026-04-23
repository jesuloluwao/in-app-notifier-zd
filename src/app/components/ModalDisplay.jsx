// components/ModalDisplay.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '@zendeskgarden/react-buttons';
import styled from 'styled-components';

const ModalContainer = styled.div`
  padding: 20px;
`;

const ModalHeader = styled.h2`
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
`;

const ModalBody = styled.div`
  margin-bottom: 20px;
  white-space: pre-wrap;
  line-height: 1.5;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export const ModalDisplay = ({ client }) => {
  const [rule, setRule] = useState(null);

  useEffect(() => {
    // Listen for rule data from the ticket sidebar
    client.on('displayRule', (data) => {
      console.log('Received rule data:', data);
      setRule(data);
    });
  }, [client]);

  const handleClose = () => {
    client.invoke('destroy');
  };

  if (!rule) {
    return (
      <ModalContainer>
        <p>Loading...</p>
      </ModalContainer>
    );
  }

  return (
    <ModalContainer>
      <ModalHeader>{rule.name}</ModalHeader>
      <ModalBody>{rule.message}</ModalBody>
      <ModalFooter>
        <Button isPrimary onClick={handleClose}>
          Close
        </Button>
      </ModalFooter>
    </ModalContainer>
  );
};