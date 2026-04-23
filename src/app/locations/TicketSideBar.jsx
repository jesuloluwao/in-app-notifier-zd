import { useEffect, useRef, useState } from 'react';
import { useClient } from '../hooks/useClient';
import { customObjectStorage } from '../utils/customObjectStorage';
import { evaluateConditions } from '../utils/conditionEvaluator';

const TicketSideBar = () => {
  const client = useClient();
  const [evaluated, setEvaluated] = useState(false);
  const rulesRef = useRef([]);

  useEffect(() => {
    if (!evaluated) {
      initializeSidebar();
    }
  }, [client, evaluated]);

  const initializeSidebar = async () => {
    console.log('=== TicketSideBar initialized (existing ticket) ===');
    
    client.invoke('resize', { width: '100%', height: '0px' });
    
    const result = await customObjectStorage.loadAllRules(client);
    if (result.success) {
      rulesRef.current = result.rules || [];
      console.log('Loaded rules:', rulesRef.current);
    } else {
      console.error('Failed to load rules:', result.error);
      return;
    }
    
    await evaluateRules();
    setEvaluated(true);
  };

  const evaluateRules = async () => {
    try {
      console.log('=== Evaluating rules for: ticket_opened ===');

      const ticketData = await client.get('ticket');
      const ticket = ticketData.ticket;
      console.log('Base ticket data:', ticket);

      // Fetch full requester details including user_fields, tags, etc.
      if (ticket.requester?.id) {
        try {
          const userResponse = await client.request({
            url: `/api/v2/users/${ticket.requester.id}.json`,
            type: 'GET'
          });
          const user = userResponse.user;
          ticket.requester = {
            ...ticket.requester,
            name: user.name,
            email: user.email,
            tags: user.tags || [],
            user_fields: user.user_fields || {}
          };
          console.log('Requester details:', ticket.requester);
        } catch (err) {
          console.log('Could not fetch requester details:', err);
        }
      }

      // Fetch full organization details including organization_fields, tags, etc.
      if (ticket.organization?.id) {
        try {
          const orgResponse = await client.request({
            url: `/api/v2/organizations/${ticket.organization.id}.json`,
            type: 'GET'
          });
          const org = orgResponse.organization;
          ticket.organization = {
            ...ticket.organization,
            name: org.name,
            tags: org.tags || [],
            organization_fields: org.organization_fields || {}
          };
          console.log('Organization details:', ticket.organization);
        } catch (err) {
          console.log('Could not fetch organization details:', err);
        }
      }

      const rules = rulesRef.current;
      if (!rules || rules.length === 0) {
        console.log('No rules loaded');
        return;
      }

      const eligibleRules = rules
        .filter(rule => {
          if (!rule.enabled) return false;
          const triggerType = rule.triggerType || 'ticket_opened';
          return triggerType === 'ticket_opened';
        })
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));

      console.log('Eligible rules:', eligibleRules.map(r => r.name));

      for (const rule of eligibleRules) {
        console.log(`Evaluating: "${rule.name}"`);

        const matches = evaluateConditions(ticket, rule.conditions);
        console.log(`Matches: ${matches}`);

        if (matches) {
          console.log(`✅ Opening modal for: "${rule.name}"`);
          
          const encodedTitle = encodeURIComponent(rule.name);
          const encodedMessage = encodeURIComponent(rule.message);
          const base = import.meta.env.VITE_ZENDESK_LOCATION;
          const modalBase = base.endsWith('index.html')
            ? base.replace(/index\.html$/, '')
            : base;

          const modalUrl = `${modalBase}modal.html?title=${encodedTitle}&message=${encodedMessage}`;
          
          await client.invoke('instances.create', {
            location: 'modal',
            url: modalUrl,
            size: { width: '550px', height: '400px' }
          });
          
          return;
        }
      }

      console.log('No matching rules');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return null;
};

export default TicketSideBar;