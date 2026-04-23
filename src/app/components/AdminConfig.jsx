import { useState, useEffect } from 'react';
import { Alert } from '@zendeskgarden/react-notifications';
import { Spinner } from '@zendeskgarden/react-loaders';
import { Tabs, TabList, Tab, TabPanel } from '@zendeskgarden/react-tabs';
import { useClient } from '../hooks/useClient';
import { RuleList } from './RuleList';
import { RuleEditor } from './RuleEditor';
import { RulePreview } from './RulePreview';
import { AccessSettings } from './AccessSettings';
import { SetupWizard } from './SetupWizard';
import { customObjectStorage } from '../utils/customObjectStorage';
import { AdminContainer, AdminEditorLayout, AdminHeader, AdminTitle, TabPanelContent } from '../styles/AdminConfig';

const PermissionAlert = () => (
  <Alert type="error" style={{ marginBottom: '16px' }}>
    <Alert.Title>Permission required</Alert.Title>
    <Alert.Paragraph>
      Your Zendesk role does not have permission to edit custom object records.
      Ask a Zendesk admin to enable <strong>Edit custom object records</strong> on your role
      in <em>Admin Center → People → Roles</em>.
    </Alert.Paragraph>
  </Alert>
);

export const AdminConfig = () => {
  const client = useClient();
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [previewRule, setPreviewRule] = useState(null);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('rules');

  useEffect(() => {
    // Note: nav_bar apps cannot be resized via client.invoke('resize', ...);
    // Zendesk auto-sizes the iframe to fit its allocated content area. We
    // rely on that and handle scrolling internally via #root's overflow.
    loadRules({ showSpinner: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const loadRules = async ({ showSpinner = false } = {}) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await customObjectStorage.loadAllRules(client);
      if (result.success) {
        setRules(result.rules);
        setError(null);
        setForbidden(false);
      } else if (result.code === 'forbidden') {
        setForbidden(true);
        setError(null);
      } else {
        setError(result.error);
        setForbidden(false);
      }
    } catch (err) {
      setError('Failed to load rules: ' + err.message);
    }
    if (showSpinner) setLoading(false);
  };

  const handleAddRule = () => {
    setEditingRule({
      id: Date.now().toString(),
      name: '',
      conditions: [],
      message: '',
      enabled: true,
      priority: rules.length,
      triggerType: 'ticket_opened'
    });
  };

  const handleSaveRule = async (rule) => {
    try {
      const result = await customObjectStorage.saveRule(client, rule);
      if (result.success) {
        await loadRules(); // Reload all rules
        setEditingRule(null);
        setError(null);
        setForbidden(false);
      } else if (result.code === 'forbidden') {
        setForbidden(true);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save rule: ' + err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      const result = await customObjectStorage.deleteRule(client, ruleId);
      if (result.success) {
        await loadRules();
        setError(null);
        setForbidden(false);
      } else if (result.code === 'forbidden') {
        setForbidden(true);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to delete rule: ' + err.message);
    }
  };

  const handleToggleRule = async (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      await handleSaveRule(updatedRule);
    }
  };

  const handleMoveRule = async (ruleId, direction) => {
    const index = rules.findIndex(r => r.id === ruleId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === rules.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedRules = [...rules];
    [updatedRules[index], updatedRules[newIndex]] = [updatedRules[newIndex], updatedRules[index]];

    // Update priorities and save each rule. If a save fails, surface the error,
    // reload once, and bail out instead of masking the failure.
    for (let i = 0; i < updatedRules.length; i++) {
      updatedRules[i].priority = i;
      const result = await customObjectStorage.saveRule(client, updatedRules[i]);
      if (!result.success) {
        if (result.code === 'forbidden') {
          setForbidden(true);
          setError(null);
        } else {
          setError(result.error);
        }
        await loadRules();
        return;
      }
    }

    await loadRules();
  };

  if (editingRule) {
    return (
      <AdminEditorLayout>
        <RuleEditor
          client={client}
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => setEditingRule(null)}
          onPreview={setPreviewRule}
        />
        {previewRule && (
          <RulePreview
            rule={previewRule}
            onClose={() => setPreviewRule(null)}
          />
        )}
      </AdminEditorLayout>
    );
  }

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>Modal Trigger Rules</AdminTitle>
      </AdminHeader>

      <Tabs selectedItem={tab} onChange={setTab}>
        <TabList>
          <Tab item="rules">Rules</Tab>
          <Tab item="access">Access</Tab>
          <Tab item="setup">Setup</Tab>
        </TabList>

        <TabPanel item="rules">
          <TabPanelContent>
            {forbidden && <PermissionAlert />}

            {error && (
              <Alert type="error" style={{ marginBottom: '16px' }}>
                <Alert.Title>Error</Alert.Title>
                <Alert.Paragraph>{error}</Alert.Paragraph>
                <Alert.Close aria-label="Dismiss error" onClick={() => setError(null)} />
              </Alert>
            )}

            {loading
              ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <Spinner size="large" />
                </div>
                )
              : (
                <RuleList
                  rules={rules}
                  onAdd={handleAddRule}
                  onEdit={setEditingRule}
                  onDelete={handleDeleteRule}
                  onToggle={handleToggleRule}
                  onMove={handleMoveRule}
                />
                )}
          </TabPanelContent>
        </TabPanel>

        <TabPanel item="access">
          <TabPanelContent>
            <AccessSettings client={client} />
          </TabPanelContent>
        </TabPanel>

        <TabPanel item="setup">
          <TabPanelContent>
            <SetupWizard client={client} mode="healthcheck" />
          </TabPanelContent>
        </TabPanel>
      </Tabs>
    </AdminContainer>
  );
};
