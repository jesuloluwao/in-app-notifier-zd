// Custom Object storage utility for modal trigger rules
// Custom object key: modal_trigger_rules
// Each rule is stored as a separate record

const CUSTOM_OBJECT_KEY = 'modal_trigger_rules';

const FORBIDDEN_MESSAGE = 'Your Zendesk role does not have permission to edit custom object records.';

export const customObjectStorage = {
  // Save a single rule as a record
  async saveRule(client, rule) {
    try {
      const recordData = {
        custom_object_record: {
          name: rule.name,
          custom_object_fields: {
            modal_trigger_rules: JSON.stringify({
              id: rule.id,
              name: rule.name,
              conditions: rule.conditions,
              message: rule.message,
              enabled: rule.enabled,
              priority: rule.priority,
              triggerType: rule.triggerType || 'ticket_opened'
            })
          }
        }
      };

      // Check if record with this ID already exists
      const existingRecord = await this.findRecordById(client, rule.id);
      
      if (existingRecord) {
        // Update existing record
        const response = await client.request({
          url: `/api/v2/custom_objects/${CUSTOM_OBJECT_KEY}/records/${existingRecord.id}`,
          type: 'PATCH',
          contentType: 'application/json',
          data: JSON.stringify(recordData)
        });
        return { success: true, data: response };
      } else {
        // Create new record
        const response = await client.request({
          url: `/api/v2/custom_objects/${CUSTOM_OBJECT_KEY}/records`,
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(recordData)
        });
        return { success: true, data: response };
      }
    } catch (error) {
      if (error && error.status === 403) {
        return { success: false, code: 'forbidden', error: FORBIDDEN_MESSAGE };
      }
      console.error('Failed to save rule:', error);
      return { success: false, error: 'Failed to save rule', details: error };
    }
  },

  // Find a record by rule ID (stored in the JSON)
  async findRecordById(client, ruleId) {
    try {
      const allRecords = await this.loadAllRules(client);
      if (!allRecords.success) return null;
      
      // Find the record that contains this rule ID
      const response = await client.request({
        url: `/api/v2/custom_objects/${CUSTOM_OBJECT_KEY}/records?page[size]=100`,
        type: 'GET'
      });

      if (response.custom_object_records) {
        for (const record of response.custom_object_records) {
          const ruleJson = record.custom_object_fields?.modal_trigger_rules;
          if (ruleJson) {
            try {
              const rule = JSON.parse(ruleJson);
              if (rule.id === ruleId) {
                return record;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding record:', error);
      return null;
    }
  },

  // Delete a rule record
  async deleteRule(client, ruleId) {
    const all = await this.loadAllRules(client);
    if (!all.success) {
      if (all.code === 'forbidden') return all;
      return { success: false, error: all.error, details: all.details };
    }
    const target = all.rules.find(r => r.id === ruleId);
    if (!target) {
      return { success: false, error: 'Rule not found' };
    }
    try {
      await client.request({
        url: `/api/v2/custom_objects/${CUSTOM_OBJECT_KEY}/records/${target._recordId}`,
        type: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      if (error && error.status === 403) {
        return { success: false, code: 'forbidden', error: FORBIDDEN_MESSAGE };
      }
      console.error('Failed to delete rule:', error);
      return { success: false, error: 'Failed to delete rule', details: error };
    }
  },

  // Load all rules from custom object records
  async loadAllRules(client) {
    try {
      const response = await client.request({
        url: `/api/v2/custom_objects/${CUSTOM_OBJECT_KEY}/records?page[size]=100`,
        type: 'GET'
      });

      const rules = [];
      
      if (response.custom_object_records) {
        for (const record of response.custom_object_records) {
          const ruleJson = record.custom_object_fields?.modal_trigger_rules;
          if (ruleJson) {
            try {
              const rule = JSON.parse(ruleJson);
              rule._recordId = record.id; // Store record ID for updates/deletes
              rules.push(rule);
            } catch (parseError) {
              console.error('Failed to parse rule JSON:', parseError);
            }
          }
        }
      }

      // Sort by priority
      rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      
      return { success: true, rules };
    } catch (error) {
      if (error && error.status === 404) {
        return { success: true, rules: [] };
      }
      if (error && error.status === 403) {
        return { success: false, code: 'forbidden', error: FORBIDDEN_MESSAGE };
      }
      console.error('Failed to load rules:', error);
      return { success: false, error: 'Failed to load rules', details: error };
    }
  }
};
