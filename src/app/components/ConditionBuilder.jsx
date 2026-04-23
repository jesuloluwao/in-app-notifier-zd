import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@zendeskgarden/react-buttons';
import { Field, Label, Input } from '@zendeskgarden/react-forms';
import { Field as DropdownField, Combobox, Option } from '@zendeskgarden/react-dropdowns';
import { Grid, Row, Col } from '@zendeskgarden/react-grid';
import { ConditionRow, ConditionActions, AddConditionButton } from '../styles/ConditionBuilder';
import { useClient } from '../hooks/useClient';
import debounce from 'lodash/debounce';
import styled from 'styled-components';


console.log('=== NESTED DROPDOWN VERSION LOADED ===');
// Styled components for nested dropdown
const NestedDropdownWrapper = styled.div`
  position: relative;
`;

const DropdownTrigger = styled.div`
  padding: 10px 12px;
  border: 1px solid ${props => props.$isOpen ? '#1f73b7' : '#d8dcde'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  min-height: 40px;
  font-size: 14px;
  
  &:hover {
    border-color: #1f73b7;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #d8dcde;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 350px;
  overflow-y: auto;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #e9ebed;
  font-size: 14px;
  outline: none;
  
  &:focus {
    background-color: #f8f9f9;
  }
  
  &::placeholder {
    color: #87929d;
  }
`;

const DropdownItem = styled.div`
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  ${props => props.$isSelected && `
    background-color: #e9f5fe;
    color: #1f73b7;
  `}
  
  ${props => props.$isHeader && `
    font-size: 11px;
    font-weight: 600;
    color: #68737d;
    text-transform: uppercase;
    padding: 12px 12px 6px;
    cursor: default;
    &:hover {
      background-color: transparent;
    }
  `}
`;

const ParentItem = styled.div`
  padding: 12px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const ChevronRight = styled.span`
  color: #68737d;
  font-size: 16px;
`;

const BackButton = styled.div`
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: 500;
  border-bottom: 1px solid #e9ebed;
  color: #2f3941;
  background-color: #f8f9f9;
  font-size: 14px;
  
  &:hover {
    background-color: #eef0f2;
  }
`;

const BackArrow = styled.span`
  margin-right: 8px;
  color: #68737d;
  font-size: 16px;
`;

const Placeholder = styled.span`
  color: #87929d;
`;

const FieldLabel = styled.div`
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #2f3941;
`;

const ChevronDown = styled.span`
  color: #68737d;
  font-size: 10px;
  transition: transform 0.2s;
  ${props => props.$isOpen && `transform: rotate(180deg);`}
`;

const NoResults = styled.div`
  padding: 12px;
  text-align: center;
  color: #68737d;
  font-size: 14px;
`;

// Ticket standard fields
const TICKET_STANDARD_FIELDS = [
  { value: 'status', label: 'Status', category: 'ticket' },
  { value: 'priority', label: 'Priority', category: 'ticket' },
  { value: 'type', label: 'Type', category: 'ticket' },
  { value: 'tags', label: 'Tags', category: 'ticket' },
  { value: 'subject', label: 'Subject', category: 'ticket' },
  { value: 'assignee', label: 'Assignee', category: 'ticket' },
  { value: 'group', label: 'Group', category: 'ticket' }
];

// Requester standard fields
const REQUESTER_STANDARD_FIELDS = [
  { value: 'requester.id', label: 'Requester', category: 'requester' },
  { value: 'requester.name', label: 'Name', category: 'requester' },
  { value: 'requester.email', label: 'Email', category: 'requester' },
  { value: 'requester.tags', label: 'Tags', category: 'requester' }
];

// Organization standard fields
const ORGANIZATION_STANDARD_FIELDS = [
  { value: 'organization.id', label: 'Organization', category: 'organization' },
  { value: 'organization.name', label: 'Name', category: 'organization' },
  { value: 'organization.tags', label: 'Tags', category: 'organization' }
];

const STANDARD_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' }
];

const TAG_OPERATORS = [
  { value: 'contains_any', label: 'Contains at least one of the following' },
  { value: 'contains_none', label: 'Contains none of the following' }
];

const BOOLEAN_OPERATORS = [
  { value: 'equals', label: 'Equals' }
];

const ID_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' }
];

const SEARCHABLE_VALUE_FIELDS = ['assignee', 'group', 'requester.id', 'organization.id'];

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'hold', label: 'Hold' },
  { value: 'solved', label: 'Solved' },
  { value: 'closed', label: 'Closed' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const TYPE_OPTIONS = [
  { value: 'question', label: 'Question' },
  { value: 'incident', label: 'Incident' },
  { value: 'problem', label: 'Problem' },
  { value: 'task', label: 'Task' }
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' }
];

export const ConditionBuilder = ({ conditions, onChange }) => {
  const client = useClient();
  const [ticketCustomFields, setTicketCustomFields] = useState([]);
  const [userFields, setUserFields] = useState([]);
  const [organizationFields, setOrganizationFields] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  
  // Dropdown state: null = closed, or { index, view: 'main' | 'ticket' | 'requester' | 'organization' }
  const [dropdownState, setDropdownState] = useState(null);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    loadTicketCustomFields();
    loadUserFields();
    loadOrganizationFields();
    loadGroups();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownState(null);
        setFieldSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownState && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [dropdownState]);

  const loadTicketCustomFields = async () => {
    try {
      const response = await client.request({
        url: '/api/v2/ticket_fields.json',
        type: 'GET'
      });
      const custom = response.ticket_fields
        .filter(f => !f.system_field_options && f.type !== 'tickettype' && f.type !== 'priority' && f.type !== 'status')
        .filter(f => f.active)
        .map(f => ({
          value: `ticket_field_${f.id}`,
          label: f.title || f.raw_title,
          category: 'ticket',
          fieldType: f.type,
          customFieldOptions: f.custom_field_options || []
        }));
      setTicketCustomFields(custom);
    } catch (error) {
      console.error('Failed to load ticket custom fields:', error);
    }
  };

  const loadUserFields = async () => {
    try {
      const response = await client.request({
        url: '/api/v2/user_fields.json',
        type: 'GET'
      });
      const fields = response.user_fields
        .filter(f => f.active)
        .map(f => ({
          value: `requester.user_field.${f.key}`,
          label: f.title || f.raw_title,
          category: 'requester',
          fieldType: f.type,
          customFieldOptions: f.custom_field_options || []
        }));
      setUserFields(fields);
    } catch (error) {
      console.error('Failed to load user fields:', error);
    }
  };

  const loadOrganizationFields = async () => {
    try {
      const response = await client.request({
        url: '/api/v2/organization_fields.json',
        type: 'GET'
      });
      const fields = response.organization_fields
        .filter(f => f.active)
        .map(f => ({
          value: `organization.org_field.${f.key}`,
          label: f.title || f.raw_title,
          category: 'organization',
          fieldType: f.type,
          customFieldOptions: f.custom_field_options || []
        }));
      setOrganizationFields(fields);
    } catch (error) {
      console.error('Failed to load organization fields:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await client.request({
        url: '/api/v2/groups.json',
        type: 'GET'
      });
      setGroups(response.groups.map(g => ({
        value: g.id.toString(),
        label: g.name
      })));
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const getAllFields = () => {
    return [
      ...TICKET_STANDARD_FIELDS,
      ...ticketCustomFields,
      ...REQUESTER_STANDARD_FIELDS,
      ...userFields,
      ...ORGANIZATION_STANDARD_FIELDS,
      ...organizationFields
    ];
  };

  const getFieldConfig = (fieldValue) => {
    return getAllFields().find(f => f.value === fieldValue);
  };

  const getFieldDisplayLabel = (fieldValue) => {
    if (!fieldValue) return '';
    
    const field = getFieldConfig(fieldValue);
    if (!field) return fieldValue;
    
    // Show category > field format
    if (field.category === 'ticket') {
      return `Ticket › ${field.label}`;
    }
    if (field.category === 'requester') {
      return `Requester › ${field.label}`;
    }
    if (field.category === 'organization') {
      return `Organization › ${field.label}`;
    }
    return field.label;
  };

  const getOperatorOptions = (field) => {
    if (!field) return STANDARD_OPERATORS;

    if (isTagField(field)) return TAG_OPERATORS;
    if (SEARCHABLE_VALUE_FIELDS.includes(field)) return ID_OPERATORS;

    const fieldConfig = getFieldConfig(field);
    if (fieldConfig?.fieldType === 'checkbox') return BOOLEAN_OPERATORS;

    return STANDARD_OPERATORS;
  };

  const isTagField = (field) => {
    return field === 'tags' || field === 'requester.tags' || field === 'organization.tags';
  };

  const isSearchableValueField = (field) => {
    return SEARCHABLE_VALUE_FIELDS.includes(field);
  };

  const getValueOptions = (field) => {
    if (field === 'status') return STATUS_OPTIONS;
    if (field === 'priority') return PRIORITY_OPTIONS;
    if (field === 'type') return TYPE_OPTIONS;

    const fieldConfig = getFieldConfig(field);
    if (fieldConfig?.fieldType === 'checkbox') return BOOLEAN_OPTIONS;
    if (fieldConfig?.customFieldOptions?.length > 0) {
      return fieldConfig.customFieldOptions.map(opt => ({
        value: opt.value,
        label: opt.name
      }));
    }
    
    return null;
  };

  const hasDropdownValues = (field) => {
    if (['status', 'priority', 'type'].includes(field)) return true;
    const fieldConfig = getFieldConfig(field);
    return fieldConfig?.fieldType === 'checkbox' ||
           fieldConfig?.fieldType === 'dropdown' ||
           fieldConfig?.fieldType === 'tagger' ||
           (fieldConfig?.customFieldOptions?.length > 0);
  };


  const searchAgents = async (query) => {
    const response = await client.request({
      url: `/api/v2/users/search.json?query=${encodeURIComponent(query)}&role[]=agent&role[]=admin`,
      type: 'GET'
    });
    return response.users.map(u => ({
      value: u.id.toString(),
      label: u.name,
      email: u.email
    }));
  };

  const searchUsers = async (query) => {
    const response = await client.request({
      url: `/api/v2/users/search.json?query=${encodeURIComponent(query)}`,
      type: 'GET'
    });
    return response.users.map(u => ({
      value: u.id.toString(),
      label: u.name,
      email: u.email
    }));
  };

  const searchOrganizations = async (query) => {
    const response = await client.request({
      url: `/api/v2/organizations/autocomplete.json?name=${encodeURIComponent(query)}`,
      type: 'GET'
    });
    return response.organizations.map(o => ({
      value: o.id.toString(),
      label: o.name
    }));
  };

  const debouncedSearch = useCallback(
    debounce(async (field, query, index) => {
      if (!query || query.length < 2) {
        setSearchResults(prev => ({ ...prev, [index]: [] }));
        setIsSearching(prev => ({ ...prev, [index]: false }));
        return;
      }

      setIsSearching(prev => ({ ...prev, [index]: true }));

      try {
        let results = [];
        if (field === 'assignee') {
          results = await searchAgents(query);
        } else if (field === 'requester.id') {
          results = await searchUsers(query);
        } else if (field === 'organization.id') {
          results = await searchOrganizations(query);
        } else if (field === 'group') {
          results = groups.filter(g => 
            g.label.toLowerCase().includes(query.toLowerCase())
          );
        }
        setSearchResults(prev => ({ ...prev, [index]: results }));
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults(prev => ({ ...prev, [index]: [] }));
      }

      setIsSearching(prev => ({ ...prev, [index]: false }));
    }, 300),
    [groups]
  );

  const handleAddCondition = () => {
    onChange([
      ...conditions,
      { field: '', operator: '', value: '', valueLabel: '' }
    ]);
  };

  const handleRemoveCondition = (index) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleSelectField = (index, fieldValue) => {
    const updated = [...conditions];
    updated[index] = { 
      ...updated[index], 
      field: fieldValue,
      operator: '',
      value: '',
      valueLabel: ''
    };
    
    // Set default operator for tag fields
    if (isTagField(fieldValue)) {
      updated[index].operator = 'contains_any';
    }
    
    onChange(updated);
    setDropdownState(null);
    setFieldSearchQuery('');
  };

  const handleUpdateCondition = (index, key, value, extraData = {}) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [key]: value, ...extraData };
    
    if (key === 'operator') {
      updated[index].value = '';
      updated[index].valueLabel = '';
    }
    
    onChange(updated);
  };

  const getOperatorLabel = (field, operatorValue) => {
    const operators = getOperatorOptions(field);
    const option = operators.find(opt => opt.value === operatorValue);
    return option ? option.label : operatorValue;
  };

  const toggleDropdown = (index) => {
    if (dropdownState?.index === index) {
      setDropdownState(null);
      setFieldSearchQuery('');
    } else {
      setDropdownState({ index, view: 'main' });
      setFieldSearchQuery('');
    }
  };

  const navigateToSubmenu = (index, category) => {
    setDropdownState({ index, view: category });
    setFieldSearchQuery('');
  };

  const navigateBack = (index) => {
    setDropdownState({ index, view: 'main' });
    setFieldSearchQuery('');
  };

  // Filter fields based on search query
  const filterFields = (fields, query) => {
    if (!query) return fields;
    const lowerQuery = query.toLowerCase();
    return fields.filter(f => f.label.toLowerCase().includes(lowerQuery));
  };

  // Custom nested dropdown for field selection
  const renderFieldDropdown = (condition, index) => {
    const isOpen = dropdownState?.index === index;
    const currentView = dropdownState?.view || 'main';
    
    // Get filtered fields for current view
    const getFilteredTicketFields = () => {
      const standard = filterFields(TICKET_STANDARD_FIELDS, fieldSearchQuery);
      const custom = filterFields(ticketCustomFields, fieldSearchQuery);
      return { standard, custom };
    };

    const getFilteredRequesterFields = () => {
      const standard = filterFields(REQUESTER_STANDARD_FIELDS, fieldSearchQuery);
      const custom = filterFields(userFields, fieldSearchQuery);
      return { standard, custom };
    };

    const getFilteredOrganizationFields = () => {
      const standard = filterFields(ORGANIZATION_STANDARD_FIELDS, fieldSearchQuery);
      const custom = filterFields(organizationFields, fieldSearchQuery);
      return { standard, custom };
    };

    console.log('renderFieldDropdown called:', { index, isOpen, currentView });
    
    return (
      <NestedDropdownWrapper ref={dropdownRef}>
        <FieldLabel>Field</FieldLabel>
        <DropdownTrigger 
          onClick={() => toggleDropdown(index)}
          $isOpen={isOpen}
        >
          {condition.field ? (
            <span>{getFieldDisplayLabel(condition.field)}</span>
          ) : (
            <Placeholder>Select field...</Placeholder>
          )}
          <ChevronDown $isOpen={isOpen}>▼</ChevronDown>
        </DropdownTrigger>
        
        {isOpen && (
          <DropdownMenu>
            {/* Main view - shows top level categories */}
            {currentView === 'main' && (
              <>
                <ParentItem onClick={() => navigateToSubmenu(index, 'ticket')}>
                  <span>Ticket</span>
                  <ChevronRight>›</ChevronRight>
                </ParentItem>
                <ParentItem onClick={() => navigateToSubmenu(index, 'requester')}>
                  <span>Requester</span>
                  <ChevronRight>›</ChevronRight>
                </ParentItem>
                <ParentItem onClick={() => navigateToSubmenu(index, 'organization')}>
                  <span>Organization</span>
                  <ChevronRight>›</ChevronRight>
                </ParentItem>
              </>
            )}
            
            {/* Ticket submenu */}
            {currentView === 'ticket' && (
              <>
                <BackButton onClick={() => navigateBack(index)}>
                  <BackArrow>‹</BackArrow>
                  <span>Ticket</span>
                </BackButton>
                
                <SearchInput
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search fields..."
                  value={fieldSearchQuery}
                  onChange={(e) => setFieldSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                
                {(() => {
                  const { standard, custom } = getFilteredTicketFields();
                  const hasResults = standard.length > 0 || custom.length > 0;
                  
                  if (!hasResults) {
                    return <NoResults>No fields found</NoResults>;
                  }
                  
                  return (
                    <>
                      {standard.length > 0 && (
                        <>
                          <DropdownItem $isHeader>Standard Fields</DropdownItem>
                          {standard.map(field => (
                            <DropdownItem
                              key={field.value}
                              $isSelected={condition.field === field.value}
                              onClick={() => handleSelectField(index, field.value)}
                            >
                              {field.label}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                      
                      {custom.length > 0 && (
                        <>
                          <DropdownItem $isHeader>Custom Fields</DropdownItem>
                          {custom.map(field => (
                            <DropdownItem
                              key={field.value}
                              $isSelected={condition.field === field.value}
                              onClick={() => handleSelectField(index, field.value)}
                            >
                              {field.label}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            
            {/* Requester submenu */}
            {currentView === 'requester' && (
              <>
                <BackButton onClick={() => navigateBack(index)}>
                  <BackArrow>‹</BackArrow>
                  <span>Requester</span>
                </BackButton>
                
                <SearchInput
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search fields..."
                  value={fieldSearchQuery}
                  onChange={(e) => setFieldSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                
                {(() => {
                  const { standard, custom } = getFilteredRequesterFields();
                  const hasResults = standard.length > 0 || custom.length > 0;
                  
                  if (!hasResults) {
                    return <NoResults>No fields found</NoResults>;
                  }
                  
                  return (
                    <>
                      {standard.length > 0 && (
                        <>
                          <DropdownItem $isHeader>Standard Fields</DropdownItem>
                          {standard.map(field => (
                            <DropdownItem
                              key={field.value}
                              $isSelected={condition.field === field.value}
                              onClick={() => handleSelectField(index, field.value)}
                            >
                              {field.label}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                      
                      {custom.length > 0 && (
                        <>
                          <DropdownItem $isHeader>Custom Fields</DropdownItem>
                          {custom.map(field => (
                            <DropdownItem
                              key={field.value}
                              $isSelected={condition.field === field.value}
                              onClick={() => handleSelectField(index, field.value)}
                            >
                              {field.label}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            
            {/* Organization submenu */}
            {currentView === 'organization' && (
              <>
                <BackButton onClick={() => navigateBack(index)}>
                  <BackArrow>‹</BackArrow>
                  <span>Organization</span>
                </BackButton>
                
                <SearchInput
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search fields..."
                  value={fieldSearchQuery}
                  onChange={(e) => setFieldSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                
                {(() => {
                  const { standard, custom } = getFilteredOrganizationFields();
                  const hasResults = standard.length > 0 || custom.length > 0;
                  
                  if (!hasResults) {
                    return <NoResults>No fields found</NoResults>;
                  }
                  
                  return (
                    <>
                      {standard.length > 0 && (
                        <>
                          <DropdownItem $isHeader>Standard Fields</DropdownItem>
                          {standard.map(field => (
                            <DropdownItem
                              key={field.value}
                              $isSelected={condition.field === field.value}
                              onClick={() => handleSelectField(index, field.value)}
                            >
                              {field.label}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                      
                      {custom.length > 0 && (
                        <>
                          <DropdownItem $isHeader>Custom Fields</DropdownItem>
                          {custom.map(field => (
                            <DropdownItem
                              key={field.value}
                              $isSelected={condition.field === field.value}
                              onClick={() => handleSelectField(index, field.value)}
                            >
                              {field.label}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}

          </DropdownMenu>
        )}
      </NestedDropdownWrapper>
    );
  };

  const renderValueInput = (condition, index) => {
    const { field, operator, value, valueLabel } = condition;
    
    if (!field || !operator) {
      return (
        <Field>
          <Label>Value</Label>
          <Input disabled placeholder="Select field and operator first" />
        </Field>
      );
    }

    if (isSearchableValueField(field)) {
      const results = searchResults[index] || [];
      const searching = isSearching[index] || false;

      if (field === 'group') {
        return (
          <DropdownField>
            <DropdownField.Label>Value</DropdownField.Label>
            <Combobox
              inputValue={valueLabel || ''}
              selectionValue={value}
              isAutocomplete
              placeholder="Search groups..."
              onChange={(changes) => {
                if (changes.inputValue !== undefined) {
                  handleUpdateCondition(index, 'valueLabel', changes.inputValue);
                  debouncedSearch(field, changes.inputValue, index);
                }
                if (changes.selectionValue !== undefined) {
                  const selected = groups.find(g => g.value === changes.selectionValue);
                  handleUpdateCondition(index, 'value', changes.selectionValue, {
                    valueLabel: selected?.label || changes.selectionValue
                  });
                }
              }}
            >
              {results.length > 0 ? (
                results.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))
              ) : (
                <Option isDisabled>
                  {searching ? 'Searching...' : 'Type to search...'}
                </Option>
              )}
            </Combobox>
          </DropdownField>
        );
      }

      const placeholder = field === 'assignee' ? 'Search agents...' :
                          field === 'requester.id' ? 'Search users...' :
                          'Search organizations...';

      return (
        <DropdownField>
          <DropdownField.Label>Value</DropdownField.Label>
          <Combobox
            inputValue={valueLabel || ''}
            selectionValue={value}
            isAutocomplete
            placeholder={placeholder}
            onChange={(changes) => {
              if (changes.inputValue !== undefined) {
                handleUpdateCondition(index, 'valueLabel', changes.inputValue);
                debouncedSearch(field, changes.inputValue, index);
              }
              if (changes.selectionValue !== undefined) {
                const selected = results.find(r => r.value === changes.selectionValue);
                handleUpdateCondition(index, 'value', changes.selectionValue, {
                  valueLabel: selected?.label || changes.selectionValue
                });
              }
            }}
          >
            {results.length > 0 ? (
              results.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label} {option.email ? `(${option.email})` : ''}
                </Option>
              ))
            ) : (
              <Option isDisabled>
                {searching ? 'Searching...' : 'Type at least 2 characters...'}
              </Option>
            )}
          </Combobox>
        </DropdownField>
      );
    }

    // Dropdown value fields
    if (hasDropdownValues(field)) {
      const valueOptions = getValueOptions(field);
      return (
        <DropdownField>
          <DropdownField.Label>Value</DropdownField.Label>
          <Combobox
            inputValue={valueLabel || ''}
            selectionValue={value}
            isAutocomplete
            placeholder="Select value..."
            onChange={(changes) => {
              if (changes.inputValue !== undefined) {
                handleUpdateCondition(index, 'valueLabel', changes.inputValue);
              }
              if (changes.selectionValue !== undefined) {
                const selected = valueOptions?.find(v => v.value === changes.selectionValue);
                handleUpdateCondition(index, 'value', changes.selectionValue, {
                  valueLabel: selected?.label || changes.selectionValue
                });
              }
            }}
          >
            {valueOptions?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Combobox>
        </DropdownField>
      );
    }

    const placeholder = isTagField(field)
      ? 'tag1, tag2, tag3'
      : 'Enter value';

    return (
      <Field>
        <Label>Value</Label>
        <Input
          value={value}
          onChange={(e) => handleUpdateCondition(index, 'value', e.target.value, {
            valueLabel: e.target.value
          })}
          placeholder={placeholder}
        />
      </Field>
    );
  };

  return (
    <div>
      {conditions.map((condition, index) => {
        const operatorOptions = getOperatorOptions(condition.field);
        
        return (
          <ConditionRow key={index}>
            <Grid>
              <Row>
                <Col xs={12} md={4} style={{ marginBottom: '8px' }}>
                  {renderFieldDropdown(condition, index)}
                </Col>
                <Col xs={12} md={4} style={{ marginBottom: '8px' }}>
                  <DropdownField>
                    <DropdownField.Label>Operator</DropdownField.Label>
                    <Combobox
                      inputValue={condition.operator ? getOperatorLabel(condition.field, condition.operator) : ''}
                      selectionValue={condition.operator}
                      isEditable={false}
                      disabled={!condition.field}
                      placeholder="Select operator..."
                      onChange={(changes) => {
                        if (changes.selectionValue !== undefined) {
                          handleUpdateCondition(index, 'operator', changes.selectionValue);
                        }
                      }}
                    >
                      {operatorOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Combobox>
                  </DropdownField>
                </Col>
                <Col xs={12} md={4} style={{ marginBottom: '8px' }}>
                  {renderValueInput(condition, index)}
                </Col>
              </Row>
            </Grid>
            <ConditionActions>
              <Button size="small" isDanger onClick={() => handleRemoveCondition(index)}>
                Remove
              </Button>
            </ConditionActions>
          </ConditionRow>
        );
      })}
      
      <AddConditionButton>
        <Button onClick={handleAddCondition}>
          Add Condition
        </Button>
      </AddConditionButton>
    </div>
  );
};