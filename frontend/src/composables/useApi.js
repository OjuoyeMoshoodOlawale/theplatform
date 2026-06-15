/**
 * useApi.js - Axios instance with auth interceptors
 * Usage: import api from '@/composables/useApi.js'
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mys_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally – clear token + redirect to admin login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mys_token');
      localStorage.removeItem('mys_admin');
      // Redirect to the tenant's admin login if we're in an admin area.
      const path = window.location.pathname;
      const m = path.match(/^\/([a-z0-9-]+)\/admin/);
      if (m) {
        window.location.replace(`/${m[1]}/admin/login`);
      } else if (path.startsWith('/admin')) {
        window.location.replace('/admin/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
