<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">R&P Reports</h2>
        <p class="text-sm text-gray-500">Report & Programme — revenue, participant breakdown</p>
      </div>
      <div class="flex gap-2 items-center">
        <select v-model="selectedEvent" class="input text-sm w-52" @change="load">
          <option value="">Select event…</option>
          <option v-for="e in events" :key="e.id" :value="e.id">{{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}</option>
        </select>
        <button v-if="selectedEvent" class="btn-outline text-xs" @click="printReport">Print</button>
      </div>
    </div>

    <div v-if="!selectedEvent" class="text-center py-16 text-gray-300 text-sm">Select an event above.</div>

    <div v-else-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-4 border-brand-green/30 border-t-brand-green rounded-full animate-spin"></div>
    </div>

    <div v-else id="report-area" class="space-y-6">
      <!-- Revenue overview cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-brand-green text-white p-5">
          <p class="text-white/50 text-xs uppercase tracking-wider mb-1">Total Revenue</p>
          <p class="font-display font-bold text-2xl">₦{{ fmtMoney(overview.revenue?.total_revenue) }}</p>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Tickets Sold</p>
          <p class="font-display font-bold text-2xl text-brand-green">{{ overview.revenue?.paid_tickets ?? 0 }}</p>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Early Bird Rev.</p>
          <p class="font-display font-bold text-2xl text-brand-gold">₦{{ fmtMoney(overview.revenue?.early_bird_revenue) }}</p>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Checked In</p>
          <p class="font-display font-bold text-2xl text-brand-green">{{ overview.attendance?.total_checked_in ?? 0 }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Revenue by ticket type -->
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-4">Revenue by Ticket Type</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase tracking-wide">
                <th class="pb-2 text-left">Type</th>
                <th class="pb-2 text-right">Sold</th>
                <th class="pb-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in overview.byType" :key="t.name"
                class="border-b border-gray-50">
                <td class="py-2 font-medium">{{ t.name }}</td>
                <td class="py-2 text-right tabular-nums">{{ t.sold }}</td>
                <td class="py-2 text-right font-bold text-brand-green tabular-nums">₦{{ fmtMoney(t.revenue) }}</td>
              </tr>
              <tr v-if="!overview.byType?.length">
                <td colspan="3" class="py-4 text-center text-gray-300 text-xs">No data</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- By category -->
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-4">Participants by Category</h3>
          <div class="space-y-3">
            <div v-for="c in overview.byCategory" :key="c.category"
              class="flex items-center gap-3">
              <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color || '#02462E' }"></span>
              <span class="flex-1 text-sm font-medium">{{ c.category }}</span>
              <span class="font-bold text-brand-green tabular-nums">{{ c.count }}</span>
              <span class="text-gray-400 text-xs tabular-nums w-28 text-right">₦{{ fmtMoney(c.revenue) }}</span>
            </div>
            <div v-if="!overview.byCategory?.length" class="text-center text-gray-300 text-xs py-4">No categories assigned</div>
          </div>
        </div>
      </div>

      <!-- Daily check-in report -->
      <div class="bg-white border border-gray-100 p-5">
        <h3 class="font-display font-bold text-brand-green mb-4">Daily Check-In Report</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-gray-100 text-xs text-gray-400 font-bold uppercase tracking-wide">
                <th class="pb-3 text-left">Date</th>
                <th class="pb-3 text-right">Checked In</th>
                <th class="pb-3 text-right">Checked Out</th>
                <th class="pb-3 text-right">Tickets Sold</th>
                <th class="pb-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in mergedDaily" :key="day.date"
                class="border-b border-gray-50 hover:bg-brand-cream/20">
                <td class="py-3 font-semibold">{{ fmtDate(day.date) }}</td>
                <td class="py-3 text-right font-bold text-brand-green tabular-nums">{{ day.checked_in ?? '—' }}</td>
                <td class="py-3 text-right text-gray-500 tabular-nums">{{ day.checked_out ?? '—' }}</td>
                <td class="py-3 text-right tabular-nums">{{ day.tickets_sold ?? '—' }}</td>
                <td class="py-3 text-right font-semibold text-brand-green tabular-nums">
                  {{ day.revenue ? `₦${fmtMoney(day.revenue)}` : '—' }}
                </td>
              </tr>
              <tr v-if="!mergedDaily.length">
                <td colspan="5" class="py-8 text-center text-gray-300 text-sm">No daily data yet.</td>
              </tr>
            </tbody>
            <tfoot v-if="mergedDaily.length" class="border-t-2 border-gray-200 font-bold">
              <tr>
                <td class="pt-3 text-sm font-bold text-gray-600">TOTAL</td>
                <td class="pt-3 text-right text-brand-green">{{ totalCheckedIn }}</td>
                <td class="pt-3 text-right text-gray-500">{{ totalCheckedOut }}</td>
                <td class="pt-3 text-right">{{ totalTickets }}</td>
                <td class="pt-3 text-right text-brand-green">₦{{ fmtMoney(totalRevenue) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Category per day breakdown -->
      <div v-if="daily.catPerDay?.length" class="bg-white border border-gray-100 p-5">
        <h3 class="font-display font-bold text-brand-green mb-4">Category Breakdown Per Day</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 text-xs text-gray-400 font-bold uppercase tracking-wide">
                <th class="pb-2 text-left">Date</th>
                <th class="pb-2 text-left">Category</th>
                <th class="pb-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in daily.catPerDay" :key="`${r.day_date}-${r.category}`"
                class="border-b border-gray-50">
                <td class="py-2 text-gray-500 text-xs">{{ fmtDate(r.day_date) }}</td>
                <td class="py-2">
                  <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-sm" :style="{ backgroundColor: r.color || '#02462E' }"></span>
                    {{ r.category }}
                  </span>
                </td>
                <td class="py-2 text-right font-bold tabular-nums">{{ r.count }}</td>
              </tr>
            </tbody>
          </table>
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
const overview      = ref({});
const daily         = ref({});

onMounted(async () => {
  const { data } = await api.get('/events');
  events.value = data.data || [];
  // Default to active event
  const active = events.value.find(e => e.status === 'active');
  if (active && !selectedEvent.value) { selectedEvent.value = active.id; load(); }
});

const load = async () => {
  if (!selectedEvent.value) return;
  loading.value = true;
  try {
    const [ovRes, dayRes] = await Promise.all([
      api.get(`/reports/${selectedEvent.value}/overview`),
      api.get(`/reports/${selectedEvent.value}/daily`),
    ]);
    overview.value = ovRes.data.data || {};
    daily.value    = dayRes.data.data || {};
  } catch { alert.error('Failed to load reports.'); }
  finally { loading.value = false; }
};

const mergedDaily = computed(() => {
  const checkinMap = {};
  (daily.value.checkinDays || []).forEach(d => {
    checkinMap[d.day_date] = { checked_in: d.checked_in, checked_out: d.checked_out };
  });
  const revMap = {};
  (daily.value.revDays || []).forEach(d => {
    revMap[d.sale_date] = { tickets_sold: d.tickets_sold, revenue: d.revenue };
  });
  const allDates = new Set([
    ...Object.keys(checkinMap),
    ...Object.keys(revMap),
  ]);
  return [...allDates].sort().map(date => ({
    date,
    ...(checkinMap[date] || {}),
    ...(revMap[date] || {}),
  }));
});

const totalCheckedIn  = computed(() => mergedDaily.value.reduce((s,d) => s + (d.checked_in||0), 0));
const totalCheckedOut = computed(() => mergedDaily.value.reduce((s,d) => s + (d.checked_out||0), 0));
const totalTickets    = computed(() => mergedDaily.value.reduce((s,d) => s + (d.tickets_sold||0), 0));
const totalRevenue    = computed(() => mergedDaily.value.reduce((s,d) => s + parseFloat(d.revenue||0), 0));

const fmtMoney = (n) => Number(n||0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-NG',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : '';

const printReport = () => window.print();
</script>

<style>
@media print {
  nav, header, select, button, .no-print { display: none !important; }
  #report-area { padding: 0; }
}
</style>
