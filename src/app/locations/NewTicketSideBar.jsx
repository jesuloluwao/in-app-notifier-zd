import { useEffect, useRef } from 'react';
import { useClient } from '../hooks/useClient';
import { customObjectStorage } from '../utils/customObjectStorage';
import { evaluateConditions } from '../utils/conditionEvaluator';

const NewTicketSideBar = () => {
  const client = useClient();
  const rulesRef = useRef([]);
  const initializedRef = useRef(false);
  
  // Track the previous evaluation result for each rule (keyed by rule.id + triggerType)
  // This allows separate tracking for different trigger types
  const previousMatchStateRef = useRef(new Map());

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeSidebar();
    }
  }, [client]);

  const initializeSidebar = async () => {
    console.log('=== NewTicketSideBar initialized ===');
    
    client.invoke('resize', { width: '100%', height: '0px' });
    
    const result = await customObjectStorage.loadAllRules(client);
    if (result.success) {
      rulesRef.current = result.rules || [];
      console.log('Loaded rules:', rulesRef.current);
    } else {
      console.error('Failed to load rules:', result.error);
      return;
    }
    
    setupFieldListeners();
  };

  const setupFieldListeners = () => {
    console.log('Setting up field listeners...');

    // ==========================================
    // REQUESTER TRIGGER LISTENERS
    // ==========================================
    client.on('ticket.requester.id.changed', async () => {
      console.log('>>> Requester ID changed');
      // Small delay to ensure data is available
      setTimeout(() => evaluateRules('new_ticket_requester'), 100);
    });

    client.on('ticket.requester.email.changed', async () => {
      console.log('>>> Requester email changed');
      setTimeout(() => evaluateRules('new_ticket_requester'), 100);
    });

    // ==========================================
    // ASSIGNEE/GROUP TRIGGER LISTENERS
    // ==========================================
    client.on('ticket.assignee.user.id.changed', async () => {
      console.log('>>> Assignee user ID changed');
      // Small delay to ensure data is available
      setTimeout(() => evaluateRules('new_ticket_assignment'), 100);
    });

    client.on('ticket.assignee.group.id.changed', async () => {
      console.log('>>> Group ID changed');
      // Small delay to ensure data is available
      setTimeout(() => evaluateRules('new_ticket_assignment'), 100);
    });

    // ==========================================
    // OTHER FIELD CHANGES (can affect conditions)
    // ==========================================
    client.on('ticket.tags.changed', async () => {
      console.log('>>> Tags changed');
      setTimeout(() => {
        evaluateRules('new_ticket_requester');
        evaluateRules('new_ticket_assignment');
      }, 100);
    });

    client.on('ticket.priority.changed', async () => {
      console.log('>>> Priority changed');
      setTimeout(() => {
        evaluateRules('new_ticket_requester');
        evaluateRules('new_ticket_assignment');
      }, 100);
    });

    client.on('ticket.type.changed', async () => {
      console.log('>>> Type changed');
      setTimeout(() => {
        evaluateRules('new_ticket_requester');
        evaluateRules('new_ticket_assignment');
      }, 100);
    });

    client.on('ticket.organization.id.changed', async () => {
      console.log('>>> Organization changed');
      setTimeout(() => {
        evaluateRules('new_ticket_requester');
        evaluateRules('new_ticket_assignment');
      }, 100);
    });
  };

  const getTicketData = async () => {
    try {
      const data = await client.get([
        'ticket.status',
        'ticket.priority',
        'ticket.type',
        'ticket.subject',
        'ticket.tags',
        'ticket.requester',
        'ticket.requester.id',
        'ticket.requester.email',
        'ticket.assignee',
        'ticket.assignee.user',
        'ticket.assignee.user.id',
        'ticket.assignee.group',
        'ticket.assignee.group.id',
        'ticket.organization',
        'ticket.organization.id'
      ]);

      console.log('Raw ticket data:', data);

      const requesterId = data['ticket.requester.id'] || data['ticket.requester']?.id;
      const organizationId = data['ticket.organization.id'] || data['ticket.organization']?.id;
      
      // Get assignee and group IDs - handle various formats
      const assigneeUserId = data['ticket.assignee.user.id'] 
        || data['ticket.assignee.user']?.id 
        || data['ticket.assignee']?.user?.id;
      
      const assigneeGroupId = data['ticket.assignee.group.id'] 
        || data['ticket.assignee.group']?.id 
        || data['ticket.assignee']?.group?.id;

      console.log('Parsed IDs:', { requesterId, organizationId, assigneeUserId, assigneeGroupId });

      const ticket = {
        status: data['ticket.status'] || 'new',
        priority: data['ticket.priority'],
        type: data['ticket.type'],
        subject: data['ticket.subject'],
        tags: data['ticket.tags'] || [],
        requester: {
          id: requesterId,
          email: data['ticket.requester']?.email || data['ticket.requester.email']
        },
        assignee: {
          user: { id: assigneeUserId },
          group: { id: assigneeGroupId }
        },
        // Also store group at top level for easier access
        group: { id: assigneeGroupId },
        organization: {
          id: organizationId
        }
      };

      // Fetch full requester details including user_fields, tags, etc.
      if (requesterId) {
        try {
          const userResponse = await client.request({
            url: `/api/v2/users/${requesterId}.json`,
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
      if (organizationId) {
        try {
          const orgResponse = await client.request({
            url: `/api/v2/organizations/${organizationId}.json`,
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

      console.log('Final ticket object:', ticket);
      return ticket;
    } catch (error) {
      console.error('Error getting ticket data:', error);
      return null;
    }
  };

  const evaluateRules = async (triggerType) => {
    try {
      console.log(`\n=== Evaluating rules for: ${triggerType} ===`);

      const ticket = await getTicketData();
      if (!ticket) return;

      const rules = rulesRef.current;
      if (!rules || rules.length === 0) {
        console.log('No rules loaded');
        return;
      }

      // Verify required field is set based on trigger type
      if (triggerType === 'new_ticket_requester') {
        if (!ticket.requester?.id && !ticket.requester?.email) {
          console.log('Requester not set, skipping evaluation');
          return;
        }
        console.log('Requester is set:', ticket.requester.id || ticket.requester.email);
      }
      
      if (triggerType === 'new_ticket_assignment') {
        const hasAssignee = ticket.assignee?.user?.id;
        const hasGroup = ticket.assignee?.group?.id || ticket.group?.id;
        
        console.log('Assignment check - Assignee:', hasAssignee, 'Group:', hasGroup);
        
        if (!hasAssignee && !hasGroup) {
          console.log('Neither Assignee nor Group is set, skipping evaluation');
          return;
        }
        console.log('Assignee/Group is set - proceeding with evaluation');
      }

      const eligibleRules = rules
        .filter(rule => {
          if (!rule.enabled) return false;
          if ((rule.triggerType || 'ticket_opened') !== triggerType) return false;
          return true;
        })
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));

      console.log('Eligible rules for', triggerType + ':', eligibleRules.map(r => r.name));

      if (eligibleRules.length === 0) {
        console.log('No eligible rules for this trigger type');
        return;
      }

      for (const rule of eligibleRules) {
        console.log(`\nEvaluating rule: "${rule.name}"`);
        console.log('  Conditions:', JSON.stringify(rule.conditions, null, 2));

        const currentlyMatches = evaluateConditions(ticket, rule.conditions);
        
        // Use rule.id + triggerType as key to track state separately per trigger type
        const stateKey = `${rule.id}_${triggerType}`;
        const previouslyMatched = previousMatchStateRef.current.get(stateKey) || false;
        
        console.log(`  Previous state: ${previouslyMatched}, Current state: ${currentlyMatches}`);
        
        // Update the stored state
        previousMatchStateRef.current.set(stateKey, currentlyMatches);

        // Only show modal on transition from false → true
        if (currentlyMatches && !previouslyMatched) {
          console.log(`✅ Transition detected (false → true). Opening modal for: "${rule.name}"`);
          
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
          
          return; // Only show one modal at a time
        } else if (currentlyMatches && previouslyMatched) {
          console.log(`  ⏸ Still matching, but already shown. Skipping.`);
        } else if (!currentlyMatches && previouslyMatched) {
          console.log(`  🔄 Transition detected (true → false). Reset - will show again if becomes true.`);
        } else {
          console.log(`  ❌ Not matching.`);
        }
      }

      console.log('\nNo rules triggered modal this evaluation');
    } catch (error) {
      console.error('Error evaluating rules:', error);
    }
  };

  return null;
};

export default NewTicketSideBar;