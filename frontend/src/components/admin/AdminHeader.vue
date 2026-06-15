<template>
  <header class="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
    <div>
      <h1 class="font-display font-bold text-xl text-brand-green">{{ title }}</h1>
      <p v-if="subtitle" class="text-xs text-gray-400 mt-0.5">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-4">
      <!-- Active event badge -->
      <div v-if="eventStore.hasActiveEvent"
        class="hidden sm:flex items-center gap-2 bg-brand-cream border border-brand-gold/30 px-3 py-1.5">
        <Radio :size="12" class="text-green-500 animate-pulse" />
        <span class="text-xs font-semibold text-brand-green truncate max-w-[160px]">
          {{ eventStore.activeEvent?.title }}
        </span>
      </div>
      <!-- Admin info -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-sm font-semibold text-gray-800">{{ auth.admin?.name }}</p>
          <p class="text-xs text-gray-400 capitalize">{{ auth.admin?.role?.replace('_',' ') }}</p>
        </div>
        <div class="w-9 h-9 bg-brand-green flex items-center justify-center flex-shrink-0">
          <span class="text-white font-bold text-sm">{{ initials }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { Radio } from 'lucide-vue-next';
import { useAuthStore }  from '@/stores/authStore.js';
import { useEventStore } from '@/stores/eventStore.js';

defineProps({ title: { type:String, default:'Dashboard' }, subtitle: { type:String, default:'' } });
const auth       = useAuthStore();
const eventStore = useEventStore();
const initials   = computed(() => (auth.admin?.name||'A').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase());
</script>
