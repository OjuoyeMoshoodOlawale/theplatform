<template>
  <div class="space-y-6">
    <div v-if="loading" class="flex justify-center py-20">
      <Loader :size="32" class="animate-spin text-brand-green/40" />
    </div>

    <template v-else-if="event">
      <!-- Header -->
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <RouterLink to="/admin/events" class="hover:text-brand-green">Events</RouterLink>
            <span>/</span>
            <span class="text-brand-green font-semibold truncate">{{ event.title }}</span>
          </div>
          <h2 class="font-display font-bold text-2xl text-brand-green">{{ event.title }}</h2>
          <div class="flex items-center gap-3 mt-2 flex-wrap">
            <span class="badge" :class="statusClass(event.status)">{{ event.status }}</span>
            <span class="text-sm text-gray-500">{{ event.edition }} · {{ fmt(event.start_date) }} – {{ fmt(event.end_date) }}</span>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button v-if="event.status==='draft'"
            class="btn-green text-xs flex items-center gap-1.5" @click="setStatus('active')">
            <Radio :size="12" /> Activate
          </button>
          <button v-if="event.status==='active'"
            class="btn-outline text-xs" @click="setStatus('completed')">
            <CheckCircle2 :size="12" /> Complete
          </button>
          <button class="btn-outline text-xs flex items-center gap-1.5" @click="openEditEvent">
            <Pencil :size="12" /> Edit Event
          </button>
          <button class="btn-outline text-xs border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-green flex items-center gap-1.5"
            @click="cloneDialog=true">
            <Copy :size="12" /> Clone
          </button>
          <button class="text-red-400 hover:text-red-600 text-xs border border-red-200 px-3 py-1.5 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
            @click="promptDeleteEvent">
            <Trash2 :size="12" /> Delete
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 flex gap-0 text-sm flex-wrap">
        <button v-for="tab in tabs" :key="tab.id"
          class="px-5 pb-3 pt-1 font-semibold border-b-2 transition-colors flex items-center gap-1.5"
          :class="activeTab===tab.id ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab=tab.id">
          <component :is="tab.icon" :size="13" />{{ tab.label }}
        </button>
        <div class="ml-auto flex items-center gap-3 pb-2">
          <RouterLink :to="`/admin/events/${id}/ticket-types`"
            class="text-xs text-brand-gold hover:text-yellow-600 flex items-center gap-1 font-semibold">
            <Ticket :size="13" /> Pricing →
          </RouterLink>
          <RouterLink :to="`/admin/events/${id}/schedule`"
            class="text-xs text-brand-green hover:text-brand-green/70 flex items-center gap-1 font-semibold">
            <CalendarCheck :size="13" /> Full Schedule →
          </RouterLink>
        </div>
      </div>

      <!-- Overview tab -->
      <div v-if="activeTab==='overview'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-gray-100 p-6 space-y-4">
          <h3 class="font-display font-bold text-brand-green flex items-center justify-between">
            Event Details
            <button class="text-xs text-brand-green hover:underline flex items-center gap-1" @click="openEditEvent">
              <Pencil :size="11" /> Edit
            </button>
          </h3>
          <dl class="space-y-3 text-sm">
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">Tagline</dt><dd class="text-gray-700">{{ event.tagline||'—' }}</dd></div>
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">Venue</dt><dd class="text-gray-700">{{ event.venue||'—' }}</dd></div>
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">Address</dt><dd class="text-gray-700">{{ event.venue_address||'—' }}</dd></div>
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">Start Date</dt><dd>{{ fmt(event.start_date) }}</dd></div>
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">End Date</dt><dd>{{ fmt(event.end_date) }}</dd></div>
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">Early Bird</dt><dd>{{ event.early_bird_closes_at ? fmt(event.early_bird_closes_at) : '—' }}</dd></div>
            <div class="flex gap-3"><dt class="text-gray-400 w-28 flex-shrink-0">Ticket Prefix</dt><dd class="font-mono text-xs">{{ event.ticket_prefix || event.edition }}</dd></div>
          </dl>
          <div v-if="event.description" class="pt-3 border-t border-gray-50">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Description</p>
            <p class="text-sm text-gray-600 leading-relaxed">{{ event.description }}</p>
          </div>
        </div>

        <div class="bg-white border border-gray-100 p-6">
          <h3 class="font-display font-bold text-brand-green mb-4">Stats</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-brand-cream p-4 text-center">
              <p class="font-display font-bold text-3xl text-brand-green">{{ event.stats?.total_sold || 0 }}</p>
              <p class="text-xs text-gray-500 mt-1">Tickets Sold</p>
            </div>
            <div class="bg-brand-cream p-4 text-center">
              <p class="font-display font-bold text-xl text-brand-green">₦{{ fmtP(event.stats?.total_revenue || 0) }}</p>
              <p class="text-xs text-gray-500 mt-1">Revenue</p>
            </div>
          </div>
          <!-- Event days -->
          <div class="mt-5">
            <div class="flex items-center justify-between mb-3">
              <p class="font-semibold text-sm text-gray-700">Event Days</p>
              <button class="text-xs text-brand-green flex items-center gap-1 hover:underline" @click="openAddDay">
                <Plus :size="11" /> Add Day
              </button>
            </div>
            <div class="space-y-2">
              <div v-for="d in event.days" :key="d.id"
                class="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <span class="font-bold text-brand-green text-sm">Day {{ d.day_number }}</span>
                  <span class="text-gray-500 text-xs ml-2">{{ fmt(d.event_date) }}</span>
                  <span v-if="d.theme" class="text-xs text-gray-400 ml-2">— {{ d.theme }}</span>
                </div>
                <div class="flex gap-2">
                  <button class="text-brand-green hover:opacity-70" @click="openEditDay(d)"><Pencil :size="12" /></button>
                  <button class="text-gray-400 hover:text-red-400" @click="promptDeleteDay(d)"><Trash2 :size="12" /></button>
                </div>
              </div>
              <p v-if="!event.days?.length" class="text-xs text-gray-400">No days defined yet.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Speakers tab -->
      <div v-if="activeTab==='speakers'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display font-bold text-brand-green">Speakers / Scholars</h3>
          <button class="btn-green text-xs" @click="openAddSpeaker">
            <Plus :size="13" /> Add Speaker
          </button>
        </div>
        <div v-if="event.speakers?.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="s in event.speakers" :key="s.id"
            class="bg-white border border-gray-100 p-4 flex items-start gap-4">
            <div class="w-14 h-14 bg-brand-cream flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img v-if="s.photo_url" :src="s.photo_url" :alt="s.name" class="w-full h-full object-cover" />
              <span v-else class="font-bold text-brand-green text-xl">{{ s.name?.[0] }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-display font-bold text-brand-green truncate">{{ s.name }}</p>
              <p class="text-xs text-gray-500">{{ s.title }}</p>
              <p v-if="s.email" class="text-xs text-gray-400 flex items-center gap-1 mt-1"><Mail :size="10" /> {{ s.email }}</p>
              <p v-if="s.phone" class="text-xs text-gray-400 flex items-center gap-1"><Phone :size="10" /> {{ s.phone }}</p>
              <p v-if="s.bio" class="text-xs text-gray-400 mt-1.5 line-clamp-2">{{ s.bio }}</p>
            </div>
            <div class="flex flex-col gap-1.5 flex-shrink-0">
              <button class="text-brand-green hover:opacity-70" @click="openEditSpeaker(s)" title="Edit">
                <Pencil :size="13" />
              </button>
              <button class="text-gray-400 hover:text-red-400" @click="promptDeleteSpeaker(s)" title="Delete">
                <Trash2 :size="13" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="bg-white border border-dashed border-gray-200 py-12 text-center">
          <Mic :size="40" class="mx-auto mb-3 text-gray-300" />
          <p class="text-sm text-gray-400">No speakers added yet.</p>
        </div>
      </div>

      <!-- Schedule preview tab -->
      <div v-if="activeTab==='schedule'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display font-bold text-brand-green">Schedule Preview</h3>
          <RouterLink :to="`/admin/events/${id}/schedule`" class="btn-green text-xs">
            <CalendarCheck :size="13" /> Full Schedule Editor
          </RouterLink>
        </div>
        <div v-if="event.lectures?.length" class="bg-white border border-gray-100 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="px-3 py-2.5 text-left text-xs font-bold uppercase text-gray-400 w-8">S/N</th>
                <th class="px-3 py-2.5 text-left text-xs font-bold uppercase text-gray-400 w-24">Time</th>
                <th class="px-3 py-2.5 text-left text-xs font-bold uppercase text-gray-400">Session</th>
                <th class="px-3 py-2.5 text-left text-xs font-bold uppercase text-gray-400 hidden md:table-cell">Speaker</th>
                <th class="px-3 py-2.5 text-left text-xs font-bold uppercase text-gray-400 hidden lg:table-cell">Facilitators</th>
                <th class="px-3 py-2.5 text-right text-xs font-bold uppercase text-gray-400">YouTube</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in event.lectures" :key="l.id"
                class="border-b border-gray-50 hover:bg-gray-50">
                <td class="px-3 py-2.5 font-mono text-xs text-brand-gold font-bold text-center">{{ l.s_n }}</td>
                <td class="px-3 py-2.5 text-xs text-brand-green font-semibold">{{ l.start_time||'—' }}</td>
                <td class="px-3 py-2.5">
                  <p class="font-semibold text-gray-800 text-sm">{{ l.title }}</p>
                  <span class="text-xs text-gray-400 capitalize">{{ l.lecture_type }}</span>
                </td>
                <td class="px-3 py-2.5 text-gray-500 text-xs hidden md:table-cell">{{ l.main_speaker_name||'—' }}</td>
                <td class="px-3 py-2.5 text-gray-400 text-xs hidden lg:table-cell truncate max-w-[150px]">{{ l.facilitators||'—' }}</td>
                <td class="px-3 py-2.5 text-right">
                  <a v-if="l.youtube_url" :href="l.youtube_url" target="_blank"
                    class="text-red-500 hover:text-red-600 inline-flex items-center gap-1 text-xs font-semibold">
                    <Youtube :size="13" /> Watch
                  </a>
                  <span v-else class="text-gray-300 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="bg-white border border-dashed border-gray-200 py-12 text-center">
          <CalendarCheck :size="40" class="mx-auto mb-3 text-gray-300" />
          <p class="text-sm text-gray-400">No schedule yet.</p>
          <RouterLink :to="`/admin/events/${id}/schedule`" class="btn-green text-xs mt-4 inline-flex">
            <Plus :size="13" /> Start Building Schedule
          </RouterLink>
        </div>
      </div>
    </template>

    <div v-else-if="!loading" class="text-center py-20 text-gray-400">
      <p>Event not found.</p>
      <RouterLink to="/admin/events" class="btn-green text-xs mt-4 inline-flex">Back to Events</RouterLink>
    </div>
  </div>

  <!-- Edit Event Modal -->
  <AppModal v-model="editEventModal" title="Edit Event Details" size="xl">
    <form @submit.prevent="saveEvent" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Event Title <span class="text-red-500">*</span></label>
          <input v-model="eventForm.title" class="input" placeholder="Muslim Youth Summit 3.0" />
        </div>
        <div>
          <label class="label">Edition <span class="text-red-500">*</span></label>
          <input v-model="eventForm.edition" class="input" placeholder="MYS3" />
        </div>
        <div>
          <label class="label">Ticket Prefix</label>
          <input v-model="eventForm.ticket_prefix" class="input" placeholder="MYS3 (used in ticket numbers)" />
        </div>
        <div>
          <label class="label">Start Date <span class="text-red-500">*</span></label>
          <input v-model="eventForm.start_date" type="date" class="input" />
        </div>
        <div>
          <label class="label">End Date <span class="text-red-500">*</span></label>
          <input v-model="eventForm.end_date" type="date" class="input" />
        </div>
        <div>
          <label class="label">Venue</label>
          <input v-model="eventForm.venue" class="input" placeholder="Lagos City Hall" />
        </div>
        <div>
          <label class="label">Early Bird Closes</label>
          <input v-model="eventForm.early_bird_closes_at" type="datetime-local" class="input" />
        </div>
        <div class="md:col-span-2">
          <label class="label">Venue Address</label>
          <input v-model="eventForm.venue_address" class="input" placeholder="25 Catholic Mission Street, Lagos Island" />
        </div>
        <div class="md:col-span-2">
          <label class="label">Tagline</label>
          <input v-model="eventForm.tagline" class="input" placeholder="Rooted in Faith. Rising in Excellence." />
        </div>
        <div class="md:col-span-2">
          <label class="label">Description</label>
          <textarea v-model="eventForm.description" class="input" rows="4"
            placeholder="Full event description — shown on landing page…" />
        </div>
        <div class="md:col-span-2">
          <label class="label">Status</label>
          <select v-model="eventForm.status" class="input w-40">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : 'Update Event' }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="editEventModal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <!-- Add/Edit Speaker Modal -->
  <AppModal v-model="speakerModal" :title="editingSpeaker ? 'Edit Speaker' : 'Add Speaker'" size="lg">
    <form @submit.prevent="saveSpeaker" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Full Name <span class="text-red-500">*</span></label>
          <input v-model="speakerForm.name" class="input" placeholder="Sheikh / Dr. / Engr. Full Name" />
        </div>
        <div>
          <label class="label">Title / Role</label>
          <input v-model="speakerForm.title" class="input" placeholder="Islamic Scholar, CEO, Dr.…" />
        </div>
        <div>
          <label class="label">Photo URL</label>
          <input v-model="speakerForm.photo_url" class="input" placeholder="https://…" />
        </div>
        <div>
          <label class="label">Email <span class="text-gray-400 font-normal text-xs">(for future contact)</span></label>
          <input v-model="speakerForm.email" type="email" class="input" />
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="speakerForm.phone" class="input" placeholder="080XXXXXXXXX" />
        </div>
      </div>
      <div>
        <label class="label">Biography / Introduction</label>
        <textarea v-model="speakerForm.bio" class="input" rows="4"
          placeholder="Brief professional bio, achievements, why they're speaking…" />
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : (editingSpeaker ? 'Update Speaker' : 'Add Speaker') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="speakerModal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <!-- Add/Edit Event Day Modal -->
  <AppModal v-model="dayModal" :title="editingDay ? 'Edit Day' : 'Add Event Day'" size="md">
    <form @submit.prevent="saveDay" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Day Number <span class="text-red-500">*</span></label>
          <input v-model.number="dayForm.day_number" type="number" min="1" class="input" />
        </div>
        <div>
          <label class="label">Date <span class="text-red-500">*</span></label>
          <input v-model="dayForm.event_date" type="date" class="input" />
        </div>
      </div>
      <div>
        <label class="label">Theme / Title</label>
        <input v-model="dayForm.theme" class="input" placeholder="e.g. Knowledge & Reformation" />
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : (editingDay ? 'Update Day' : 'Add Day') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="dayModal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <!-- Clone modal -->
  <AppModal v-model="cloneDialog" title="Clone This Event" size="md">
    <div class="space-y-4">
      <p class="text-sm text-gray-600">Creates a new draft event with the same speakers and schedule.</p>
      <div>
        <label class="label">New Title</label>
        <input v-model="cloneForm.title" class="input" :placeholder="`${event?.title} — Clone`" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">New Edition</label>
          <input v-model="cloneForm.edition" class="input" placeholder="MYS4" />
        </div>
        <div>
          <label class="label">New Start Date</label>
          <input v-model="cloneForm.start_date" type="date" class="input" />
        </div>
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button :disabled="cloning" class="btn-green text-xs flex items-center gap-2" @click="doClone">
          <component :is="cloning ? Loader : Copy" :size="14" :class="cloning?'animate-spin':''" />
          {{ cloning ? 'Cloning…' : 'Clone Event' }}
        </button>
        <button class="btn-ghost text-xs" @click="cloneDialog=false">Cancel</button>
      </div>
    </div>
  </AppModal>

  <!-- Delete confirmations -->
  <ConfirmModal v-model="deleteEventModal" title="Delete Event"
    :message="`Delete '${event?.title}'? All tickets, schedule, and data will be permanently lost.`"
    type="danger" confirm-label="Yes, Delete Event" :loading="deleteBusy" @confirm="doDeleteEvent" />
  <ConfirmModal v-model="deleteSpeakerModal" :title="`Remove ${deletingSpeaker?.name}?`"
    message="This removes the speaker from this event." type="danger" confirm-label="Remove"
    :loading="deleteBusy" @confirm="doDeleteSpeaker" />
  <ConfirmModal v-model="deleteDayModal" :title="`Delete Day ${deletingDay?.day_number}?`"
    message="Sessions assigned to this day will lose their day reference." type="danger"
    confirm-label="Delete Day" :loading="deleteBusy" @confirm="doDeleteDay" />
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  Loader, Pencil, Trash2, Copy, Plus, Save, Radio, CheckCircle2,
  CalendarCheck, Ticket, Mic, Mail, Phone, Youtube,
} from 'lucide-vue-next';
import AppModal     from '@/components/common/AppModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const routerRef = useRouter();
const routeRef  = useRoute();
const router = routerRef;
// Get event id from route params — accessible in template as 'id'
const id    = routeRef.params.id;
const props = { id };
const alert  = useAlertStore();

const event   = ref(null);
const loading = ref(true);
const saving  = ref(false);
const deleteBusy = ref(false);
const activeTab  = ref('overview');
const cloneDialog     = ref(false);
const cloning         = ref(false);
const editEventModal  = ref(false);
const speakerModal    = ref(false);
const dayModal        = ref(false);
const deleteEventModal   = ref(false);
const deleteSpeakerModal = ref(false);
const deleteDayModal     = ref(false);
const editingSpeaker  = ref(null);
const editingDay      = ref(null);
const deletingSpeaker = ref(null);
const deletingDay     = ref(null);

const tabs = [
  { id:'overview',  label:'Overview', icon: CalendarCheck },
  { id:'speakers',  label:'Speakers', icon: Mic           },
  { id:'schedule',  label:'Schedule', icon: Ticket        },
];

const eventForm  = reactive({ title:'', edition:'', ticket_prefix:'', tagline:'', description:'', venue:'', venue_address:'', start_date:'', end_date:'', early_bird_closes_at:'', status:'draft' });
const speakerForm= reactive({ name:'', title:'', bio:'', photo_url:'', email:'', phone:'', sort_order:0 });
const dayForm    = reactive({ day_number:1, event_date:'', theme:'' });
const cloneForm  = reactive({ title:'', edition:'', start_date:'', end_date:'' });

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get(`/events/${props.id}`);
    event.value = data.data;
  } catch { alert.error('Failed to load event.'); }
  finally { loading.value = false; }
};

onMounted(load);

const fmt    = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtP   = (n) => Number(n||0).toLocaleString('en-NG');

const statusClass = (s) => ({
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-red-100 text-red-600',
}[s] ?? '');

/* ─── Edit Event ───────────────────────────────────────────── */
const openEditEvent = () => {
  const e = event.value;
  Object.assign(eventForm, {
    title: e.title, edition: e.edition, ticket_prefix: e.ticket_prefix||'',
    tagline: e.tagline||'', description: e.description||'',
    venue: e.venue||'', venue_address: e.venue_address||'',
    start_date: e.start_date, end_date: e.end_date,
    early_bird_closes_at: e.early_bird_closes_at?.slice(0,16)||'',
    status: e.status,
  });
  editEventModal.value = true;
};

const saveEvent = async () => {
  saving.value = true;
  try {
    await api.put(`/events/${props.id}`, eventForm);
    alert.success('Event updated.');
    editEventModal.value = false;
    load();
  } catch (e) { alert.error(e.response?.data?.message || 'Update failed.'); }
  finally { saving.value = false; }
};

const setStatus = async (status) => {
  try { await api.patch(`/events/${props.id}/status`, { status }); alert.success('Status updated.'); load(); }
  catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
};

const promptDeleteEvent = () => { deleteEventModal.value = true; };
const doDeleteEvent = async () => {
  deleteBusy.value = true;
  try {
    await api.delete(`/events/${props.id}`);
    alert.success('Event deleted.');
    deleteEventModal.value = false;
    router.push('/admin/events');
  } catch (e) { alert.error(e.response?.data?.message || 'Delete failed.'); }
  finally { deleteBusy.value = false; }
};

/* ─── Speakers ─────────────────────────────────────────────── */
const openAddSpeaker = () => {
  editingSpeaker.value = null;
  Object.assign(speakerForm, { name:'', title:'', bio:'', photo_url:'', email:'', phone:'', sort_order: event.value?.speakers?.length || 0 });
  speakerModal.value = true;
};
const openEditSpeaker = (s) => {
  editingSpeaker.value = s.id;
  Object.assign(speakerForm, { name: s.name, title: s.title||'', bio: s.bio||'', photo_url: s.photo_url||'', email: s.email||'', phone: s.phone||'', sort_order: s.sort_order });
  speakerModal.value = true;
};
const saveSpeaker = async () => {
  if (!speakerForm.name.trim()) { alert.error('Name is required.'); return; }
  saving.value = true;
  try {
    if (editingSpeaker.value) await api.put(`/events/${props.id}/speakers/${editingSpeaker.value}`, speakerForm);
    else                      await api.post(`/events/${props.id}/speakers`, speakerForm);
    alert.success(editingSpeaker.value ? 'Speaker updated.' : 'Speaker added.');
    speakerModal.value = false;
    load();
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { saving.value = false; }
};
const promptDeleteSpeaker = (s) => { deletingSpeaker.value=s; deleteSpeakerModal.value=true; };
const doDeleteSpeaker = async () => {
  deleteBusy.value = true;
  try {
    await api.delete(`/events/${props.id}/speakers/${deletingSpeaker.value.id}`);
    alert.success('Speaker removed.'); deleteSpeakerModal.value=false; load();
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { deleteBusy.value = false; }
};

/* ─── Event Days ───────────────────────────────────────────── */
const openAddDay = () => {
  editingDay.value = null;
  const nextNum = (event.value?.days?.length || 0) + 1;
  Object.assign(dayForm, { day_number: nextNum, event_date: event.value?.start_date||'', theme:'' });
  dayModal.value = true;
};
const openEditDay = (d) => {
  editingDay.value = d.id;
  Object.assign(dayForm, { day_number: d.day_number, event_date: d.event_date, theme: d.theme||'' });
  dayModal.value = true;
};
const saveDay = async () => {
  saving.value = true;
  try {
    if (editingDay.value) await api.put(`/events/${props.id}/days/${editingDay.value}`, dayForm);
    else                  await api.post(`/events/${props.id}/days`, dayForm);
    alert.success(editingDay.value ? 'Day updated.' : 'Day added.');
    dayModal.value = false; load();
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { saving.value = false; }
};
const promptDeleteDay = (d) => { deletingDay.value=d; deleteDayModal.value=true; };
const doDeleteDay = async () => {
  deleteBusy.value = true;
  try {
    await api.delete(`/events/${props.id}/days/${deletingDay.value.id}`);
    alert.success('Day deleted.'); deleteDayModal.value=false; load();
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { deleteBusy.value = false; }
};

/* ─── Clone ────────────────────────────────────────────────── */
const doClone = async () => {
  if (!cloneForm.edition.trim()) { alert.error('New edition is required.'); return; }
  cloning.value = true;
  try {
    const { data } = await api.post(`/events/${props.id}/clone`, cloneForm);
    alert.success('Event cloned as draft!');
    cloneDialog.value = false;
    router.push(`/admin/events/${data.data.id}`);
  } catch (e) { alert.error(e.response?.data?.message || 'Clone failed.'); }
  finally { cloning.value = false; }
};
</script>
