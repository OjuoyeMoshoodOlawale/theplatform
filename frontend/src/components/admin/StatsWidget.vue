<template>
  <div class="bg-white border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{{ label }}</p>
        <p class="font-display font-bold text-3xl text-brand-green tabular-nums">
          {{ prefix }}{{ formatted }}{{ suffix }}
        </p>
        <p v-if="sub" class="text-xs text-gray-500 mt-1.5">{{ sub }}</p>
      </div>
      <div class="w-11 h-11 flex items-center justify-center flex-shrink-0 ml-3" :class="iconBg">
        <component :is="icon" :size="20" :class="iconColor" />
      </div>
    </div>
    <div v-if="trend !== null" class="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1">
      <component :is="trend >= 0 ? TrendingUp : TrendingDown" :size="12"
        :class="trend >= 0 ? 'text-green-500' : 'text-red-400'" />
      <span class="text-xs font-semibold" :class="trend >= 0 ? 'text-green-600' : 'text-red-500'">
        {{ Math.abs(trend) }}%
      </span>
      <span class="text-xs text-gray-400">vs previous event</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { TrendingUp, TrendingDown } from 'lucide-vue-next';

const props = defineProps({
  label:     { type: String,   required: true },
  value:     { type: [String,Number], default: 0 },
  icon:      { type: [Object, Function], required: true },   // Lucide component
  iconBg:    { type: String,   default: 'bg-brand-cream' },
  iconColor: { type: String,   default: 'text-brand-green' },
  sub:       { type: String,   default: '' },
  prefix:    { type: String,   default: '' },
  suffix:    { type: String,   default: '' },
  trend:     { type: Number,   default: null },
  currency:  { type: Boolean,  default: false },
});

const formatted = computed(() => {
  const n = Number(props.value);
  if (isNaN(n)) return props.value;
  if (props.currency) return n.toLocaleString('en-NG');
  return n.toLocaleString();
});
</script>
