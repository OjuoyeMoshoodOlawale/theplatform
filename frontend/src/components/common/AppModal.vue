<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />
        <!-- panel -->
        <div class="relative w-full bg-white shadow-2xl flex flex-col" :class="widthClass" style="max-height:90vh;">
          <!-- header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h3 class="font-display font-bold text-lg text-brand-green">{{ title }}</h3>
            <button class="text-gray-400 hover:text-gray-700 text-2xl leading-none transition-colors"
              @click="$emit('update:modelValue', false)">✕</button>
          </div>
          <!-- body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <slot />
          </div>
          <!-- footer -->
          <div v-if="$slots.footer" class="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title:      { type: String,  default: '' },
  size:       { type: String,  default: 'md' }, // sm | md | lg | xl
});
defineEmits(['update:modelValue']);
const widthClass = computed(() => ({
  sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl',
}[props.size] ?? 'max-w-lg'));
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.25s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; transform: scale(0.96); }
</style>
