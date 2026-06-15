<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="modelValue" class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        @click.self="$emit('update:modelValue', false)">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <!-- Modal -->
        <div class="relative bg-white w-full max-w-sm shadow-2xl">
          <!-- Icon header -->
          <div class="flex flex-col items-center pt-8 pb-4 px-6">
            <div class="w-14 h-14 flex items-center justify-center mb-4 flex-shrink-0"
              :class="iconBgClass">
              <component :is="iconComponent" :size="28" :class="iconColorClass" />
            </div>
            <h3 class="font-display font-bold text-xl text-gray-900 text-center">{{ title }}</h3>
            <p v-if="message" class="text-gray-500 text-sm text-center mt-2 leading-relaxed">{{ message }}</p>
          </div>
          <!-- Actions -->
          <div class="flex gap-3 px-6 pb-6 pt-2">
            <button class="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold text-sm
                           hover:border-gray-300 hover:bg-gray-50 transition-colors"
              @click="$emit('update:modelValue', false)">
              {{ cancelLabel }}
            </button>
            <button class="flex-1 py-2.5 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              :class="confirmBtnClass"
              :disabled="loading"
              @click="$emit('confirm')">
              <Loader v-if="loading" :size="15" class="animate-spin" />
              {{ loading ? 'Please wait…' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { AlertTriangle, Trash2, CheckCircle2, Info, Loader } from 'lucide-vue-next';

const props = defineProps({
  modelValue:   { type: Boolean, required: true },
  title:        { type: String, default: 'Are you sure?' },
  message:      { type: String, default: '' },
  type:         { type: String, default: 'danger' }, // danger | warning | success | info
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel:  { type: String, default: 'Cancel' },
  loading:      { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'confirm']);

const iconComponent = computed(() => ({
  danger:  Trash2,
  warning: AlertTriangle,
  success: CheckCircle2,
  info:    Info,
}[props.type] ?? AlertTriangle));

const iconBgClass = computed(() => ({
  danger:  'bg-red-50',
  warning: 'bg-yellow-50',
  success: 'bg-green-50',
  info:    'bg-blue-50',
}[props.type] ?? 'bg-red-50'));

const iconColorClass = computed(() => ({
  danger:  'text-red-500',
  warning: 'text-yellow-500',
  success: 'text-green-500',
  info:    'text-blue-500',
}[props.type] ?? 'text-red-500'));

const confirmBtnClass = computed(() => ({
  danger:  'bg-red-500 text-white hover:bg-red-600',
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
  success: 'btn-green',
  info:    'bg-blue-500 text-white hover:bg-blue-600',
}[props.type] ?? 'bg-red-500 text-white hover:bg-red-600'));
</script>

<style scoped>
.confirm-fade-enter-active, .confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.confirm-fade-enter-active .relative,
.confirm-fade-leave-active .relative {
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
}
.confirm-fade-enter-from { opacity: 0; }
.confirm-fade-leave-to   { opacity: 0; }
.confirm-fade-enter-from .relative { transform: scale(0.9); opacity: 0; }
.confirm-fade-leave-to   .relative { transform: scale(0.95); opacity: 0; }
</style>
