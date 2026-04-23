/**
 * Evaluate all conditions for a rule
 * All conditions must match (AND logic)
 *
 * @param {object} ticket - Ticket data from ZAF
 * @param {Array} conditions - Array of condition objects
 * @returns {boolean} - True if all conditions match
 */
export const evaluateConditions = (ticket, conditions) => {
  if (!conditions || conditions.length === 0) {
    console.log('No conditions to evaluate');
    return false;
  }

  const results = conditions.map(condition => {
    const result = evaluateCondition(ticket, condition);
    const effectiveField = condition.subField || condition.field;
    console.log(`  Condition: ${effectiveField} ${condition.operator} "${condition.value}" => ${result}`);
    return result;
  });

  return results.every(r => r === true);
};

const evaluateCondition = (ticket, condition) => {
  const { field, subField, operator, value } = condition;

  const effectiveField = subField || field;

  if (!effectiveField || !operator || value === undefined || value === '') {
    console.log('  Invalid condition - missing field, operator, or value');
    return false;
  }

  let ticketValue = getTicketFieldValue(ticket, effectiveField);

  console.log(`  Field "${effectiveField}" ticket value:`, ticketValue, `(type: ${typeof ticketValue})`);

  if (isTagField(effectiveField)) {
    return evaluateTagCondition(ticketValue, operator, value);
  }

  if (isIdField(effectiveField)) {
    const ticketId = String(ticketValue || '');
    const conditionId = String(value);

    console.log(`  ID comparison: ticket="${ticketId}" vs condition="${conditionId}"`);

    switch (operator) {
      case 'equals':
        return ticketId === conditionId;
      case 'not_equals':
        return ticketId !== conditionId;
      default:
        console.log(`  Unknown operator for ID field: ${operator}`);
        return false;
    }
  }

  if (typeof ticketValue === 'boolean') {
    const conditionBool = value === 'true' || value === true;
    switch (operator) {
      case 'equals':
        return ticketValue === conditionBool;
      case 'not_equals':
        return ticketValue !== conditionBool;
      default:
        return false;
    }
  }

  const ticketValueStr = String(ticketValue || '').toLowerCase();
  const conditionValueStr = String(value).toLowerCase();

  switch (operator) {
    case 'equals':
      return ticketValueStr === conditionValueStr;

    case 'not_equals':
      return ticketValueStr !== conditionValueStr;

    case 'contains':
      return ticketValueStr.includes(conditionValueStr);

    case 'not_contains':
      return !ticketValueStr.includes(conditionValueStr);

    case 'starts_with':
      return ticketValueStr.startsWith(conditionValueStr);

    case 'ends_with':
      return ticketValueStr.endsWith(conditionValueStr);

    default:
      return false;
  }
};

const isTagField = (field) => {
  return field === 'tags' ||
         field === 'requester.tags' ||
         field === 'organization.tags';
};

const isIdField = (field) => {
  return ['assignee', 'group', 'requester.id', 'organization.id'].includes(field);
};

const evaluateTagCondition = (ticketTags, operator, value) => {
  let tagsArray = [];
  if (Array.isArray(ticketTags)) {
    tagsArray = ticketTags.map(t => String(t).toLowerCase());
  } else if (typeof ticketTags === 'string') {
    tagsArray = ticketTags.split(',').map(t => t.trim().toLowerCase());
  }

  const conditionTags = value.split(',').map(t => t.trim().toLowerCase()).filter(t => t);

  console.log(`  Tags comparison - ticket: [${tagsArray.join(', ')}], condition: [${conditionTags.join(', ')}]`);

  if (conditionTags.length === 0) {
    return false;
  }

  switch (operator) {
    case 'contains_any':
      return conditionTags.some(tag => tagsArray.includes(tag));

    case 'contains_none':
      return !conditionTags.some(tag => tagsArray.includes(tag));

    default:
      return false;
  }
};

const getTicketFieldValue = (ticket, field) => {
  if (field.startsWith('requester.')) {
    const subField = field.replace('requester.', '');

    if (subField === 'id') {
      return ticket.requester?.id || '';
    }
    if (subField === 'name') {
      return ticket.requester?.name || '';
    }
    if (subField === 'email') {
      return ticket.requester?.email || '';
    }
    if (subField === 'tags') {
      return ticket.requester?.tags || [];
    }

    if (subField.startsWith('user_field.')) {
      const fieldKey = subField.replace('user_field.', '');
      return ticket.requester?.user_fields?.[fieldKey] || '';
    }
  }

  if (field.startsWith('organization.')) {
    const subField = field.replace('organization.', '');

    if (subField === 'id') {
      return ticket.organization?.id || '';
    }
    if (subField === 'name') {
      return ticket.organization?.name || '';
    }
    if (subField === 'tags') {
      return ticket.organization?.tags || [];
    }

    if (subField.startsWith('org_field.')) {
      const fieldKey = subField.replace('org_field.', '');
      return ticket.organization?.organization_fields?.[fieldKey] || '';
    }
  }

  if (field.startsWith('ticket_field_')) {
    const fieldId = field.replace('ticket_field_', '');
    return ticket.customField?.[`custom_field_${fieldId}`] ||
           ticket[`custom_field_${fieldId}`] ||
           '';
  }

  switch (field) {
    case 'status':
      return ticket.status;

    case 'priority':
      return ticket.priority;

    case 'type':
      return ticket.type;

    case 'tags':
      return ticket.tags || [];

    case 'subject':
      return ticket.subject;

    case 'assignee':
      return ticket.assignee?.user?.id || ticket.assignee?.id || '';

    case 'group': {
      const groupId = ticket.assignee?.group?.id || ticket.group?.id || '';
      console.log('  Getting group ID from ticket:', {
        'assignee.group.id': ticket.assignee?.group?.id,
        'group.id': ticket.group?.id,
        resolved: groupId
      });
      return groupId;
    }

    default:
      return '';
  }
};
