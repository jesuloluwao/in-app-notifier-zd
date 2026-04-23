import { useState, useEffect } from 'react';
import { useClient } from '../hooks/useClient';
import { Button } from '@zendeskgarden/react-buttons';
import { XL, MD } from '@zendeskgarden/react-typography';
import styled from 'styled-components';

const ModalContainer = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ModalHeader = styled.div`
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ebed;
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
`;

const ModalMessage = styled.p`
  white-space: pre-wrap;
  line-height: 1.6;
  color: #2f3941;
  margin: 0;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e9ebed;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #68737d;
`;

const Modal = () => {
  const client = useClient();
  const [rule, setRule] = useState(null);

  useEffect(() => {
    // Listen for rule data from ticket sidebar
    client.on('displayRule', (data) => {
      console.log('Modal received rule data:', data);
      setRule(data);
    });
  }, [client]);

  const handleClose = () => {
    client.invoke('destroy');
  };

  if (!rule) {
    return (
      <ModalContainer>
        <LoadingState>
          <MD>Loading...</MD>
        </LoadingState>
      </ModalContainer>
    );
  }

  return (
    <ModalContainer>
      <ModalHeader>
        <XL isBold>{rule.name}</XL>
      </ModalHeader>
      <ModalBody>
        <ModalMessage>{rule.message}</ModalMessage>
      </ModalBody>
      <ModalFooter>
        <Button isPrimary onClick={handleClose}>
          Close
        </Button>
      </ModalFooter>
    </ModalContainer>
  );
};

export default Modal;