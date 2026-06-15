<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-brand-green/90 backdrop-blur-sm">
    <div class="text-center">
      <div class="relative w-16 h-16 mx-auto mb-4">
        <div class="absolute inset-0 border-4 border-brand-gold/30 rounded-full"></div>
        <div class="absolute inset-0 border-4 border-transparent border-t-brand-gold rounded-full animate-spin"></div>
        <div class="absolute inset-3 bg-brand-gold/20 rounded-full animate-pulse"></div>
      </div>
      <p class="text-white font-display text-sm uppercase tracking-widest">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show:    { type: Boolean, default: false },
  message: { type: String,  default: 'Loading…' },
});
</script>
