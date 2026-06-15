<template>
  <div class="min-h-screen bg-gray-900 text-white pb-24">
    <!-- Sticky header -->
    <div class="sticky top-0 z-20 bg-brand-green px-4 py-3 flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-2.5 min-w-0">
        <img src="/logos/logo-white.png" alt="MYS" class="h-8 flex-shrink-0" />
        <div class="min-w-0">
          <p class="text-white/40 text-[10px] uppercase tracking-widest leading-none">Check-In</p>
          <p class="font-bold text-sm truncate leading-tight">{{ eventStore.activeEvent?.title || 'No Active Event' }}</p>
        </div>
      </div>
      <RouterLink to="/admin/dashboard" class="text-white/50 hover:text-white text-xs flex items-center gap-1 flex-shrink-0">
        <LayoutGrid :size="14" /> <span class="hidden sm:inline">Admin</span>
      </RouterLink>
    </div>

    <div class="max-w-lg mx-auto px-4 pt-4 space-y-4">
      <!-- Live stats -->
      <div class="grid grid-cols-3 gap-2 sm:gap-3">
        <div class="bg-gray-800 py-3 px-2 text-center rounded-xl">
          <p class="font-display font-bold text-2xl sm:text-3xl text-brand-gold tabular-nums leading-none">{{ stats.checked_in ?? '—' }}</p>
          <p class="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1.5">Checked In</p>
        </div>
        <div class="bg-gray-800 py-3 px-2 text-center rounded-xl ring-1 ring-green-500/20">
          <p class="font-display font-bold text-2xl sm:text-3xl text-green-400 tabular-nums leading-none">{{ onPremises }}</p>
          <p class="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1.5">On-Site</p>
        </div>
        <div class="bg-gray-800 py-3 px-2 text-center rounded-xl">
          <p class="font-display font-bold text-2xl sm:text-3xl text-gray-400 tabular-nums leading-none">{{ stats.checked_out ?? '—' }}</p>
          <p class="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1.5">Out</p>
        </div>
      </div>

      <p v-if="sessionCheckins > 0" class="text-center text-brand-gold/80 text-xs">
        You've checked in <span class="font-bold">{{ sessionCheckins }}</span> {{ sessionCheckins === 1 ? 'person' : 'people' }} this session
      </p>

      <!-- Big lookup card -->
      <div class="bg-gray-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-display font-bold text-base flex items-center gap-2">
            <Search :size="18" class="text-brand-gold" /> Find Ticket
          </h2>
          <button class="text-xs text-gray-400 hover:text-brand-gold transition-colors flex items-center gap-1.5 py-1 px-2 -mr-2"
            @click="showScanner=!showScanner">
            <QrCode :size="15" />
            {{ showScanner ? 'Hide camera' : 'Scan QR' }}
          </button>
        </div>

        <!-- Camera scanner (toggle) -->
        <Transition name="slide-down">
          <div v-if="showScanner" class="rounded-xl overflow-hidden">
            <QrScanner @scan="handleScan" />
          </div>
        </Transition>

        <!-- Large manual entry -->
        <div class="space-y-2">
          <input v-model="manualInput" ref="inputEl"
            inputmode="text" autocomplete="off" autocapitalize="characters"
            class="w-full bg-gray-700 border-2 border-gray-600 focus:border-brand-gold text-white placeholder-gray-500 text-center text-lg font-mono py-3.5 rounded-xl outline-none transition-colors"
            :placeholder="ticketPlaceholder"
            @keyup.enter="lookup(manualInput)" />
          <button class="w-full bg-brand-gold text-brand-green font-display font-bold uppercase tracking-wide py-3.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            @click="lookup(manualInput)">
            <Search :size="18" /> Find Ticket
          </button>
        </div>
        <p class="text-[11px] text-gray-500 text-center leading-relaxed">
          Type the full number or just digits — prefix auto-completes.<br/>
          <span class="text-gray-400 font-mono">1</span> becomes
          <span class="text-brand-gold font-mono">{{ ticketPlaceholder }}</span>
        </p>
      </div>

      <!-- Found participant card -->
      <Transition name="slide-down">
        <div v-if="found" class="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl">
          <!-- Status banner -->
          <div class="py-2.5 px-4 text-sm font-bold uppercase tracking-wide text-center flex items-center justify-center gap-2"
            :class="{
              'bg-green-500 text-white':   found.check_in_at && !found.check_out_at,
              'bg-gray-400 text-white':    found.check_out_at,
              'bg-brand-gold text-brand-green': !found.check_in_at,
            }">
            <CheckCircle2 v-if="found.check_in_at && !found.check_out_at" :size="16" />
            <Ticket v-else-if="!found.check_in_at" :size="16" />
            <LogOut v-else :size="16" />
            {{ found.check_out_at ? 'Checked Out' : found.check_in_at ? 'Already Checked In' : 'Valid Ticket' }}
          </div>

          <div class="p-4 sm:p-5 space-y-4">
            <!-- Participant info -->
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                <span class="text-white font-bold text-2xl">{{ found.participant_name?.[0]?.toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-display font-bold text-xl text-brand-green truncate">{{ found.participant_name }}</h3>
                <p class="text-sm text-gray-500 truncate">{{ found.participant_email }}</p>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span class="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ found.unique_number }}</span>
                  <span class="text-xs text-gray-400">{{ found.ticket_type_name }}</span>
                  <span v-if="found.category_name" class="badge-gold text-xs">{{ found.category_name }}</span>
                </div>
              </div>
            </div>

            <!-- Not yet checked in — assign + check in -->
            <div v-if="!found.check_in_at" class="space-y-3">
              <!-- Tag input -->
              <div class="border border-gray-100 p-3 rounded-xl">
                <label class="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
                  <Tag :size="13" /> Assign Event Tag <span class="font-normal text-gray-400">(optional)</span>
                </label>
                <input v-model="tagInput" class="input text-base py-3"
                  placeholder="Scan or enter TAG-001"
                  @keyup.enter="doCheckIn" />
              </div>

              <!-- Category -->
              <div v-if="categories.length && !found.category_name" class="border border-gray-100 p-3 rounded-xl">
                <label class="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
                  <Users :size="13" /> Assign Category
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <label v-for="c in categories" :key="c.id"
                    class="flex items-center gap-2 text-sm p-2.5 border-2 cursor-pointer rounded-lg transition-all"
                    :class="selectedCategory===c.id ? 'border-brand-green bg-brand-cream font-semibold' : 'border-gray-100 active:border-gray-300'">
                    <input type="radio" v-model="selectedCategory" :value="c.id" class="accent-brand-green" />
                    <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
                    <span class="truncate">{{ c.name }}</span>
                  </label>
                </div>
              </div>

              <!-- Hostel -->
              <div v-if="hostels.length && !hostelAssignment" class="border border-gray-100 p-3 rounded-xl">
                <label class="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
                  <BedDouble :size="13" /> Assign Hostel <span class="font-normal text-gray-400">(optional)</span>
                </label>
                <div class="space-y-1.5">
                  <label v-for="h in filteredHostels" :key="h.id"
                    class="flex items-center justify-between p-3 border-2 cursor-pointer rounded-lg transition-all text-sm"
                    :class="[
                      selectedHostel===h.id ? 'border-brand-green bg-brand-cream' : 'border-gray-100 active:border-gray-300',
                      h.remaining <= 0 ? 'opacity-40 cursor-not-allowed' : ''
                    ]">
                    <div class="flex items-center gap-2">
                      <input type="radio" v-model="selectedHostel" :value="h.id" :disabled="h.remaining <= 0" class="accent-brand-green" />
                      <span class="font-medium">{{ h.name }}</span>
                      <span class="text-xs text-gray-400 capitalize">({{ h.gender }})</span>
                    </div>
                    <span class="text-xs" :class="h.remaining > 0 ? 'text-green-600 font-semibold' : 'text-red-500'">
                      {{ h.remaining > 0 ? `${h.remaining} left` : 'Full' }}
                    </span>
                  </label>
                </div>
                <input v-if="selectedHostel" v-model="roomNumber" class="input text-sm mt-2" placeholder="Room number (optional)" />
              </div>

              <div v-if="hostelAssignment" class="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 p-3 rounded-xl">
                <BedDouble :size="15" class="text-blue-500" />
                <span class="font-semibold text-blue-700">{{ hostelAssignment.hostel_name }}</span>
                <span v-if="hostelAssignment.room_number" class="text-blue-500">Room {{ hostelAssignment.room_number }}</span>
              </div>

              <button class="w-full py-4 bg-brand-green text-white font-display font-bold uppercase tracking-wider rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-lg"
                :class="{ 'opacity-70 cursor-wait': checkingIn }"
                :disabled="checkingIn" @click="doCheckIn">
                <CheckCircle2 :size="20" />
                {{ checkingIn ? 'Checking in…' : 'Check In' }}
              </button>
            </div>

            <!-- Already in — checkout -->
            <div v-else-if="!found.check_out_at" class="space-y-3">
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="bg-gray-50 p-3 rounded-xl">
                  <p class="text-xs text-gray-400 mb-1 flex items-center gap-1"><Tag :size="12" /> Tag</p>
                  <p class="font-semibold">{{ found.tag_number || '—' }}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl" v-if="hostelAssignment">
                  <p class="text-xs text-gray-400 mb-1 flex items-center gap-1"><BedDouble :size="12" /> Hostel</p>
                  <p class="font-semibold">{{ hostelAssignment.hostel_name }}</p>
                </div>
              </div>
              <div class="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 :size="13" class="text-green-500" /> Checked in at {{ fmtTime(found.check_in_at) }}
              </div>
              <button class="w-full py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl active:bg-red-100 active:text-red-700 transition-colors"
                :disabled="checkingOut" @click="doCheckOut">
                {{ checkingOut ? 'Processing…' : 'Check Out' }}
              </button>
            </div>

            <div v-else class="text-center py-3 text-gray-400 text-sm flex items-center justify-center gap-1.5">
              <LogOut :size="14" /> Checked out at {{ fmtTime(found.check_out_at) }}
            </div>

            <!-- Clear / next -->
            <button class="w-full text-gray-400 text-sm py-2 hover:text-gray-600 flex items-center justify-center gap-1.5"
              @click="clearFound">
              <X :size="14" /> Clear &amp; scan next
            </button>
          </div>
        </div>
      </Transition>

      <!-- Not found -->
      <Transition name="slide-down">
        <div v-if="notFoundMsg" class="bg-red-900/50 border border-red-700/60 rounded-2xl p-4 text-center">
          <XCircle :size="28" class="mx-auto mb-2 text-red-400" />
          <p class="font-semibold text-red-300">Ticket Not Found</p>
          <p class="text-sm text-gray-400 mt-1">{{ notFoundMsg }}</p>
        </div>
      </Transition>
    </div>

    <!-- Full-width success flash (fixed bottom, thumb-friendly) -->
    <Transition name="flash-up">
      <div v-if="successMsg"
        class="fixed bottom-0 inset-x-0 z-30 bg-green-600 px-5 py-4 flex items-center gap-3 shadow-2xl">
        <CheckCircle2 :size="24" class="text-white flex-shrink-0" />
        <p class="font-bold text-white text-base flex-1">{{ successMsg }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { QrCode, Tag, Users, BedDouble, Search, CheckCircle2, XCircle, Ticket, LogOut, X, LayoutGrid } from 'lucide-vue-next';
import QrScanner from '@/components/admin/QrScanner.vue';
import { useEventStore } from '@/stores/eventStore.js';
import api from '@/composables/useApi.js';

const route            = useRoute();
const eventStore       = useEventStore();
const showScanner      = ref(false);
const ticketPlaceholder = computed(() => {
  const prefix = (eventStore.activeEvent?.ticket_prefix || eventStore.activeEvent?.edition || 'MYS3').toUpperCase();
  const yy = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${yy}-000001`;
});
const manualInput      = ref('');
const inputEl          = ref(null);
const sessionScans     = ref(0);
const sessionCheckins  = ref(0);
const tagInput         = ref('');
const roomNumber       = ref('');
const found            = ref(null);
const notFoundMsg      = ref('');
const checkingIn       = ref(false);
const checkingOut      = ref(false);
const successMsg       = ref('');
const stats            = ref({});
const categories       = ref([]);
const hostels          = ref([]);
const hostelAssignment = ref(null);
const selectedCategory = ref(null);
const selectedHostel   = ref(null);

const onPremises = computed(() => Math.max(0, (stats.value.checked_in??0)-(stats.value.checked_out??0)));

// Filter hostels by participant gender if known
const filteredHostels = computed(() => {
  const gender = found.value?.gender;
  if (!gender || gender === 'prefer_not_to_say') return hostels.value;
  return hostels.value.filter(h => h.gender === 'mixed' || h.gender === gender);
});

let refreshTimer;
onMounted(async () => {
  await eventStore.fetchActiveEvent();
  refreshStats();
  refreshTimer = setInterval(refreshStats, 30_000);
  // Load global categories and hostels
  try {
    const [catRes, hosRes] = await Promise.all([
      api.get('/categories'),
      eventStore.activeEvent ? api.get(`/hostels/event/${eventStore.activeEvent.id}/availability`) : Promise.resolve({ data:{ data:[] } }),
    ]);
    categories.value = (catRes.data.data||[]).filter(c=>c.is_active);
    hostels.value    = hosRes.data.data||[];
  } catch {}

  // If a tag/ticket QR was scanned with a phone camera, it opens
  // /check-in?tag=TAG-001 — auto-look it up immediately.
  const q = route.query;
  const scanned = q.tag || q.ref || q.reference || q.ticket;
  if (scanned) lookup(String(scanned));

  // Focus input for immediate typing
  nextTick(() => { inputEl.value?.focus(); });
});
onUnmounted(()=>clearInterval(refreshTimer));

const refreshStats = async () => {
  if (!eventStore.activeEvent) return;
  try { const { data } = await api.get(`/attendance/live/${eventStore.activeEvent.id}`); stats.value = data.data||{}; }
  catch {}
};

const flash = (msg, ms=3500) => { successMsg.value=msg; setTimeout(()=>{ successMsg.value=''; },ms); };

/** QR codes may encode a full URL (e.g. .../ticket/MYS3-25-000001 or
 *  .../check-in?tag=TAG-001). Extract the usable identifier from any format. */
const handleScan = (text) => {
  let scanned = (text || '').trim();

  // Full URL → extract ticket number or tag
  try {
    if (scanned.startsWith('http')) {
      const url = new URL(scanned);
      // /ticket/MYS3-25-000001
      const ticketMatch = url.pathname.match(/\/ticket\/([^/]+)/i);
      if (ticketMatch) { scanned = decodeURIComponent(ticketMatch[1]); }
      // ?tag=TAG-001
      else if (url.searchParams.get('tag')) { scanned = url.searchParams.get('tag'); }
      // ?ref= or ?reference=
      else if (url.searchParams.get('ref') || url.searchParams.get('reference')) {
        scanned = url.searchParams.get('ref') || url.searchParams.get('reference');
      }
    }
  } catch { /* not a URL — use as-is */ }

  lookup(scanned);
};

/** Auto-format ticket number: add event prefix and dashes if missing */
const formatTicketNumber = (raw) => {
  let val = (raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!val) return '';

  const prefix = (eventStore.activeEvent?.ticket_prefix || eventStore.activeEvent?.edition || 'MYS3').toUpperCase();
  const yy = new Date().getFullYear().toString().slice(-2);

  // If user typed only digits (e.g. "1" or "000001") → build full number
  if (/^\d+$/.test(val)) {
    return `${prefix}-${yy}-${val.padStart(6, '0')}`;
  }
  // If they typed prefix + digits without dashes (e.g. "MYS3000001")
  const noDash = val.replace(/-/g, '');
  const m = noDash.match(/^([A-Z0-9]+?)(\d{2})(\d{6})$/);
  if (m && !val.includes('-')) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return val;
};

const lookup = async (input) => {
  const val = formatTicketNumber(input);
  if (!val) return;
  // Reflect the formatted value back so the user sees the corrected number
  manualInput.value = val;
  sessionScans.value++;
  notFoundMsg.value = '';
  found.value = null;
  hostelAssignment.value = null;
  // NOTE: do NOT clear manualInput here — keep it so user can retry without retyping
  try {
    const { data } = await api.get(`/tickets/by-number/${encodeURIComponent(val)}`);
    found.value = data.data; tagInput.value=''; selectedCategory.value=null; selectedHostel.value=null; roomNumber.value='';
    if (found.value?.id) {
      try {
        const { data: ha } = await api.get(`/tickets/${found.value.id}/hostel`);
        hostelAssignment.value = ha.data || null;
      } catch {}
    }
  } catch (err) {
    notFoundMsg.value = err.response?.data?.message || `Ticket "${val}" not found. Check the number and try again.`;
    // Keep manualInput intact so they can edit and retry — no auto-clear
  }
};

const doCheckIn = async () => {
  if (!found.value || checkingIn.value) return;
  checkingIn.value = true;

  // Assign category if selected
  if (selectedCategory.value) {
    try { await api.patch(`/tickets/${found.value.id}/category`, { category_id: selectedCategory.value }); }
    catch {}
  }

  // Check in
  try {
    await api.post('/attendance/checkin', {
      ticket_id:  found.value.id,
      event_id:   eventStore.activeEvent.id,
      tag_number: tagInput.value.trim() || null,
    });

    // Assign hostel if selected
    if (selectedHostel.value) {
      try {
        await api.post(`/tickets/${found.value.id}/hostel`, {
          hostel_id:   selectedHostel.value,
          event_id:    eventStore.activeEvent.id,
          room_number: roomNumber.value.trim() || null,
        });
      } catch {}
    }

    flash(`${found.value.participant_name} checked in!${tagInput.value ? ' Tag: '+tagInput.value.toUpperCase() : ''}`);
    sessionCheckins.value++;
    found.value=null; manualInput.value=''; refreshStats();
    // Auto-refocus the input for the next scan (high-volume gate flow)
    nextTick(() => { inputEl.value?.focus(); });

    // Refresh hostel availability
    if (eventStore.activeEvent) {
      try {
        const { data } = await api.get(`/hostels/event/${eventStore.activeEvent.id}/availability`);
        hostels.value = data.data||[];
      } catch {}
    }
  } catch (err) { alert(err.response?.data?.message||'Check-in failed.'); }
  finally { checkingIn.value=false; }
};

const doCheckOut = async () => {
  if (!found.value || checkingOut.value) return;
  checkingOut.value = true;
  try {
    await api.post('/attendance/checkout', { ticket_id: found.value.id, attendance_id: found.value.attendance_id });
    flash(`${found.value.participant_name} checked out.`);
    found.value=null; refreshStats();
  } catch (err) { alert(err.response?.data?.message||'Check-out failed.'); }
  finally { checkingOut.value=false; }
};

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}) : '';

const clearFound = () => {
  found.value = null;
  notFoundMsg.value = '';
  manualInput.value = '';
  nextTick(() => { inputEl.value?.focus(); });
};
</script>

<style scoped>
.slide-down-enter-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from   { opacity:0; transform:translateY(-16px); }
.slide-down-leave-to     { opacity:0; transform:translateY(-8px); }
.flash-up-enter-active   { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.flash-up-leave-active   { transition: all 0.25s ease; }
.flash-up-enter-from     { opacity:0; transform:translateY(100%); }
.flash-up-leave-to       { opacity:0; transform:translateY(100%); }
</style>
