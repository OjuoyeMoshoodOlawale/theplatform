<template>
  <div class="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
    <div
      v-for="(image, i) in images"
      :key="image.id || i"
      class="group relative break-inside-avoid overflow-hidden cursor-pointer"
      :class="i % 5 === 0 ? 'aspect-[3/4]' : i % 3 === 0 ? 'aspect-square' : 'aspect-[4/3]'"
      @click="open(i)"
    >
      <img :src="image.image_url" :alt="image.caption || ''"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <!-- overlay -->
      <div class="absolute inset-0 bg-brand-green/0 group-hover:bg-brand-green/50 transition-all duration-300 flex items-center justify-center">
        <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </div>
      <!-- caption -->
      <div v-if="image.caption"
        class="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent
               opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p class="text-white text-xs">{{ image.caption }}</p>
      </div>
    </div>
  </div>

  <!-- Lightbox -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div v-if="lightboxIndex !== null"
        class="fixed inset-0 z-[9990] bg-black/95 flex items-center justify-center p-4"
        @click.self="close">
        <button class="absolute top-4 right-4 text-white/60 hover:text-white text-4xl" @click="close">✕</button>
        <button v-if="lightboxIndex > 0" class="absolute left-4 text-white/60 hover:text-white text-4xl" @click="prev">‹</button>
        <button v-if="lightboxIndex < images.length - 1" class="absolute right-4 text-white/60 hover:text-white text-4xl" @click="next">›</button>
        <img :src="images[lightboxIndex]?.image_url" class="max-w-full max-h-[85vh] object-contain" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ images: { type: Array, default: () => [] } });

const lightboxIndex = ref(null);
const open  = (i) => { lightboxIndex.value = i; };
const close = ()  => { lightboxIndex.value = null; };
const prev  = ()  => { if (lightboxIndex.value > 0) lightboxIndex.value--; };
const next  = ()  => { lightboxIndex.value++; };
</script>

<style scoped>
.lightbox-enter-active, .lightbox-leave-active { transition: opacity 0.2s; }
.lightbox-enter-from, .lightbox-leave-to       { opacity: 0; }
</style>
