import { useEffect } from 'react';
import { evaluateConditions } from '../utils/conditionEvaluator';

export const TicketModal = ({ client }) => {
  useEffect(() => {
    console.log('=== TicketModal Component Mounted ===');
    evaluateTicketConditions();

    client.invoke('resize', { width: '0px', height: '0px' });
  }, [client]);

  const evaluateTicketConditions = async () => {
    try {
      console.log('Loading ticket data...');

      const ticketData = await client.get('ticket');
      const ticket = ticketData.ticket;

      console.log('Ticket data:', ticket);

      const stored = localStorage.getItem('modal_trigger_rules');
      if (!stored) {
        console.log('No rules found in localStorage');
        return;
      }

      const rules = JSON.parse(stored);
      console.log('Loaded rules:', rules);

      const enabledRules = rules
        .filter(rule => rule.enabled)
        .sort((a, b) => a.priority - b.priority);

      console.log('Enabled rules (sorted by priority):', enabledRules);

      for (const rule of enabledRules) {
        console.log(`Evaluating rule: ${rule.name}`);

        const matches = evaluateConditions(ticket, rule.conditions);
        console.log(`Rule "${rule.name}" matches:`, matches);

        if (matches) {
          console.log(`Rule "${rule.name}" matched! Opening modal.`);

          const modalContext = await client.invoke('instances.create', {
            location: 'modal',
            url: 'assets/index.html',
            size: {
              width: '600px',
              height: '400px'
            }
          });

          console.log('Modal created:', modalContext);

          const instanceGuid = modalContext['instances.create'][0].instanceGuid;
          const modalClient = client.instance(instanceGuid);

          modalClient.trigger('displayRule', rule);

          return;
        }
      }

      console.log('No rules matched. Modal will not be shown.');
    } catch (error) {
      console.error('Error evaluating ticket conditions:', error);
    }
  };

  return null;
};
