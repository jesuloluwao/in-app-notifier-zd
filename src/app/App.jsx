import { useState, useEffect, useCallback } from 'react';
import { AdminConfig } from './components/AdminConfig';
import { SetupWizard } from './components/SetupWizard';
import TicketSideBar from './locations/TicketSideBar';
import NewTicketSideBar from './locations/NewTicketSideBar';
import Modal from './locations/Modal';
import { useClient } from './hooks/useClient';
import { setupService } from './utils/setupService';
import { canConfigureApp, clearAccessCache } from './utils/accessControl';

const GATE_STATES = {
  LOADING: 'loading',
  NEEDS_SETUP: 'needs_setup',
  NEEDS_SETUP_BY_ADMIN: 'needs_setup_by_admin',
  SETUP_FORBIDDEN: 'setup_forbidden',
  ALLOWED: 'allowed',
  DENIED: 'denied'
};

const AccessDenied = () => (
  <div style={{ padding: '40px', maxWidth: 600 }}>
    <h1>Access denied</h1>
    <p>
      You don&apos;t have permission to configure the ModalManager app.
      Please contact a Zendesk administrator.
    </p>
  </div>
);

const SetupNotComplete = () => (
  <div style={{ padding: '40px', maxWidth: 600 }}>
    <h1>Setup not complete</h1>
    <p>
      The ModalManager app needs its required Zendesk custom objects to be created
      before it can be used. Please ask a Zendesk administrator to open the app
      and complete setup.
    </p>
  </div>
);

const App = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gateState, setGateState] = useState(GATE_STATES.LOADING);
  const client = useClient();

  const evaluateGate = useCallback(async () => {
    setGateState(GATE_STATES.LOADING);
    try {
      const probe = await setupService.probeSchema(client);
      if (probe?.writePermission?.status === 'forbidden') {
        setGateState(GATE_STATES.SETUP_FORBIDDEN);
        return;
      }
      if (!probe?.allPresent) {
        let role = null;
        try {
          const userData = await client.get('currentUser');
          role = userData?.currentUser?.role;
        } catch (userError) {
          console.error('Failed to read current user role', userError);
        }
        setGateState(
          role === 'admin'
            ? GATE_STATES.NEEDS_SETUP
            : GATE_STATES.NEEDS_SETUP_BY_ADMIN
        );
        return;
      }
      const allowed = await canConfigureApp(client);
      setGateState(allowed ? GATE_STATES.ALLOWED : GATE_STATES.DENIED);
    } catch (error) {
      console.error('Gate evaluation failed', error);
      setGateState(GATE_STATES.DENIED);
    }
  }, [client]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const context = await client.context();
        setLocation(context.location);
        if (context.location === 'nav_bar') {
          await evaluateGate();
        }
      } catch (error) {
        console.error('Error getting context:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, [client, evaluateGate]);

  const handleSetupComplete = useCallback(() => {
    clearAccessCache();
    evaluateGate();
  }, [evaluateGate]);

  if (loading) {
    return null;
  }

  if (location === 'nav_bar') {
    if (gateState === GATE_STATES.LOADING) {
      return null;
    }
    if (gateState === GATE_STATES.NEEDS_SETUP) {
      return (
        <SetupWizard
          client={client}
          mode="bootstrap"
          onComplete={handleSetupComplete}
        />
      );
    }
    if (gateState === GATE_STATES.NEEDS_SETUP_BY_ADMIN) {
      return <SetupNotComplete />;
    }
    if (
      gateState === GATE_STATES.SETUP_FORBIDDEN ||
      gateState === GATE_STATES.DENIED
    ) {
      return <AccessDenied />;
    }
    return <AdminConfig />;
  }

  if (location === 'ticket_sidebar') {
    return <TicketSideBar />;
  }

  if (location === 'new_ticket_sidebar') {
    return <NewTicketSideBar />;
  }

  if (location === 'modal') {
    return <Modal />;
  }

  return <div style={{ height: '1px' }} />;
};

export default App;
