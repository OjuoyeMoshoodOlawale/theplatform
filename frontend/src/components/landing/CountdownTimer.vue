<template>
  <div>
    <!-- Countdown to event -->
    <div v-if="status === 'upcoming'" class="grid grid-cols-4 gap-3 md:gap-4">
      <div v-for="unit in units" :key="unit.label" class="text-center">
        <div class="bg-black/20 border border-brand-gold/30 px-3 md:px-4 py-3 md:py-4 mb-2">
          <span class="font-display font-bold text-3xl md:text-5xl text-brand-gold tabular-nums">
            {{ unit.value }}
          </span>
        </div>
        <p class="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">{{ unit.label }}</p>
      </div>
    </div>

    <!-- Event is live! -->
    <div v-else-if="status === 'live'"
      class="inline-flex items-center gap-3 bg-brand-gold/20 border border-brand-gold/50 px-6 py-3">
      <span class="w-3 h-3 rounded-full bg-brand-gold animate-pulse flex-shrink-0"></span>
      <span class="font-display font-bold text-brand-gold text-lg uppercase tracking-widest">
        Event is Live!
      </span>
    </div>

    <!-- No valid date -->
    <div v-else class="text-white/30 text-sm">Registration open</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  targetDate: { type: String, default: '' },
});

const now = ref(Date.now());
let timer;
onMounted(()  => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => clearInterval(timer));

// Safely get target timestamp - handles ISO strings, plain dates, Date objects
const targetTs = computed(() => {
  if (!props.targetDate) return null;
  const s = String(props.targetDate).trim();
  if (!s) return null;
  // Extract YYYY-MM-DD part and append time to avoid timezone issues
  const datePart = s.slice(0, 10); // "2026-07-12"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const ts = new Date(datePart + 'T09:00:00').getTime();
  return isNaN(ts) ? null : ts;
});

const status = computed(() => {
  if (!targetTs.value) return 'invalid';
  const delta = targetTs.value - now.value;
  if (delta > 0) return 'upcoming';
  if (delta > -86400000 * 3) return 'live'; // within 3 days of start = live
  return 'invalid'; // event long past
});

const diff = computed(() => {
  if (status.value !== 'upcoming') return { days:0, hours:0, minutes:0, seconds:0 };
  const total = Math.floor(Math.max(0, targetTs.value - now.value) / 1000);
  return {
    days:    Math.floor(total / 86400),
    hours:   Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
});

const pad = (n) => String(n).padStart(2, '0');
const units = computed(() => [
  { value: String(diff.value.days).padStart(2, '0'), label: 'Days'    },
  { value: pad(diff.value.hours),                    label: 'Hours'   },
  { value: pad(diff.value.minutes),                  label: 'Minutes' },
  { value: pad(diff.value.seconds),                  label: 'Seconds' },
]);
</script>
