import React from 'react';
import { Button } from '@zendeskgarden/react-buttons';
import { Toggle, Field, Label } from '@zendeskgarden/react-forms';
import { Tag } from '@zendeskgarden/react-tags';
import { RuleCard, RuleHeader, RuleContent, RuleActions, EmptyState, PriorityBadge, AddRuleButton } from '../styles/RuleList';
import styled from 'styled-components';

const TriggerTag = styled(Tag)`
  margin-left: 8px;
`;

const getTriggerLabel = (triggerType) => {
  switch (triggerType) {
    case 'ticket_opened':
      return 'On Open';
    case 'new_ticket_requester':
      return 'New + Requester';
    case 'new_ticket_assignment':
      return 'New + Assignment';
    default:
      return 'On Open';
  }
};

const getTriggerColor = (triggerType) => {
  switch (triggerType) {
    case 'ticket_opened':
      return 'blue';
    case 'new_ticket_requester':
      return 'green';
    case 'new_ticket_assignment':
      return 'orange';
    default:
      return 'blue';
  }
};

export const RuleList = ({ rules, onAdd, onEdit, onDelete, onToggle, onMove }) => {
  if (rules.length === 0) {
    return (
      <div>
        <AddRuleButton>
          <Button isPrimary onClick={onAdd}>Add New Rule</Button>
        </AddRuleButton>
        <EmptyState>
          <h3>No rules configured</h3>
          <p>Create your first rule to start triggering modals based on ticket conditions</p>
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <AddRuleButton>
        <Button isPrimary onClick={onAdd}>Add New Rule</Button>
      </AddRuleButton>
      
      {rules.map((rule, index) => (
        <RuleCard key={rule.id} enabled={rule.enabled}>
          <RuleHeader>
            <div>
              <PriorityBadge>Priority {rule.priority + 1}</PriorityBadge>
              <TriggerTag size="small" hue={getTriggerColor(rule.triggerType)}>
                {getTriggerLabel(rule.triggerType)}
              </TriggerTag>
              <h3>{rule.name || 'Untitled Rule'}</h3>
            </div>
            <Field>
              <Toggle
                checked={rule.enabled}
                onChange={() => onToggle(rule.id)}
              >
                <Label hidden>Enable rule</Label>
              </Toggle>
            </Field>
          </RuleHeader>
          
          <RuleContent>
            <div>
              <strong>Conditions:</strong>
              {rule.conditions.length === 0 ? (
                <span> No conditions set</span>
              ) : (
                <ul>
                  {rule.conditions.map((condition, idx) => (
                    <li key={idx}>
                      {condition.field} {condition.operator} {condition.valueLabel || condition.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </RuleContent>

          <RuleActions>
            <Button size="small" onClick={() => onEdit(rule)}>Edit</Button>
            <Button size="small" onClick={() => onMove(rule.id, 'up')} disabled={index === 0}>
              Move Up
            </Button>
            <Button size="small" onClick={() => onMove(rule.id, 'down')} disabled={index === rules.length - 1}>
              Move Down
            </Button>
            <Button size="small" isDanger onClick={() => onDelete(rule.id)}>Delete</Button>
          </RuleActions>
        </RuleCard>
      ))}
    </div>
  );
};