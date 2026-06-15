<template>
  <div class="space-y-5">
    <!-- Tab nav -->
    <div class="border-b border-gray-200 flex gap-1 overflow-x-auto">
      <button v-for="tab in tabs" :key="tab.id"
        class="flex-shrink-0 px-5 pb-3 pt-1 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2"
        :class="activeTab===tab.id ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-400 hover:text-gray-700'"
        @click="activeTab=tab.id">
        <component :is="tab.icon" :size="14" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ── TAB: Overview ───────────────────────────────────── -->
    <div v-if="activeTab==='overview'" class="space-y-5">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsWidget label="Tickets Sold"   :value="stats.total_sold    ?? 0" :icon="Ticket"     />
        <StatsWidget label="Checked In"     :value="stats.checked_in    ?? 0" :icon="ShieldCheck" iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatsWidget label="Participants"   :value="stats.participants  ?? 0" :icon="Users"       iconBg="bg-blue-50"   iconColor="text-blue-600"  />
        <StatsWidget label="Revenue"        :value="fmtP(stats.total_revenue ?? 0)" :icon="Banknote"   iconBg="bg-yellow-50" iconColor="text-yellow-600" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Active event -->
        <div v-if="event" class="bg-brand-green text-white p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <p class="text-brand-gold text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Radio :size="11" class="animate-pulse" /> Active Event
              </p>
              <h2 class="font-display font-bold text-xl leading-tight">{{ event.title }}</h2>
              <p class="text-white/60 text-sm mt-1 flex items-center gap-1.5">
                <CalendarDays :size="12" /> {{ fmtDate(event.start_date) }} – {{ fmtDate(event.end_date) }}
              </p>
            </div>
            <span class="badge bg-green-500/20 text-green-300 text-xs flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> LIVE
            </span>
          </div>
          <div v-if="stats.participants" class="mb-4">
            <div class="flex justify-between text-xs text-white/50 mb-1.5">
              <span>Check-in progress</span>
              <span>{{ stats.checked_in ?? 0 }} / {{ stats.participants }}</span>
            </div>
            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full bg-brand-gold rounded-full transition-all duration-700"
                :style="{ width: `${Math.min(100,((stats.checked_in??0)/stats.participants)*100)}%` }"></div>
            </div>
          </div>
          <div class="flex gap-2 flex-wrap">
            <RouterLink :to="`/admin/events/${event.id}`" class="btn-gold text-xs py-2 px-4">
              <ArrowRight :size="12" /> Manage Event
            </RouterLink>
            <RouterLink to="/check-in" class="text-white/70 hover:text-white text-xs py-2 px-3 border border-white/20 flex items-center gap-1.5 transition-colors">
              <QrCode :size="12" /> Check-In Gate
            </RouterLink>
          </div>
        </div>
        <div v-else class="bg-gray-50 border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center">
          <CalendarX :size="40" class="text-gray-300 mb-3" />
          <p class="text-gray-500 text-sm font-semibold">No Active Event</p>
          <RouterLink to="/admin/events/new" class="btn-green text-xs mt-4">
            <Plus :size="13" /> Create Event
          </RouterLink>
        </div>

        <!-- Recent check-ins -->
        <div class="bg-white border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-bold text-base text-brand-green">Recent Check-ins</h3>
            <RouterLink to="/admin/attendance" class="text-xs text-brand-green hover:underline flex items-center gap-1">
              View all <ArrowRight :size="11" />
            </RouterLink>
          </div>
          <div v-if="recentCheckIns.length" class="space-y-2.5">
            <div v-for="c in recentCheckIns" :key="c.id"
              class="flex items-center gap-3 pb-2.5 border-b border-gray-50 last:border-0">
              <div class="w-8 h-8 bg-brand-cream flex items-center justify-center flex-shrink-0">
                <span class="text-brand-green font-bold text-sm">{{ c.name?.[0]?.toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ c.name }}</p>
                <p class="text-xs text-gray-400">{{ c.unique_number }}</p>
              </div>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ timeAgo(c.checked_in_at) }}</span>
            </div>
          </div>
          <div v-else-if="loading" class="flex justify-center py-8">
            <Loader :size="20" class="animate-spin text-gray-300" />
          </div>
          <p v-else class="text-sm text-gray-300 text-center py-6">No check-ins yet</p>
        </div>
      </div>
    </div>

    <!-- ── TAB: Finance / Expenses ──────────────────────────── -->
    <div v-if="activeTab==='finance'" class="space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsWidget label="Total Revenue"   :value="fmtP(stats.total_revenue ?? 0)" :icon="Banknote"     iconBg="bg-green-50"  iconColor="text-green-600" />
        <StatsWidget label="Balances Due"    :value="stats.partial_payments ?? 0"    :icon="AlertTriangle" iconBg="bg-red-50"    iconColor="text-red-500" />
        <StatsWidget label="Pending Expenses":value="pendingExpenses.length"          :icon="ReceiptText"   iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatsWidget label="Paid Out"        :value="fmtP(totalPaidExpenses)"         :icon="ArrowRight"    iconBg="bg-blue-50"   iconColor="text-blue-600" />
      </div>
      <div class="bg-white border border-gray-100 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-bold text-brand-green flex items-center gap-2">
            <Clock :size="16" class="text-yellow-600" /> Pending Expense Approvals
            <span v-if="pendingExpenses.length" class="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {{ pendingExpenses.length }}
            </span>
          </h3>
          <RouterLink to="/admin/expenses" class="text-xs text-brand-green hover:underline flex items-center gap-1">
            Manage all <ArrowRight :size="11" />
          </RouterLink>
        </div>
        <div v-if="pendingExpenses.length" class="space-y-2">
          <div v-for="e in pendingExpenses.slice(0,5)" :key="e.id"
            class="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div>
              <p class="text-sm font-semibold text-gray-800">{{ e.title }}</p>
              <p class="text-xs text-gray-400">{{ e.department_name }}</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-brand-green">₦{{ fmtP(e.amount_requested) }}</p>
              <span class="text-xs" :class="e.priority==='urgent'?'text-red-500 font-bold':'text-gray-400'">{{ e.priority }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-300 text-center py-6">No pending approvals</p>
      </div>
    </div>

    <!-- ── TAB: Participants / Categories ───────────────────── -->
    <div v-if="activeTab==='participants'" class="space-y-5">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsWidget label="Total Registered" :value="stats.total_sold ?? 0"    :icon="Users"      />
        <StatsWidget label="Checked In"        :value="stats.checked_in ?? 0"   :icon="ShieldCheck" iconBg="bg-green-50" iconColor="text-green-600" />
        <StatsWidget label="Tags Assigned"     :value="stats.tags_assigned ?? 0":icon="Tag"         iconBg="bg-yellow-50" iconColor="text-yellow-600" />
        <StatsWidget label="Partial Payments"  :value="stats.partial_payments ?? 0" :icon="AlertTriangle" iconBg="bg-red-50" iconColor="text-red-500" />
      </div>

      <!-- Category breakdown -->
      <div v-if="categoryStats.length" class="bg-white border border-gray-100 p-5">
        <h3 class="font-display font-bold text-brand-green mb-4 flex items-center gap-2">
          <Tag :size="16" /> Category Breakdown
        </h3>
        <div class="space-y-3">
          <div v-for="c in categoryStats" :key="c.name" class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
            <span class="text-sm font-semibold text-gray-700 w-40 truncate">{{ c.name }}</span>
            <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full" :style="{ backgroundColor: c.color, width: `${Math.min(100,((c.registered||0)/Math.max(1,stats.total_sold||1))*100)}%` }"></div>
            </div>
            <span class="text-sm font-bold text-gray-700 w-10 text-right">{{ c.registered || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Ticket type breakdown -->
      <div v-if="ticketTypeStats.length" class="bg-white border border-gray-100 p-5">
        <h3 class="font-display font-bold text-brand-green mb-4 flex items-center gap-2">
          <Ticket :size="16" /> Ticket Type Sales
        </h3>
        <div class="space-y-3">
          <div v-for="tt in ticketTypeStats" :key="tt.name" class="flex items-center gap-3">
            <span class="text-sm text-gray-600 w-44 truncate">{{ tt.name }}</span>
            <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-brand-green rounded-full"
                :style="{ width: `${tt.quantity_available ? Math.min(100,(tt.quantity_sold/tt.quantity_available)*100) : 0}%` }"></div>
            </div>
            <span class="text-sm font-bold text-brand-green w-24 text-right">{{ tt.quantity_sold }}{{ tt.quantity_available ? ` / ${tt.quantity_available}` : '' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: Programme ────────────────────────────────────── -->
    <div v-if="activeTab==='programme'" class="space-y-5">
      <div v-if="event" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-4 flex items-center gap-2">
            <LayoutList :size="16" /> Today's Schedule
          </h3>
          <div v-if="todaySessions.length" class="space-y-2">
            <div v-for="l in todaySessions" :key="l.id"
              class="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span class="text-brand-green font-semibold text-xs w-16 flex-shrink-0 pt-0.5">
                {{ l.start_time || '—' }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ l.title }}</p>
                <p v-if="l.main_speaker_name" class="text-xs text-gray-400">{{ l.main_speaker_name }}</p>
              </div>
              <a v-if="l.youtube_url" :href="l.youtube_url" target="_blank"
                class="text-red-500 flex-shrink-0" title="Watch recording">
                <Youtube :size="16" />
              </a>
            </div>
          </div>
          <p v-else class="text-sm text-gray-300 text-center py-6">No schedule for today</p>
          <RouterLink :to="event ? `/admin/events/${event.id}/schedule` : '/admin/events'"
            class="btn-outline text-xs mt-4 w-full justify-center">
            <Plus :size="12" /> Manage Full Schedule
          </RouterLink>
        </div>
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-4 flex items-center gap-2">
            <Mic :size="16" /> Speakers ({{ speakers.length }})
          </h3>
          <div class="space-y-2">
            <div v-for="s in speakers.slice(0,5)" :key="s.id"
              class="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
              <div class="w-8 h-8 bg-brand-cream flex items-center justify-center flex-shrink-0 text-brand-green font-bold text-sm">
                {{ s.name?.[0] }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ s.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ s.title }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-16 text-gray-300">
        <LayoutList :size="48" class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">No active event — create one to manage the programme.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  Ticket, ShieldCheck, Users, Banknote, Radio, ArrowRight, QrCode, CalendarX,
  Plus, Loader, ReceiptText, Clock, Tag, AlertTriangle, LayoutList, Mic, Youtube,
  CalendarDays,
} from 'lucide-vue-next';
import { useEventStore } from '@/stores/eventStore.js';
import StatsWidget from '@/components/admin/StatsWidget.vue';
import api from '@/composables/useApi.js';

const eventStore = useEventStore();
const event       = ref(null);
const loading     = ref(true);
const activeTab   = ref('overview');

const stats           = ref({ total_sold:0, checked_in:0, participants:0, total_revenue:0, partial_payments:0, tags_assigned:0 });
const recentCheckIns  = ref([]);
const pendingExpenses = ref([]);
const categoryStats   = ref([]);
const ticketTypeStats = ref([]);
const todaySessions   = ref([]);
const speakers        = ref([]);

const tabs = [
  { id:'overview',     label:'Overview',              icon: LayoutList   },
  { id:'finance',      label:'Finance & Expenses',    icon: Banknote     },
  { id:'participants', label:'Participants',           icon: Users        },
  { id:'programme',    label:'Programme',             icon: Mic          },
];

const totalPaidExpenses = computed(() =>
  pendingExpenses.value.reduce((s, e) => s + (e.status === 'paid' ? (e.amount_paid||0) : 0), 0)
);

onMounted(async () => {
  loading.value = true;
  try {
    await eventStore.fetchActiveEvent();
    event.value = eventStore.activeEvent;

    const promises = [
      api.get('/expenses?status=pending'),
    ];
    if (event.value) {
      const eid = event.value.id;
      promises.push(
        api.get(`/tickets/admin/stats/${eid}`),
        api.get(`/attendance/live/${eid}`),
        api.get(`/reports/${eid}/dashboard`),
        api.get(`/events/${eid}/schedule`),
        api.get(`/events/${eid}/speakers`),
      );
    }

    const results = await Promise.allSettled(promises);

    if (results[0]?.status === 'fulfilled') {
      pendingExpenses.value = results[0].value.data.data || [];
    }
    if (event.value) {
      if (results[1]?.status === 'fulfilled') {
        const s = results[1].value.data.data || {};
        stats.value = { ...stats.value, ...s };
      }
      if (results[2]?.status === 'fulfilled') {
        const live = results[2].value.data.data || {};
        stats.value.checked_in = live.checked_in || 0;
        stats.value.tags_assigned = live.tags_assigned || 0;
        recentCheckIns.value = live.recent || [];
      }
      if (results[3]?.status === 'fulfilled') {
        const dash = results[3].value.data.data || {};
        categoryStats.value   = dash.categories   || [];
        ticketTypeStats.value = dash.ticketTypes  || [];
      }
      if (results[4]?.status === 'fulfilled') {
        const schData = results[4].value.data.data;
        const allSess = Array.isArray(schData) ? schData : (schData?.lectures || []);
        // Today's sessions
        const todayStr = new Date().toISOString().slice(0,10);
        todaySessions.value = allSess.filter(l => !l.event_day_id || true).slice(0, 8);
      }
      if (results[5]?.status === 'fulfilled') {
        speakers.value = results[5].value.data.data || [];
      }
    }
  } catch (e) { console.error('Dashboard load error:', e); }
  finally { loading.value = false; }
});

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtP    = (n) => Number(n||0).toLocaleString('en-NG');
const timeAgo = (d) => {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  return `${Math.floor(m/60)}h ago`;
};
</script>
