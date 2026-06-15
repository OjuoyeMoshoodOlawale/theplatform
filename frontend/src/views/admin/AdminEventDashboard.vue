<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Event Dashboard</h2>
        <p v-if="snap?.event" class="text-sm text-gray-500">{{ snap.event }}</p>
      </div>
      <div class="flex gap-2 items-center">
        <select v-model="selectedEvent" class="input text-sm w-52" @change="load">
          <option value="">Select event…</option>
          <option v-for="e in events" :key="e.id" :value="e.id">{{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}</option>
        </select>
        <button v-if="selectedEvent" class="btn-outline text-xs" @click="load">↺ Refresh</button>
      </div>
    </div>

    <div v-if="!selectedEvent" class="text-center py-16 text-gray-300 text-sm">Select an event above.</div>

    <div v-else-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-4 border-brand-green/30 border-t-brand-green rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-6">
      <!-- Revenue + Attendance summary -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-brand-green text-white p-5">
          <p class="text-white/50 text-xs uppercase tracking-wider mb-1">Revenue</p>
          <p class="font-display font-bold text-2xl">₦{{ fmt(data.tickets?.revenue) }}</p>
          <p class="text-white/40 text-xs mt-1">{{ data.tickets?.sold ?? 0 }} tickets sold</p>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Checked In</p>
          <p class="font-display font-bold text-2xl text-brand-green">{{ data.attendance?.checked_in ?? 0 }}</p>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">On Premises</p>
          <p class="font-display font-bold text-2xl text-green-600">
            {{ (data.attendance?.checked_in ?? 0) - (data.attendance?.checked_out ?? 0) }}
          </p>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Checked Out</p>
          <p class="font-display font-bold text-2xl text-gray-400">{{ data.attendance?.checked_out ?? 0 }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Ticket type progress -->
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-4">Ticket Type Progress</h3>
          <div class="space-y-4">
            <div v-for="tt in data.ticketTypes" :key="tt.name">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="font-semibold">{{ tt.name }}</span>
                <span class="text-gray-500">
                  {{ tt.sold_count }} / {{ tt.quantity_available ?? '∞' }}
                </span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-brand-gold rounded-full transition-all duration-500"
                  :style="{ width: `${capacityPct(tt)}%` }"></div>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                {{ tt.quantity_available ? `${100 - Math.round(capacityPct(tt))}% remaining` : 'Unlimited' }}
              </p>
            </div>
            <p v-if="!data.ticketTypes?.length" class="text-center text-gray-300 text-sm py-4">No ticket types.</p>
          </div>
        </div>

        <!-- Category breakdown -->
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-4">Category Breakdown</h3>
          <div class="space-y-3">
            <div v-for="c in data.categories" :key="c.name">
              <div class="flex justify-between text-sm mb-1">
                <span class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-sm" :style="{ backgroundColor: c.color }"></span>
                  <span class="font-medium">{{ c.name }}</span>
                </span>
                <span class="font-bold text-brand-green">
                  {{ c.registered }} {{ c.capacity ? `/ ${c.capacity}` : '' }}
                </span>
              </div>
              <div v-if="c.capacity" class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                  :style="{ width: `${Math.min(100,(c.registered/c.capacity)*100)}%`, backgroundColor: c.color }">
                </div>
              </div>
            </div>
            <p v-if="!data.categories?.length" class="text-center text-gray-300 text-sm py-4">No categories defined.</p>
          </div>
        </div>
      </div>

      <!-- Trend chart (simple SVG bar chart) -->
      <div v-if="data.snapshots?.length > 1" class="bg-white border border-gray-100 p-5">
        <h3 class="font-display font-bold text-brand-green mb-4">Ticket Sales Trend</h3>
        <div class="overflow-x-auto">
          <div class="flex items-end gap-1 h-32 min-w-max">
            <div v-for="s in data.snapshots" :key="s.snapshot_date"
              class="flex flex-col items-center gap-1 group">
              <div class="relative">
                <div class="bg-brand-gold rounded-t transition-all duration-500 min-w-6"
                  :style="{ height: `${barHeight(s.tickets_sold)}px`, width:'28px' }">
                </div>
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-brand-green
                            opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {{ s.tickets_sold }}
                </div>
              </div>
              <p class="text-xs text-gray-400 -rotate-45 origin-top-left ml-3" style="font-size:10px">
                {{ s.snapshot_date?.slice(5) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert         = useAlertStore();
const events        = ref([]);
const selectedEvent = ref('');
const loading       = ref(false);
const data          = ref({});

onMounted(async () => {
  const { data: d } = await api.get('/events');
  events.value = d.data || [];
  const active = events.value.find(e => e.status === 'active');
  if (active) { selectedEvent.value = active.id; load(); }
});

const load = async () => {
  if (!selectedEvent.value) return;
  loading.value = true;
  try {
    const { data: d } = await api.get(`/reports/${selectedEvent.value}/dashboard`);
    data.value = d.data || {};
  } catch { alert.error('Failed to load dashboard.'); }
  finally { loading.value = false; }
};

const fmt = (n) => Number(n||0).toLocaleString('en-NG', { minimumFractionDigits: 0 });

const capacityPct = (tt) => {
  if (!tt.quantity_available) return 0;
  return Math.min(100, Math.round((tt.sold_count / tt.quantity_available) * 100));
};

const maxSnap = computed(() => Math.max(...(data.value.snapshots||[]).map(s => s.tickets_sold), 1));
const barHeight = (n) => Math.max(4, Math.round((n / maxSnap.value) * 100));
</script>
