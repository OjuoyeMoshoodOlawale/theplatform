<template>
  <div id="app">
    <RouterView />
    <AppAlert />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore.js';
import AppAlert from '@/components/common/AppAlert.vue';

const auth = useAuthStore();
onMounted(() => {
  if (auth.isAuthenticated) auth.fetchMe();
});
</script>
