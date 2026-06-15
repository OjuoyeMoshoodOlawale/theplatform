<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <TransitionGroup name="alert">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3.5 shadow-xl border-l-4 bg-white"
          :class="alertClass(alert.type)"
        >
          <span class="flex-shrink-0 mt-0.5 text-lg">{{ icon(alert.type) }}</span>
          <p class="flex-1 text-sm font-medium leading-snug text-gray-800">{{ alert.message }}</p>
          <button
            class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            @click="alertStore.dismiss(alert.id)"
          >✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useAlertStore } from '@/stores/alertStore.js';

const alertStore = useAlertStore();
const { alerts } = storeToRefs(alertStore);

const alertClass = (type) => ({
  success: 'border-green-500',
  error:   'border-red-500',
  warning: 'border-brand-gold',
  info:    'border-blue-500',
}[type] ?? 'border-gray-400');

const icon = (type) => ({ success:'success', error:'error', warning:'⚠️', info:'ℹ️' }[type] ?? '•');
</script>

<style scoped>
.alert-enter-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.alert-leave-active { transition: all 0.2s ease; }
.alert-enter-from   { opacity: 0; transform: translateX(100%); }
.alert-leave-to     { opacity: 0; transform: translateX(110%); }
.alert-move         { transition: transform 0.25s ease; }
</style>
