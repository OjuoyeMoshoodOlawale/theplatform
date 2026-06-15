<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="font-display font-bold text-xl text-brand-green">Participants</h2>
      <div class="flex gap-2 flex-wrap">
        <button class="btn-outline text-xs" @click="smsModal=true">
          <MessageSquare :size="13" /> Bulk SMS
        </button>
        <RouterLink to="/admin/register" class="btn-green text-xs">
          <UserPlus :size="13" /> Manual Register
        </RouterLink>
      </div>
    </div>

    <!-- Filters bar -->
    <div class="bg-white border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-[180px]">
        <label class="label text-xs mb-1">Search</label>
        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="filters.search" class="input pl-8 text-sm"
            placeholder="Name, email, phone, ticket…"
            @input="debouncedLoad" />
        </div>
      </div>
      <div class="min-w-[140px]">
        <label class="label text-xs mb-1">Event</label>
        <select v-model="filters.event_id" class="input text-sm" @change="load">
          <option value="">All events</option>
          <option v-for="e in events" :key="e.id" :value="e.id">
            {{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}
          </option>
        </select>
      </div>
      <div class="min-w-[130px]">
        <label class="label text-xs mb-1">Category</label>
        <select v-model="filters.category_id" class="input text-sm" @change="load">
          <option value="">All categories</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="min-w-[130px]">
        <label class="label text-xs mb-1">Check-in Status</label>
        <select v-model="filters.checked_in" class="input text-sm" @change="load">
          <option value="">All</option>
          <option value="1">Checked In</option>
          <option value="0">Not Checked In</option>
        </select>
      </div>
      <button class="btn-ghost text-xs flex items-center gap-1" @click="clearFilters">
        <X :size="12" /> Clear
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white border border-gray-100 px-4 py-3 flex items-center gap-3">
        <Users :size="18" class="text-brand-green flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400">Total</p>
          <p class="font-bold text-brand-green">{{ pagination.total || 0 }}</p>
        </div>
      </div>
      <div class="bg-green-50 border border-green-100 px-4 py-3 flex items-center gap-3">
        <ShieldCheck :size="18" class="text-green-600 flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400">Checked In</p>
          <p class="font-bold text-green-700">{{ summaryStats.checked_in || 0 }}</p>
        </div>
      </div>
      <div class="bg-yellow-50 border border-yellow-100 px-4 py-3 flex items-center gap-3">
        <Banknote :size="18" class="text-yellow-600 flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400">Balances Due</p>
          <p class="font-bold text-yellow-700">{{ summaryStats.partial || 0 }}</p>
        </div>
      </div>
      <div class="bg-white border border-gray-100 px-4 py-3 flex items-center gap-3">
        <ReceiptText :size="18" class="text-brand-green flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400">Revenue</p>
          <p class="font-bold text-brand-green">₦{{ fmtP(summaryStats.revenue) }}</p>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white border border-gray-100 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-16">
        <Loader :size="28" class="animate-spin text-brand-green/40" />
      </div>
      <div v-else-if="rows.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-green text-white text-xs">
            <tr>
              <th class="px-4 py-3 text-left font-bold uppercase tracking-wider">Participant</th>
              <th class="px-4 py-3 text-left font-bold uppercase tracking-wider hidden md:table-cell">Ticket</th>
              <th class="px-4 py-3 text-left font-bold uppercase tracking-wider hidden lg:table-cell">Category</th>
              <th class="px-4 py-3 text-left font-bold uppercase tracking-wider">Payment</th>
              <th class="px-4 py-3 text-left font-bold uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-right font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id"
              class="border-b border-gray-50 hover:bg-brand-cream/20 transition-colors">
              <!-- Participant -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-brand-cream flex items-center justify-center flex-shrink-0">
                    <span class="font-bold text-brand-green text-xs">{{ r.name?.[0]?.toUpperCase() }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-800 truncate">{{ r.name }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ r.email }}</p>
                  </div>
                </div>
              </td>
              <!-- Ticket -->
              <td class="px-4 py-3 hidden md:table-cell">
                <p class="font-mono text-xs text-brand-green font-bold">{{ r.unique_number }}</p>
                <p class="text-xs text-gray-400">{{ r.ticket_type_name }}</p>
              </td>
              <!-- Category -->
              <td class="px-4 py-3 hidden lg:table-cell">
                <span v-if="r.category_name"
                  class="badge text-xs px-2 py-0.5"
                  :style="{ background: r.category_color + '22', color: r.category_color }">
                  {{ r.category_name }}
                </span>
                <span v-else class="text-gray-300 text-xs">—</span>
              </td>
              <!-- Payment -->
              <td class="px-4 py-3">
                <p class="font-semibold text-sm">₦{{ fmtP(r.amount_paid) }}</p>
                <p v-if="r.balance_due > 0" class="text-xs text-red-500 font-semibold flex items-center gap-1">
                  <AlertTriangle :size="10" /> ₦{{ fmtP(r.balance_due) }} bal.
                </p>
                <p v-else class="text-xs text-gray-400">{{ r.payment_method || 'paystack' }}</p>
              </td>
              <!-- Status -->
              <td class="px-4 py-3">
                <span v-if="r.checked_in_at"
                  class="badge bg-green-100 text-green-700 text-xs flex items-center gap-1 w-fit">
                  <ShieldCheck :size="9" />
                  In{{ r.checked_out_at ? ' (out)' : '' }}
                </span>
                <span v-else class="badge bg-gray-100 text-gray-400 text-xs">Not checked in</span>
              </td>
              <!-- Actions -->
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Check in -->
                  <button v-if="!r.checked_in_at"
                    class="inline-flex items-center gap-1 text-xs bg-brand-gold text-brand-green font-bold px-2.5 py-1.5 hover:bg-yellow-400 transition-colors"
                    title="Check In" @click="openCheckIn(r)">
                    <QrCode :size="12" /> Check In
                  </button>
                  <!-- Check out -->
                  <button v-if="r.checked_in_at && !r.checked_out_at"
                    class="inline-flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                    title="Check Out" @click="openCheckOut(r)">
                    <LogOut :size="12" /> Check Out
                  </button>
                  <!-- View ticket -->
                  <RouterLink :to="`/ticket/${r.unique_number}`" target="_blank"
                    class="text-gray-400 hover:text-brand-green transition-colors p-1.5" title="View Ticket">
                    <Eye :size="14" />
                  </RouterLink>
                  <!-- Certificate (visual page, with admin token for preview) -->
                  <a :href="certUrl(r.unique_number)" target="_blank"
                    class="text-gray-400 hover:text-brand-green transition-colors p-1.5" title="View / Print Certificate">
                    <Award :size="14" />
                  </a>
                  <!-- Email -->
                  <button class="text-gray-400 hover:text-brand-green transition-colors p-1.5"
                    title="Send Email" @click="emailParticipant(r)">
                    <Mail :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center text-gray-300">
        <Users :size="40" class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">No participants found.</p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
        <p class="text-xs text-gray-400">
          Showing {{ pagination.from }}–{{ pagination.to }} of {{ pagination.total }}
        </p>
        <div class="flex gap-1">
          <button v-for="p in pageRange" :key="p"
            class="w-8 h-8 text-xs font-semibold transition-colors"
            :class="p === pagination.page
              ? 'bg-brand-green text-white'
              : 'border border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'"
            @click="goPage(p)">{{ p }}</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Check-In Modal -->
  <AppModal v-model="checkInModal" title="Check In Participant" size="md">
    <div v-if="selected" class="space-y-4">
      <!-- Participant info -->
      <div class="bg-brand-cream p-4 flex items-center gap-4">
        <div class="w-12 h-12 bg-brand-green flex items-center justify-center flex-shrink-0">
          <span class="text-white font-bold text-xl">{{ selected.name?.[0]?.toUpperCase() }}</span>
        </div>
        <div>
          <p class="font-display font-bold text-brand-green text-lg">{{ selected.name }}</p>
          <p class="text-xs text-gray-500">{{ selected.unique_number }} · {{ selected.ticket_type_name }}</p>
        </div>
      </div>

      <!-- Tag assignment -->
      <div>
        <label class="label">Assign Event Tag <span class="text-gray-400 font-normal text-xs">(optional)</span></label>
        <div class="flex gap-2">
          <input v-model="checkInForm.tag_number" class="input flex-1 text-sm uppercase"
            placeholder="TAG-001" @input="checkInForm.tag_number = checkInForm.tag_number.toUpperCase()" />
          <button class="btn-outline text-xs px-3" @click="validateTag" :disabled="!checkInForm.tag_number">
            Validate
          </button>
        </div>
        <p v-if="tagStatus === 'valid'"   class="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 :size="11" /> Tag available</p>
        <p v-if="tagStatus === 'taken'"   class="text-xs text-red-500   mt-1 flex items-center gap-1"><XCircle :size="11" /> Tag already in use</p>
        <p v-if="tagStatus === 'checking'" class="text-xs text-gray-400 mt-1">Checking…</p>
      </div>

      <!-- Category assignment -->
      <div v-if="categories.length">
        <label class="label">Assign Category</label>
        <div class="grid grid-cols-2 gap-2">
          <label v-for="c in categories" :key="c.id"
            class="flex items-center gap-2 text-sm p-2.5 border-2 cursor-pointer rounded-sm transition-all"
            :class="checkInForm.category_id===c.id ? 'border-brand-green bg-brand-cream font-semibold' : 'border-gray-100 hover:border-gray-300'">
            <input type="radio" v-model="checkInForm.category_id" :value="c.id" class="accent-brand-green" />
            <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
            <span class="truncate">{{ c.name }}</span>
          </label>
        </div>
      </div>

      <!-- Hostel assignment — filtered by participant gender -->
      <div v-if="genderFilteredHostels.length">
        <label class="label">Assign Hostel <span class="text-gray-400 font-normal text-xs">(optional)</span></label>
        <select v-model="checkInForm.hostel_id" class="input text-sm">
          <option :value="null">No hostel assignment</option>
          <option v-for="h in genderFilteredHostels" :key="h.id" :value="h.id"
            :disabled="h.remaining <= 0">
            {{ h.name }} ({{ h.gender }}) — {{ h.remaining }} beds left
          </option>
        </select>
        <p v-if="!genderFilteredHostels.length" class="text-xs text-gray-400 mt-1">
          No hostels available for {{ selected?.gender || 'this participant' }}.
        </p>
        <input v-if="checkInForm.hostel_id" v-model="checkInForm.room_number"
          class="input text-sm mt-2" placeholder="Room number (optional)" />
      </div>

      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button class="btn-gold flex-1 justify-center py-3" :disabled="checkingIn" @click="doCheckIn">
          <component :is="checkingIn ? Loader : ShieldCheck" :size="16" :class="checkingIn?'animate-spin':''" />
          {{ checkingIn ? 'Checking in…' : 'Confirm Check In' }}
        </button>
        <button class="btn-ghost text-xs" @click="checkInModal=false">Cancel</button>
      </div>
    </div>
  </AppModal>

  <!-- Check-Out Modal -->
  <AppModal v-model="checkOutModal" title="Check Out Participant" size="sm">
    <div v-if="selected" class="space-y-4">
      <div class="bg-gray-50 p-4 text-center">
        <p class="font-bold text-xl text-brand-green">{{ selected.name }}</p>
        <p class="text-sm text-gray-500 mt-1">{{ selected.unique_number }}</p>
        <p class="text-xs text-gray-400 mt-2">Checked in at {{ fmtTime(selected.checked_in_at) }}</p>
      </div>
      <p class="text-sm text-gray-600 text-center">Confirm this participant is leaving the event?</p>
      <div class="flex gap-2">
        <button class="flex-1 py-3 bg-brand-green text-white font-bold text-sm hover:bg-opacity-90"
          :disabled="checkingOut" @click="doCheckOut">
          <component :is="checkingOut ? Loader : LogOut" :size="16" :class="checkingOut?'animate-spin':''" />
          {{ checkingOut ? 'Processing…' : 'Confirm Check Out' }}
        </button>
        <button class="btn-ghost text-xs" @click="checkOutModal=false">Cancel</button>
      </div>
    </div>
  </AppModal>

  <!-- Bulk SMS Modal -->
  <AppModal v-model="smsModal" title="Send Bulk SMS" size="md">
    <div class="space-y-4">
      <div class="bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
        SMS will be sent to all participants matching your current filters
        (event: {{ filters.event_id ? 'selected' : 'all' }},
        category: {{ filters.category_id ? 'selected' : 'all' }},
        status: {{ filters.checked_in || 'all' }}).
        <strong>{{ pagination.total || 0 }} recipients.</strong>
      </div>
      <div>
        <label class="label">Message <span class="text-red-500">*</span></label>
        <textarea v-model="smsForm.message" class="input text-sm" rows="4"
          placeholder="Type your SMS message here… (160 chars per SMS)"
          maxlength="320"></textarea>
        <p class="text-xs text-gray-400 mt-1 text-right">{{ smsForm.message.length }} / 320 chars</p>
      </div>
      <div class="flex gap-2 pt-2 border-t border-gray-100">
        <button class="btn-green text-xs flex items-center gap-2" :disabled="smsForm.sending || !smsForm.message"
          @click="sendBulkSms">
          <component :is="smsForm.sending ? Loader : MessageSquare" :size="14" :class="smsForm.sending?'animate-spin':''" />
          {{ smsForm.sending ? 'Sending…' : `Send to ${pagination.total||0} recipients` }}
        </button>
        <button class="btn-ghost text-xs" @click="smsModal=false">Cancel</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Users, UserPlus, Search, X, ShieldCheck, Banknote, ReceiptText,
  Loader, AlertTriangle, QrCode, LogOut, Eye, Mail, CheckCircle2, XCircle, Award, MessageSquare,
} from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import { useAuthStore }  from '@/stores/authStore.js';
import api from '@/composables/useApi.js';

const alert   = useAlertStore();
const auth    = useAuthStore();

const rows       = ref([]);
const events     = ref([]);
const categories = ref([]);
const availableHostels = ref([]);

const genderFilteredHostels = computed(() => {
  const gender = selected.value?.gender;
  if (!gender || gender === 'prefer_not_to_say') return availableHostels.value;
  return availableHostels.value.filter(h =>
    h.gender === 'mixed' || h.gender === gender
  );
});
const loading    = ref(false);
const pagination = ref({ total:0, page:1, pages:1, from:0, to:0 });
const summaryStats = ref({ checked_in:0, partial:0, revenue:0 });

const checkInModal  = ref(false);
const checkOutModal = ref(false);
const checkingIn    = ref(false);
const checkingOut   = ref(false);
const selected      = ref(null);
const tagStatus     = ref(''); // '', 'checking', 'valid', 'taken'

const filters = reactive({ search:'', event_id:'', category_id:'', checked_in:'', page:1 });
const checkInForm = reactive({ tag_number:'', category_id:null, hostel_id:null, room_number:'' });
const smsModal = ref(false);
const smsForm  = reactive({ message:'', sending:false });

let debounceTimer;
const debouncedLoad = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { filters.page=1; load(); }, 350);
};

const pageRange = computed(() => {
  const p = pagination.value; if (p.pages <= 1) return [];
  const start = Math.max(1, p.page - 2);
  const end   = Math.min(p.pages, p.page + 2);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

onMounted(async () => {
  const [evRes, catRes] = await Promise.all([
    api.get('/events'),
    api.get('/categories'),
  ]);
  events.value     = evRes.data.data  || [];
  categories.value = catRes.data.data || [];
  // Default to active event
  const active = events.value.find(e => e.status === 'active');
  if (active) { filters.event_id = active.id; }
  load();
});

const load = async () => {
  loading.value = true;
  try {
    const params = { page: filters.page, limit: 25 };
    if (filters.search)     params.search      = filters.search;
    if (filters.event_id)   params.event_id    = filters.event_id;
    if (filters.category_id)params.category_id = filters.category_id;
    if (filters.checked_in !== '') params.checked_in = filters.checked_in;

    const { data } = await api.get('/participants', { params });
    rows.value       = data.data       || [];
    pagination.value = data.pagination || {};
  } catch (e) {
    console.error('Load participants error:', e);
    rows.value = [];
  } finally {
    loading.value = false;
  }

  // Stats + hostels are loaded separately — a failure here must NOT blank the list
  if (filters.event_id) {
    try {
      const { data: s } = await api.get(`/tickets/admin/stats/${filters.event_id}`);
      summaryStats.value = {
        checked_in: s.data?.checked_in || 0,
        partial:    s.data?.partial_payments || 0,
        revenue:    s.data?.total_revenue || 0,
      };
    } catch (e) { console.error('Stats load error:', e); }
    try {
      const { data: h } = await api.get(`/hostels/event/${filters.event_id}/availability`);
      availableHostels.value = (h.data || []).filter(h => h.remaining > 0);
    } catch (e) { console.error('Hostel load error:', e); }
  }
};

const clearFilters = () => {
  Object.assign(filters, { search:'', category_id:'', checked_in:'', page:1 });
  load();
};

const goPage = (p) => { filters.page = p; load(); };

const fmtP    = (n) => Number(n||0).toLocaleString('en-NG');
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}) : '';

const openCheckIn = (row) => {
  selected.value = row;
  Object.assign(checkInForm, { tag_number:'', category_id: row.category_id||null, hostel_id:null, room_number:'' });
  tagStatus.value = '';
  checkInModal.value = true;
};

const openCheckOut = (row) => {
  selected.value = row;
  checkOutModal.value = true;
};

const validateTag = async () => {
  if (!checkInForm.tag_number || !filters.event_id) return;
  tagStatus.value = 'checking';
  try {
    const { data } = await api.get(`/tags/validate?tag=${checkInForm.tag_number}&event_id=${filters.event_id}`);
    tagStatus.value = data.data?.available ? 'valid' : 'taken';
  } catch { tagStatus.value = 'valid'; } // if endpoint doesn't exist yet, assume valid
};

const doCheckIn = async () => {
  if (!selected.value || checkingIn.value) return;
  if (tagStatus.value === 'taken') { alert.error('Tag is already in use. Please choose another.'); return; }

  checkingIn.value = true;
  try {
    // Assign category if changed
    if (checkInForm.category_id !== selected.value.category_id) {
      await api.patch(`/tickets/${selected.value.ticket_id}/category`,
        { category_id: checkInForm.category_id }).catch(()=>{});
    }

    // Check in
    await api.post('/attendance/checkin', {
      ticket_id:  selected.value.ticket_id,
      event_id:   filters.event_id || selected.value.event_id,
      tag_number: checkInForm.tag_number || null,
    });

    // Assign hostel
    if (checkInForm.hostel_id) {
      await api.post(`/tickets/${selected.value.ticket_id}/hostel`, {
        hostel_id:   checkInForm.hostel_id,
        event_id:    filters.event_id || selected.value.event_id,
        room_number: checkInForm.room_number || null,
      }).catch(()=>{});
    }

    alert.success(`${selected.value.name} checked in!`);
    checkInModal.value = false;
    load();
  } catch (e) { alert.error(e.response?.data?.message || 'Check-in failed.'); }
  finally { checkingIn.value = false; }
};

const doCheckOut = async () => {
  if (!selected.value || checkingOut.value) return;
  checkingOut.value = true;
  try {
    await api.post('/attendance/checkout', {
      ticket_id:     selected.value.ticket_id,
      attendance_id: selected.value.attendance_id,
    });
    alert.success(`${selected.value.name} checked out.`);
    checkOutModal.value = false;
    load();
  } catch (e) { alert.error(e.response?.data?.message || 'Check-out failed.'); }
  finally { checkingOut.value = false; }
};

const sendBulkSms = async () => {
  if (!smsForm.message.trim()) return;
  smsForm.sending = true;
  try {
    const params = {};
    if (filters.event_id)    params.event_id    = filters.event_id;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.checked_in === '1') params.checked_in = '1';
    if (filters.checked_in === '0') params.not_checked_in = '1';
    await api.post('/sms/bulk', { ...params, message: smsForm.message });
    alert.success('SMS queued for sending!');
    smsModal.value = false;
    smsForm.message = '';
  } catch (e) { alert.error(e.response?.data?.message || 'SMS failed.'); }
  finally { smsForm.sending = false; }
};

const emailParticipant = (row) => {
  window.open(`mailto:${row.email}?subject=Muslim Youth Summit`, '_blank');
};

// Build the VISUAL certificate page URL (not the /api data route), with the
// admin token so admins can preview before the event concludes.
const certUrl = (uniqueNumber) => {
  const token = auth.token || localStorage.getItem('mys_token') || '';
  const base  = `/certificate/${encodeURIComponent(uniqueNumber)}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};
</script>
