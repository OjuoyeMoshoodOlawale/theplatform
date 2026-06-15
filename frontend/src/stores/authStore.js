import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/composables/useApi.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('mys_token') || null);
  const admin = ref(JSON.parse(localStorage.getItem('mys_admin') || 'null'));
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!admin.value);
  const isSuperAdmin   = computed(() => admin.value?.role === 'super_admin');
  const isAdmin        = computed(() => ['super_admin', 'admin'].includes(admin.value?.role));
  const isAttendant    = computed(() => admin.value?.role === 'attendant');
  const isDepartment   = computed(() => admin.value?.role === 'department');

  const login = async (email, password) => {
    loading.value = true;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      token.value = data.data.token;
      admin.value = data.data.admin;
      localStorage.setItem('mys_token', data.data.token);
      localStorage.setItem('mys_admin', JSON.stringify(data.data.admin));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed.' };
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    admin.value = null;
    localStorage.removeItem('mys_token');
    localStorage.removeItem('mys_admin');
  };

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      admin.value = data.data;
      localStorage.setItem('mys_admin', JSON.stringify(data.data));
    } catch {
      logout();
    }
  };

  return { token, admin, loading, isAuthenticated, isSuperAdmin, isAdmin, isAttendant, isDepartment, login, logout, fetchMe };
});
