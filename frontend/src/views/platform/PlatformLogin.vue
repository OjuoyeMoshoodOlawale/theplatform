<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center px-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
      <h1 class="font-display font-bold text-2xl text-gray-800 mb-1">Platform Admin</h1>
      <p class="text-sm text-gray-400 mb-6">Manage organisations on the platform.</p>

      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" class="input" placeholder="owner@theplatform.com" />
        </div>
        <div>
          <label class="label">Password</label>
          <input v-model="password" type="password" class="input" placeholder="••••••••" />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button type="submit" :disabled="busy" class="btn-green w-full justify-center py-3">
          {{ busy ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/composables/useApi.js';

const router = useRouter();
const email = ref(''); const password = ref('');
const busy = ref(false); const error = ref('');

const login = async () => {
  busy.value = true; error.value = '';
  try {
    const { data } = await api.post('/platform/login', { email: email.value, password: password.value });
    localStorage.setItem('mys_platform_token', data.data.token);
    localStorage.setItem('mys_platform_admin', JSON.stringify(data.data.admin));
    router.push('/platform');
  } catch (e) {
    error.value = e.response?.data?.message || 'Login failed.';
  } finally { busy.value = false; }
};
</script>
