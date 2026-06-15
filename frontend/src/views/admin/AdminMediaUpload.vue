<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green flex items-center gap-2">
          <Youtube :size="20" class="text-red-500" /> Upload Recordings
        </h2>
        <p class="text-sm text-gray-500 mt-1">
          Add YouTube links for each session after recording is done.
          Links appear on the landing page and event schedule.
        </p>
      </div>
      <button v-if="selectedEvent && uploadedCount > 0"
        class="btn-green text-xs flex items-center gap-1.5" :disabled="notifying" @click="notifyAttendees">
        <component :is="notifying ? Loader : Mail" :size="14" :class="notifying?'animate-spin':''" />
        {{ notifying ? 'Sending…' : 'Notify Attendees' }}
      </button>
    </div>

    <!-- Event selector -->
    <div class="bg-white border border-gray-100 p-4 flex items-center gap-4 flex-wrap">
      <label class="label mb-0 flex-shrink-0">Event</label>
      <select v-model="selectedEvent" class="input text-sm max-w-xs" @change="load">
        <option value="">Select event…</option>
        <option v-for="e in events" :key="e.id" :value="e.id">
          {{ e.edition }} — {{ e.title }}
        </option>
      </select>
      <span v-if="saving" class="text-xs text-brand-gold flex items-center gap-1.5">
        <Loader :size="12" class="animate-spin" /> Saving…
      </span>
      <span v-if="saveMsg" class="text-xs text-green-600 flex items-center gap-1.5">
        <CheckCircle2 :size="12" /> {{ saveMsg }}
      </span>
    </div>

    <!-- Session list -->
    <div v-if="loading" class="flex justify-center py-16">
      <Loader :size="28" class="animate-spin text-brand-green/40" />
    </div>

    <div v-else-if="selectedEvent && sessions.length">
      <!-- Group by day -->
      <div v-for="day in groupedByDay" :key="day.day_id" class="space-y-3">
        <div class="flex items-center gap-3">
          <h3 class="font-display font-bold text-brand-green text-base">
            Day {{ day.day_number }}
            <span v-if="day.theme" class="text-gray-500 font-normal text-sm">— {{ day.theme }}</span>
          </h3>
          <span class="text-xs text-gray-400">{{ day.date }}</span>
          <div class="flex-1 h-px bg-gray-100"></div>
        </div>

        <div class="bg-white border border-gray-100 overflow-hidden">
          <div v-for="(session, idx) in day.sessions" :key="session.id"
            class="flex items-start gap-4 p-4"
            :class="idx < day.sessions.length - 1 ? 'border-b border-gray-50' : ''">

            <!-- Session info -->
            <div class="flex-shrink-0 w-14 text-center">
              <span class="text-brand-green font-bold text-sm font-mono">{{ session.start_time || '—' }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <p class="font-semibold text-gray-800 text-sm">{{ session.title }}</p>
                <span class="badge text-xs capitalize"
                  :class="{
                    'bg-blue-50 text-blue-700': session.lecture_type==='keynote',
                    'bg-purple-50 text-purple-700': session.lecture_type==='lecture',
                    'bg-green-50 text-green-700': session.lecture_type==='workshop',
                    'bg-gray-100 text-gray-500': ['prayer','break','other'].includes(session.lecture_type),
                  }">
                  {{ session.lecture_type }}
                </span>
              </div>
              <p v-if="session.main_speaker_name" class="text-xs text-gray-400 mb-2">
                {{ session.main_speaker_name }}
              </p>

              <!-- YouTube URL input -->
              <div v-if="!['prayer','break'].includes(session.lecture_type)"
                class="flex gap-2 items-center flex-wrap">
                <div class="relative flex-1 min-w-[240px]">
                  <Youtube :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
                  <input
                    v-model="session.youtube_url"
                    class="input pl-8 text-sm"
                    placeholder="https://youtube.com/watch?v=..."
                    @blur="saveSession(session)"
                    @keydown.enter.prevent="saveSession(session)"
                  />
                </div>
                <a v-if="session.youtube_url" :href="session.youtube_url" target="_blank"
                  class="btn-outline text-xs px-3 py-2 flex items-center gap-1.5 flex-shrink-0 text-red-500 border-red-200 hover:bg-red-50">
                  <ExternalLink :size="12" /> Watch
                </a>
                <span v-if="session._saved" class="text-xs text-green-600 flex items-center gap-1 flex-shrink-0">
                  <CheckCircle2 :size="12" /> Saved
                </span>
                <span v-if="session._error" class="text-xs text-red-500 flex-shrink-0">{{ session._error }}</span>
              </div>

              <!-- Prayer/break — no video needed -->
              <p v-else class="text-xs text-gray-300 italic">No recording for this session type</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="bg-brand-cream border border-brand-gold/30 p-4 flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2 text-sm text-brand-green font-semibold">
          <CheckCircle2 :size="16" class="text-green-500" />
          {{ uploadedCount }} of {{ uploadableSessions }} sessions have YouTube links
        </div>
        <div class="flex-1 h-2 bg-white border border-brand-gold/20 overflow-hidden max-w-xs">
          <div class="h-full bg-brand-gold transition-all duration-500"
            :style="{ width: `${Math.min(100, (uploadedCount/Math.max(1,uploadableSessions))*100)}%` }">
          </div>
        </div>
      </div>
    </div>

    <!-- No event selected -->
    <div v-else-if="!selectedEvent" class="bg-white border border-dashed border-gray-200 py-16 text-center">
      <Youtube :size="48" class="mx-auto mb-3 text-gray-200" />
      <p class="text-sm text-gray-400">Select an event above to manage its recordings.</p>
    </div>

    <!-- No sessions -->
    <div v-else class="bg-white border border-dashed border-gray-200 py-16 text-center">
      <Youtube :size="48" class="mx-auto mb-3 text-gray-200" />
      <p class="text-sm text-gray-400">No sessions found for this event.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Youtube, Loader, CheckCircle2, ExternalLink, Mail } from 'lucide-vue-next';
import { useAlertStore } from '@/stores/alertStore.js';
import { useEventStore } from '@/stores/eventStore.js';
import api from '@/composables/useApi.js';

const alert      = useAlertStore();
const eventStore = useEventStore();
const events     = ref([]);
const sessions   = ref([]);
const loading    = ref(false);
const saving     = ref(false);
const saveMsg    = ref('');
const selectedEvent = ref('');
const notifying     = ref(false);

onMounted(async () => {
  try {
    const { data } = await api.get('/events');
    events.value = data.data || [];
    // Default to active event
    const active = events.value.find(e => e.status === 'active');
    if (active) { selectedEvent.value = active.id; load(); }
  } catch { alert.error('Failed to load events.'); }
});

const load = async () => {
  if (!selectedEvent.value) return;
  loading.value = true;
  try {
    const { data } = await api.get(`/events/${selectedEvent.value}/schedule`);
    const raw = Array.isArray(data.data) ? data.data : (data.data?.lectures || data.data?.sessions || []);
    sessions.value = raw.map(s => ({ ...s, _saved: false, _error: '' }));
  } catch { alert.error('Failed to load schedule.'); }
  finally { loading.value = false; }
};

/* Group sessions by day */
const groupedByDay = computed(() => {
  const days = {};
  for (const s of sessions.value) {
    const key = s.event_day_id || 'no-day';
    if (!days[key]) {
      days[key] = {
        day_id:     s.event_day_id,
        day_number: s.day_number || '—',
        theme:      s.day_theme || s.theme || '',
        date:       s.event_date ? new Date(s.event_date).toLocaleDateString('en-NG', { day:'numeric', month:'long' }) : '',
        sessions:   [],
      };
    }
    days[key].sessions.push(s);
  }
  return Object.values(days).sort((a,b) => (a.day_number||0) - (b.day_number||0));
});

const uploadableSessions = computed(() =>
  sessions.value.filter(s => !['prayer','break'].includes(s.lecture_type)).length
);
const uploadedCount = computed(() =>
  sessions.value.filter(s => s.youtube_url && !['prayer','break'].includes(s.lecture_type)).length
);

const notifyAttendees = async () => {
  if (!selectedEvent.value) return;
  if (!confirm(`Email all checked-in attendees that ${uploadedCount.value} recording(s) are now available?`)) return;
  notifying.value = true;
  try {
    const { data } = await api.post(`/events/${selectedEvent.value}/notify-recordings`);
    alert.success(data.message || 'Attendees notified.');
  } catch (e) {
    alert.error(e.response?.data?.message || 'Failed to notify attendees.');
  } finally { notifying.value = false; }
};

/* Save a single session's YouTube URL */
const saveSession = async (session) => {
  session._saved = false;
  session._error = '';
  const url = session.youtube_url?.trim() || '';

  // Basic URL validation
  if (url && !url.startsWith('http')) {
    session._error = 'Must be a full URL (https://...)';
    return;
  }

  saving.value = true;
  try {
    await api.patch(`/schedule/${session.id}/youtube`, { youtube_url: url || null });
    session._saved = true;
    setTimeout(() => { session._saved = false; }, 3000);
    showSaveMsg();
  } catch (e) {
    session._error = e.response?.data?.message || 'Save failed';
  } finally { saving.value = false; }
};

let saveTimer;
const showSaveMsg = () => {
  saveMsg.value = 'All changes saved';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveMsg.value = ''; }, 3000);
};
</script>
