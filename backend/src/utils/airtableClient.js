const axios = require('axios');

class AirtableClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.airtable.com/v0';
  }
  
  async getBases() {
    try {
      const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data.bases;
    } catch (error) {
      this.handleError(error, 'fetching bases');
    }
  }
  
  async getTables(baseId) {
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.data.tables;
    } catch (error) {
      this.handleError(error, 'fetching tables');
    }
  }
  
  async getTableSchema(baseId, tableIdOrName) {
    try {
      const tables = await this.getTables(baseId);
      const table = tables.find(t => t.id === tableIdOrName || t.name === tableIdOrName);
      return table;
    } catch (error) {
      this.handleError(error, 'fetching table schema');
    }
  }
  
  async createRecord(baseId, tableIdOrName, fields) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${baseId}/${tableIdOrName}`,
        { fields },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'creating record');
    }
  }
  
  async updateRecord(baseId, tableIdOrName, recordId, fields) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/${baseId}/${tableIdOrName}/${recordId}`,
        { fields },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'updating record');
    }
  }
  
  async getRecord(baseId, tableIdOrName, recordId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${baseId}/${tableIdOrName}/${recordId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'fetching record');
    }
  }
  
  async createWebhook(baseId, tableId, notificationUrl) {
    try {
      const response = await axios.post(
        `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
        {
          notificationUrl,
          specification: {
            options: {
              filters: {
                dataTypes: ['tableData'],
                recordChangeScope: tableId
              }
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'creating webhook');
    }
  }
  
  async deleteWebhook(baseId, webhookId) {
    try {
      await axios.delete(
        `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return true;
    } catch (error) {
      this.handleError(error, 'deleting webhook');
    }
  }
  
  handleError(error, action) {
    if (error.response) {
      console.error(`Airtable API error while ${action}:`, error.response.data);
      throw new Error(error.response.data.error?.message || `Failed ${action}`);
    } else {
      console.error(`Network error while ${action}:`, error.message);
      throw new Error(`Network error while ${action}`);
    }
  }
}

module.exports = AirtableClient;
