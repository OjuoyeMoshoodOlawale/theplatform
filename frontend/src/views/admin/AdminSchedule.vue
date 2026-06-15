<template>
  <div class="space-y-5">
    <!-- Header toolbar -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <RouterLink to="/admin/events" class="hover:text-brand-green">Events</RouterLink>
          <span>/</span>
          <RouterLink :to="`/admin/events/${eventId}`" class="hover:text-brand-green">Detail</RouterLink>
          <span>/</span>
          <span class="text-brand-green font-semibold">Schedule</span>
        </div>
        <h2 class="font-display font-bold text-xl text-brand-green">Event Schedule</h2>
        <p v-if="event" class="text-sm text-gray-500">{{ event.title }}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn-outline text-xs" @click="cloneModal=true">
          <Copy :size="14" /> Copy From Event
        </button>
        <button v-if="schedule.length" class="btn-outline text-xs border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-green"
          @click="sendReminders" :disabled="reminding">
          <component :is="reminding ? Loader : Bell" :size="14" :class="reminding?'animate-spin':''" />
          {{ reminding ? 'Sending…' : 'Email Facilitators' }}
        </button>
        <button v-if="schedule.length" class="btn-outline text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
          @click="sendSmsReminder" :disabled="smsReminding">
          <component :is="smsReminding ? Loader : MessageSquare" :size="14" :class="smsReminding?'animate-spin':''" />
          {{ smsReminding ? 'Sending…' : 'SMS Reminder' }}
        </button>
        <button class="btn-green text-xs" @click="openCreate">
          <Plus :size="14" /> Add Entry
        </button>
      </div>
    </div>

    <!-- Day tabs -->
    <div v-if="days.length" class="flex gap-2 flex-wrap">
      <button
        class="px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all border"
        :class="activeDay === null
          ? 'bg-brand-green text-white border-brand-green'
          : 'border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'"
        @click="activeDay = null">All Days</button>
      <button v-for="d in days" :key="d.id"
        class="px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all border"
        :class="activeDay === d.id
          ? 'bg-brand-green text-white border-brand-green'
          : 'border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'"
        @click="activeDay = d.id">
        Day {{ d.day_number }}
        <span class="font-normal normal-case ml-1 opacity-70">{{ fmt(d.event_date) }}</span>
      </button>
    </div>

    <!-- Schedule table -->
    <div class="bg-white border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" v-if="filteredSchedule.length">
          <thead class="bg-brand-green text-white">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-12">S/N</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Day / Time</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Lecture Title</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Lecturer</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Facilitators</th>
              <th class="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in filteredSchedule" :key="row.id"
              class="border-b border-gray-50 hover:bg-brand-cream/30 transition-colors">
              <!-- S/N -->
              <td class="px-4 py-3 text-center font-mono font-bold text-brand-gold">
                {{ row.s_n || (i + 1) }}
              </td>
              <!-- Day / Time -->
              <td class="px-4 py-3">
                <p v-if="row.day_number" class="text-xs font-bold text-brand-green uppercase tracking-wide">
                  Day {{ row.day_number }}
                  <span v-if="row.event_date" class="font-normal normal-case text-gray-400 ml-1">
                    — {{ fmt(row.event_date) }}
                  </span>
                </p>
                <p class="text-brand-green font-semibold text-sm mt-0.5">
                  <span v-if="row.start_time">{{ row.start_time }}</span>
                  <span v-if="row.start_time && row.end_time"> → {{ row.end_time }}</span>
                  <span v-if="!row.start_time" class="text-gray-300">—</span>
                </p>
              </td>
              <!-- Lecture Title -->
              <td class="px-4 py-3">
                <p class="font-semibold text-gray-800">{{ row.title }}</p>
                <span class="text-xs text-gray-400 capitalize">{{ row.lecture_type }}</span>
              </td>
              <!-- Lecturer -->
              <td class="px-4 py-3">
                <p class="font-medium text-gray-700">{{ row.main_speaker_name || row.speaker_names?.split('||')[0] || '—' }}</p>
              </td>
              <!-- Facilitators -->
              <td class="px-4 py-3 text-gray-500 text-xs leading-relaxed max-w-[200px]">
                {{ row.facilitators || '—' }}
              </td>
              <!-- Actions -->
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button class="text-xs text-brand-green hover:underline font-semibold"
                    @click="openEdit(row)">Edit</button>
                  <button class="text-xs text-red-400 hover:text-red-600 font-semibold"
                    @click="remove(row.id)">Del</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="py-16 text-center text-gray-400">
          
          <p class="text-sm">No schedule entries yet. Click "Add Entry" to start.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Entry modal (Create / Edit) -->
  <AppModal v-model="entryModal" :title="editing ? 'Edit Entry' : 'Add Schedule Entry'" size="xl">
    <form @submit.prevent="save" class="space-y-4" novalidate>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="label">S/N</label>
          <input v-model.number="form.s_n" type="number" min="1" class="input text-sm" />
        </div>
        <div>
          <label class="label">Day</label>
          <select v-model="form.event_day_id" class="input text-sm">
            <option value="">All-day / no specific day</option>
            <option v-for="d in days" :key="d.id" :value="d.id">
              Day {{ d.day_number }} — {{ fmt(d.event_date) }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Start Time</label>
          <input v-model="form.start_time" type="time" class="input text-sm" />
        </div>
        <div>
          <label class="label">End Time</label>
          <input v-model="form.end_time" type="time" class="input text-sm" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Lecture Title <span class="text-red-500">*</span></label>
          <input v-model="form.title" class="input" placeholder="Topic of the session…" />
          <p v-if="errs.title" class="text-red-500 text-xs mt-1">{{ errs.title }}</p>
        </div>
        <div>
          <label class="label">Type</label>
          <select v-model="form.lecture_type" class="input text-sm">
            <option v-for="t in types" :key="t" :value="t" class="capitalize">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="label">Lecturer / Main Speaker</label>
          <input v-model="form.main_speaker_name" class="input" placeholder="Sheikh / Dr. / Ust. …" />
        </div>
        <div class="md:col-span-2">
          <label class="label">Facilitators</label>
          <input v-model="form.facilitators" class="input" placeholder="Name 1, Name 2, Name 3 …" />
          <p class="text-xs text-gray-400 mt-1">Comma-separated names</p>
        </div>
        <div class="md:col-span-2">
          <label class="label">Description / Notes</label>
          <textarea v-model="form.description" class="input text-sm" rows="2"
            placeholder="Additional details about this session…"></textarea>
        </div>
      </div>

      <div class="flex gap-2 pt-2 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs px-6">
          {{ saving ? 'Saving…' : (editing ? 'Update Entry' : 'Add to Schedule') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="entryModal = false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <!-- Clone modal -->
  <AppModal v-model="cloneModal" title="Copy Schedule From Another Event" size="md">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">Select an event to copy its days and schedule into this event. Existing entries will be preserved.</p>
      <div>
        <label class="label">Source Event</label>
        <select v-model="cloneSource" class="input">
          <option value="">Select event…</option>
          <option v-for="e in otherEvents" :key="e.id" :value="e.id">{{ e.title }} ({{ e.edition }})</option>
        </select>
      </div>
      <div class="flex gap-2">
        <button :disabled="!cloneSource || cloning" class="btn-green text-xs"
          @click="doClone">{{ cloning ? 'Copying…' : 'Copy Schedule' }}</button>
        <button class="btn-ghost text-xs" @click="cloneModal = false">Cancel</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, Loader, Bell, Copy, Youtube, MessageSquare } from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const route   = useRoute();
const alert   = useAlertStore();
const eventId = route.params.id;

const schedule    = ref([]);
const days        = ref([]);
const event       = ref(null);
const otherEvents = ref([]);
const loading     = ref(false);
const saving      = ref(false);
const cloning     = ref(false);
const entryModal  = ref(false);
const cloneModal  = ref(false);
const editing     = ref(null);
const activeDay   = ref(null);
const cloneSource = ref('');

const types = ['lecture','keynote','panel','workshop','prayer','break','other'];

const form = reactive({
  s_n:'', event_day_id:'', start_time:'', end_time:'',
  title:'', lecture_type:'lecture',
  main_speaker_name:'', facilitators:'', description:'',
});
const errs = reactive({ title:'' });

const filteredSchedule = computed(() =>
  activeDay.value
    ? schedule.value.filter(s => s.event_day_id === activeDay.value)
    : schedule.value
);

const load = async () => {
  loading.value = true;
  try {
    const [evRes, schRes, dayRes] = await Promise.all([
      api.get(`/events/${eventId}`),
      api.get(`/events/${eventId}/schedule`),
      api.get(`/events/${eventId}/days`),
    ]);
    event.value    = evRes.data.data;
    schedule.value = schRes.data.data || [];
    days.value     = dayRes.data.data || [];
  } catch { alert.error('Failed to load schedule.'); }
  finally { loading.value = false; }
};

const loadOtherEvents = async () => {
  const { data } = await api.get('/events');
  otherEvents.value = (data.data || []).filter(e => e.id != eventId);
};

onMounted(() => { load(); loadOtherEvents(); });

const resetForm = () => {
  Object.assign(form, { s_n:'', event_day_id:'', start_time:'', end_time:'',
    title:'', lecture_type:'lecture', main_speaker_name:'', facilitators:'', description:'' });
  errs.title = '';
};

const openCreate = () => {
  editing.value = null;
  resetForm();
  form.s_n = (schedule.value.length || 0) + 1;
  entryModal.value = true;
};

const openEdit = (row) => {
  editing.value = row.id;
  Object.assign(form, {
    s_n:               row.s_n || '',
    event_day_id:      row.event_day_id || '',
    start_time:        row.start_time || '',
    end_time:          row.end_time || '',
    title:             row.title || '',
    lecture_type:      row.lecture_type || 'lecture',
    main_speaker_name: row.main_speaker_name || '',
    facilitators:      row.facilitators || '',
    description:       row.description || '',
  });
  errs.title = '';
  entryModal.value = true;
};

const save = async () => {
  errs.title = form.title.trim() ? '' : 'Title is required.';
  if (errs.title) return;
  saving.value = true;
  try {
    const payload = { ...form, event_day_id: form.event_day_id || null };
    if (editing.value) {
      await api.put(`/schedule/${editing.value}`, payload);
      alert.success('Entry updated.');
    } else {
      await api.post(`/events/${eventId}/schedule`, payload);
      alert.success('Entry added.');
    }
    entryModal.value = false;
    load();
  } catch (err) { alert.error(err.response?.data?.message || 'Save failed.'); }
  finally { saving.value = false; }
};

const remove = async (id) => {
  // removed browser confirm — use ConfirmModal in future
  try {
    await api.delete(`/schedule/${id}`);
    alert.success('Removed.'); load();
  } catch { alert.error('Delete failed.'); }
};

const reminding    = ref(false);
const smsReminding = ref(false);

const sendReminders = async () => {
  reminding.value = true;
  try {
    const { data } = await api.post(`/events/${eventId}/schedule/remind`);
    const { sent, failed, skipped } = data.data || {};
    alert.success(`Reminders sent: ${sent} delivered, ${failed||0} failed, ${skipped||0} skipped.`);
  } catch (err) { alert.error(err.response?.data?.message || 'Reminder send failed.'); }
  finally { reminding.value = false; }
};

const sendSmsReminder = async () => {
  smsReminding.value = true;
  try {
    const { data } = await api.post(`/sms/event-reminder/${eventId}`);
    alert.success(data.message || 'SMS reminders queued for all participants.');
  } catch (e) { alert.error(e.response?.data?.message || 'SMS reminder failed. Check Termii configuration.'); }
  finally { smsReminding.value = false; }
};

const doClone = async () => {
  if (!cloneSource.value) return;
  cloning.value = true;
  try {
    await api.post(`/events/${eventId}/schedule/clone`, {
      fromEventId: cloneSource.value,
      toEventId:   eventId,
    });
    alert.success('Schedule copied!'); cloneModal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Clone failed.'); }
  finally { cloning.value = false; }
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '';
</script>
