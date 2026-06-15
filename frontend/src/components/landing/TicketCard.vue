<template>
  <div class="relative flex flex-col" :class="featured ? 'ring-2 ring-brand-gold shadow-2xl scale-[1.02]' : 'border border-gray-200 shadow-sm'">
    <!-- featured ribbon -->
    <div v-if="featured" class="bg-brand-gold text-brand-green text-xs font-bold uppercase tracking-widest text-center py-2">
       Most Popular
    </div>

    <div class="bg-white flex flex-col flex-1 p-8">
      <!-- type -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-display font-bold text-xl text-brand-green">{{ type.name }}</h3>
        <span v-if="isEarlyBird" class="badge-gold">Early Bird</span>
      </div>

      <!-- price -->
      <div class="mb-6">
        <div class="flex items-end gap-2">
          <span class="font-display font-bold text-5xl text-brand-green">
            ₦{{ formatPrice(currentPrice) }}
          </span>
        </div>
        <div v-if="isEarlyBird && type.regular_price > type.early_bird_price" class="mt-1.5 flex items-center gap-2">
          <span class="text-sm text-gray-400 line-through">₦{{ formatPrice(type.regular_price) }}</span>
          <span class="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5">
            Save ₦{{ formatPrice(type.regular_price - type.early_bird_price) }}
          </span>
        </div>
      </div>

      <!-- divider -->
      <div class="h-px bg-gray-100 mb-6"></div>

      <!-- availability -->
      <div v-if="type.quantity_available" class="mb-6">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Availability</span>
          <span>{{ type.quantity_available - type.quantity_sold }} left</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-brand-gold rounded-full transition-all"
            :style="{ width: `${Math.min(100, (type.quantity_sold / type.quantity_available) * 100)}%` }"></div>
        </div>
      </div>

      <div class="mt-auto">
        <button @click="$emit('select', type)"
          class="w-full py-4 font-display font-bold text-sm uppercase tracking-widest transition-all duration-200"
          :class="featured
            ? 'bg-brand-gold text-brand-green hover:bg-yellow-400'
            : 'bg-brand-green text-white hover:bg-opacity-90'">
          Get Ticket
        </button>

        <p v-if="isEarlyBird && type.early_bird_closes_at" class="text-center text-xs text-gray-400 mt-3">
          Early bird closes {{ formatDate(earlyBirdCloses) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
defineEmits(['select']);
const props = defineProps({
  type:            { type: Object,  required: true },
  featured:        { type: Boolean, default: false },
  earlyBirdCloses: { type: String,  default: null  },
});

const isEarlyBird = computed(() =>
  props.earlyBirdCloses && new Date(props.earlyBirdCloses) > new Date() && !!props.type.early_bird_price
);

const currentPrice = computed(() =>
  isEarlyBird.value ? props.type.early_bird_price : props.type.regular_price
);

const formatPrice = (n) => Number(n).toLocaleString('en-NG');
const formatDate  = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }) : '';
</script>
