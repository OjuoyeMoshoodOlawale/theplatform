<template>
  <div class="group relative overflow-hidden bg-white border border-gray-100 hover:border-brand-gold transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
    <!-- photo -->
    <div class="relative h-64 bg-brand-cream overflow-hidden">
      <img v-if="speaker.photo_url" :src="speaker.photo_url" :alt="speaker.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div v-else class="w-full h-full flex items-center justify-center bg-brand-green/10">
        <span class="text-6xl font-display font-bold text-brand-green/30">{{ initials }}</span>
      </div>
      <!-- gold accent -->
      <div class="absolute bottom-0 left-0 w-full h-1 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
    </div>
    <!-- info -->
    <div class="p-5">
      <h3 class="font-display font-bold text-lg text-brand-green leading-tight">{{ speaker.name }}</h3>
      <p v-if="speaker.title" class="text-sm text-brand-gold font-semibold mt-1">{{ speaker.title }}</p>
      <p v-if="speaker.bio" class="text-sm text-gray-600 mt-2 line-clamp-3">{{ speaker.bio }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  speaker: { type: Object, required: true },
});
const initials = computed(() =>
  props.speaker.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
);
</script>
