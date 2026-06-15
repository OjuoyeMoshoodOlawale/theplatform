<template>
  <div class="min-h-screen bg-brand-green geometric-bg flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-10">
        <img src="/logos/logo-white.png" alt="MYS" class="h-16 mx-auto mb-4" />
        <p class="text-brand-gold font-display uppercase tracking-[0.2em] text-sm">Admin Portal</p>
      </div>

      <!-- Card -->
      <div class="bg-white p-8 shadow-2xl">
        <h2 class="font-display font-bold text-2xl text-brand-green mb-1">Sign In</h2>
        <p class="text-sm text-gray-500 mb-8">Access the MYS management dashboard</p>

        <form @submit.prevent="handleLogin" class="space-y-5" novalidate>
          <div>
            <label class="label">Email Address</label>
            <input v-model="form.email" type="email" class="input" :class="{ 'input-error': errors.email }"
              placeholder="admin@example.com" autocomplete="email" />
            <p v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</p>
          </div>

          <div>
            <label class="label">Password</label>
            <div class="relative">
              <input v-model="form.password" :type="showPass ? 'text' : 'password'"
                class="input pr-12" :class="{ 'input-error': errors.password }"
                placeholder="••••••••" autocomplete="current-password" />
              <button type="button"
                class="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                @click="showPass = !showPass">
                {{ showPass ? '🙈' : '👁' }}
              </button>
            </div>
            <p v-if="errors.password" class="text-red-500 text-xs mt-1">{{ errors.password }}</p>
          </div>

          <p v-if="serverError" class="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3">
            {{ serverError }}
          </p>

          <button type="submit" :disabled="loading"
            class="btn-green w-full justify-center py-4 text-base">
            <span v-if="loading" class="flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Signing in…
            </span>
            <span v-else>Sign In →</span>
          </button>
        </form>
      </div>

      <p class="text-center text-white/40 text-xs mt-6">
        Muslim Youth Summit · Admin Access Only
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore.js';

const auth   = useAuthStore();
const router = useRouter();
const route  = useRoute();

const form  = reactive({ email: '', password: '' });
const errors      = reactive({ email: '', password: '' });
const serverError = ref('');
const showPass    = ref(false);
const loading     = ref(false);

const validate = () => {
  errors.email    = '';
  errors.password = '';
  if (!form.email)    { errors.email = 'Email is required.'; }
  else if (!/\S+@\S+\.\S+/.test(form.email)) { errors.email = 'Enter a valid email.'; }
  if (!form.password) { errors.password = 'Password is required.'; }
  return !errors.email && !errors.password;
};

const handleLogin = async () => {
  if (!validate()) return;
  serverError.value = '';
  loading.value     = true;
  const res = await auth.login(form.email, form.password);
  loading.value     = false;
  if (res.success) {
    const slug = route.params.slug;
    const fallback = slug ? `/${slug}/admin/dashboard` : '/admin/dashboard';
    const redirect = route.query.redirect || fallback;
    router.push(redirect);
  } else {
    serverError.value = res.message || 'Login failed. Please check your credentials.';
  }
};
</script>
