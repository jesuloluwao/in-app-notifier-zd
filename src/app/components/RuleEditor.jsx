import React, { useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@zendeskgarden/react-buttons';
import { Field, Input, Label, Radio, Message } from '@zendeskgarden/react-forms';
import { Alert } from '@zendeskgarden/react-notifications';
import { ConditionBuilder } from './ConditionBuilder';
import { EditorContainer, EditorHeader, EditorTitle, EditorForm, EditorActions } from '../styles/RuleEditor';
import styled from 'styled-components';

const EditorWrapper = styled.div`
  .quill {
    border-radius: 4px;
  }
  
  .ql-container {
    min-height: 150px;
    font-size: 14px;
    font-family: inherit;
  }
  
  .ql-editor {
    min-height: 150px;
  }
  
  .ql-toolbar {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    background-color: #f8f9f9;
  }
  
  .ql-container {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #2f3941;
`;

const TriggerSection = styled.div`
  margin-bottom: 16px;
`;

const TriggerOption = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid ${props => props.selected ? '#1f73b7' : '#d8dcde'};
  border-radius: 4px;
  background-color: ${props => props.selected ? '#f5f9fc' : '#fff'};
  cursor: pointer;
  
  &:hover {
    border-color: #1f73b7;
  }
`;

const TriggerContent = styled.div`
  margin-left: 12px;
`;

const TriggerTitle = styled.div`
  font-weight: 500;
  color: #2f3941;
  margin-bottom: 4px;
`;

const TriggerDescription = styled.div`
  font-size: 12px;
  color: #68737d;
`;

const TRIGGER_TYPES = [
  {
    value: 'ticket_opened',
    title: 'When ticket is opened',
    description: 'Modal appears when an agent opens an existing ticket that matches the conditions'
  },
  {
    value: 'new_ticket_requester',
    title: 'New ticket - Requester is set',
    description: 'Modal appears on new ticket page when requester is selected and conditions match'
  },
  {
    value: 'new_ticket_assignment',
    title: 'New ticket - Assignee/Group is set',
    description: 'Modal appears on new ticket page when assignee or group is selected and conditions match'
  }
];

export const RuleEditor = ({ client, rule, onSave, onCancel, onPreview }) => {
  const [name, setName] = useState(rule.name);
  const [conditions, setConditions] = useState(rule.conditions);
  const [message, setMessage] = useState(rule.message);
  const [triggerType, setTriggerType] = useState(rule.triggerType || 'ticket_opened');
  const [error, setError] = useState(null);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link'
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (conditions.length === 0) {
      setError('At least one condition is required');
      return;
    }
    const strippedMessage = message.replace(/<[^>]*>/g, '').trim();
    if (!strippedMessage) {
      setError('Message is required');
      return;
    }

    try {
      await onSave({
        ...rule,
        name,
        conditions,
        message,
        triggerType
      });
    } catch (err) {
      setError('Failed to save rule: ' + err.message);
    }
  };

  const handlePreview = () => {
    onPreview({
      ...rule,
      name,
      conditions,
      message,
      triggerType
    });
  };

  return (
    <EditorContainer>
      <EditorHeader>
        <EditorTitle>{rule.id ? 'Edit Rule' : 'New Rule'}</EditorTitle>
      </EditorHeader>

      {error && (
        <Alert type="error" style={{ margin: '0 20px 16px 20px', flexShrink: 0 }}>
          <Alert.Title>Validation Error</Alert.Title>
          <Alert.Paragraph>{error}</Alert.Paragraph>
          <Alert.Close aria-label="Dismiss error" onClick={() => setError(null)} />
        </Alert>
      )}

      <EditorForm>
        <Field>
          <Label>Rule Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter rule name"
          />
        </Field>

        <TriggerSection>
          <FieldLabel>Trigger Type</FieldLabel>
          {TRIGGER_TYPES.map((trigger) => (
            <TriggerOption
              key={trigger.value}
              selected={triggerType === trigger.value}
              onClick={() => setTriggerType(trigger.value)}
            >
              <Radio
                checked={triggerType === trigger.value}
                onChange={() => setTriggerType(trigger.value)}
              >
                <Label hidden>{trigger.title}</Label>
              </Radio>
              <TriggerContent>
                <TriggerTitle>{trigger.title}</TriggerTitle>
                <TriggerDescription>{trigger.description}</TriggerDescription>
              </TriggerContent>
            </TriggerOption>
          ))}
        </TriggerSection>

        <ConditionBuilder
          client={client}
          conditions={conditions}
          onChange={setConditions}
        />

        <div>
          <FieldLabel>Modal Message</FieldLabel>
          <EditorWrapper>
            <ReactQuill
              theme="snow"
              value={message}
              onChange={setMessage}
              modules={modules}
              formats={formats}
              placeholder="Enter the message to display in the modal..."
            />
          </EditorWrapper>
        </div>
      </EditorForm>

      <EditorActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handlePreview}>Preview</Button>
        <Button isPrimary onClick={handleSave}>Save Rule</Button>
      </EditorActions>
    </EditorContainer>
  );
};