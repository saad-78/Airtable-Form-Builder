import api from './api';

export const authService = {
  getLoginUrl: () => {
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/airtable`;
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  removeToken: () => {
    localStorage.removeItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  getBases: async () => {
    const response = await api.get('/auth/bases');
    return response.data.bases;
  },

  getTables: async (baseId) => {
    const response = await api.get(`/auth/bases/${baseId}/tables`);
    return response.data.tables;
  },

  getTableSchema: async (baseId, tableId) => {
    const response = await api.get(`/auth/bases/${baseId}/tables/${tableId}/schema`);
    return response.data.table;
  }
};
