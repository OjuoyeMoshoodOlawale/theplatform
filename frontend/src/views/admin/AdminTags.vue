<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Event Tags / Badges</h2>
        <p class="text-sm text-gray-500">Generate, assign, and print participant entry badges</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button :disabled="!selectedEvent" class="btn-outline text-xs flex items-center gap-1.5"
          @click="printSelected" :title="selectedIds.length ? `Print ${selectedIds.length} selected` : 'Print all loaded tags'">
          <Printer :size="13" />
          {{ selectedIds.length ? `Print ${selectedIds.length} Selected` : 'Print All Loaded' }}
        </button>
        <button :disabled="!selectedEvent" class="btn-green text-xs" @click="generateModal=true">
          <Plus :size="14" /> Generate Tags
        </button>
      </div>
    </div>

    <!-- Event selector + stats -->
    <div class="bg-white border border-gray-100 p-4 flex flex-wrap gap-4 items-center">
      <div class="flex-1 min-w-[220px]">
        <label class="label text-xs mb-1">Event</label>
        <select v-model="selectedEvent" class="input text-sm" @change="loadTags">
          <option value="">Select event…</option>
          <option v-for="e in events" :key="e.id" :value="e.id">
            {{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}
          </option>
        </select>
      </div>
      <template v-if="stats">
        <div class="text-center px-4"><p class="font-bold text-2xl text-brand-green">{{ stats.total }}</p><p class="text-xs text-gray-400">Total</p></div>
        <div class="text-center px-4"><p class="font-bold text-2xl text-green-600">{{ stats.assigned }}</p><p class="text-xs text-gray-400">Assigned</p></div>
        <div class="text-center px-4"><p class="font-bold text-2xl text-yellow-600">{{ stats.unassigned }}</p><p class="text-xs text-gray-400">Unassigned</p></div>
        <div class="text-center px-4"><p class="font-bold text-2xl text-blue-600">{{ stats.printed }}</p><p class="text-xs text-gray-400">Printed</p></div>
      </template>
    </div>

    <!-- Filter + search -->
    <div v-if="selectedEvent" class="flex gap-3 flex-wrap">
      <div class="relative flex-1 min-w-[180px]">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" class="input pl-8 text-sm" placeholder="Tag number, participant name…" @input="filterRows" />
      </div>
      <select v-model="assignFilter" class="input text-sm w-36" @change="filterRows">
        <option value="">All tags</option>
        <option value="assigned">Assigned</option>
        <option value="unassigned">Unassigned</option>
        <option value="printed">Printed</option>
      </select>
      <button v-if="selectedIds.length" class="btn-gold text-xs" @click="printSelected">
        <Printer :size="13" /> Print {{ selectedIds.length }}
      </button>
    </div>

    <!-- Tags DataTable -->
    <div class="bg-white border border-gray-100 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-16">
        <Loader :size="28" class="animate-spin text-brand-green/40" />
      </div>
      <div v-else-if="filteredTags.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-green text-white">
            <tr>
              <th class="px-3 py-3 w-10">
                <input type="checkbox" class="accent-brand-gold"
                  :checked="selectedIds.length === filteredTags.length && filteredTags.length > 0"
                  @change="toggleAll" />
              </th>
              <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">Tag #</th>
              <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">Participant</th>
              <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Ticket</th>
              <th class="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
              <th class="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tag in filteredTags" :key="tag.id"
              class="border-b border-gray-50 hover:bg-brand-cream/20"
              :class="selectedIds.includes(tag.id) ? 'bg-brand-cream/30' : ''">
              <td class="px-3 py-2.5">
                <input type="checkbox" class="accent-brand-green"
                  :value="tag.id" v-model="selectedIds" />
              </td>
              <td class="px-3 py-2.5">
                <span class="font-mono font-bold text-brand-green text-sm">{{ tag.tag_number }}</span>
              </td>
              <td class="px-3 py-2.5">
                <span v-if="tag.participant_name" class="font-semibold text-gray-800">{{ tag.participant_name }}</span>
                <span v-else class="text-gray-300 text-xs italic">Unassigned</span>
              </td>
              <td class="px-3 py-2.5 hidden md:table-cell">
                <span v-if="tag.ticket_number" class="font-mono text-xs text-gray-500">{{ tag.ticket_number }}</span>
                <span v-else class="text-gray-300 text-xs">—</span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1.5">
                  <span class="badge text-xs"
                    :class="tag.ticket_id ? 'badge-green' : 'bg-gray-100 text-gray-400'">
                    {{ tag.ticket_id ? 'Assigned' : 'Unassigned' }}
                  </span>
                  <span v-if="tag.is_printed" class="badge text-xs bg-blue-100 text-blue-600">
                    Printed
                  </span>
                </div>
              </td>
              <td class="px-3 py-2.5 text-right">
                <button class="text-xs text-brand-green hover:underline flex items-center gap-1 ml-auto"
                  @click="printOne(tag.id)">
                  <Printer :size="12" /> Print
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="selectedEvent" class="py-16 text-center text-gray-300">
        <Tag :size="40" class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">No tags found.</p>
        <button class="btn-green text-xs mt-4" @click="generateModal=true">
          <Plus :size="13" /> Generate Tags
        </button>
      </div>
      <div v-else class="py-16 text-center text-gray-300">
        <Tag :size="40" class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">Select an event to manage tags.</p>
      </div>
    </div>
  </div>

  <!-- Generate Tags Modal -->
  <AppModal v-model="generateModal" title="Generate Blank Tags" size="sm">
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Generate blank entry tags for this event. Print them, then assign to participants
        at the gate by entering the tag number manually.
      </p>
      <div>
        <label class="label">Number of Tags</label>
        <input v-model.number="genCount" type="number" min="1" max="500" class="input" placeholder="50" />
        <p class="text-xs text-gray-400 mt-1">Generates TAG-001, TAG-002… format</p>
      </div>
      <div>
        <label class="label">Tag Prefix</label>
        <input v-model="genPrefix" class="input uppercase" placeholder="TAG" maxlength="6" />
      </div>
      <div class="flex gap-2 pt-2 border-t border-gray-100">
        <button :disabled="generating" class="btn-green text-xs flex items-center gap-2" @click="doGenerate">
          <component :is="generating ? Loader : Plus" :size="14" :class="generating?'animate-spin':''" />
          {{ generating ? 'Generating…' : `Generate ${genCount || 0} Tags` }}
        </button>
        <button class="btn-ghost text-xs" @click="generateModal=false">Cancel</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Plus, Loader, Search, Tag, Printer } from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import { useEventStore } from '@/stores/eventStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import api from '@/composables/useApi.js';

const alert      = useAlertStore();
const eventStore = useEventStore();
const auth       = useAuthStore();

const events       = ref([]);
const tags         = ref([]);
const stats        = ref(null);
const loading      = ref(false);
const generating   = ref(false);
const selectedEvent= ref('');
const selectedIds  = ref([]);
const search       = ref('');
const assignFilter = ref('');
const generateModal= ref(false);
const genCount     = ref(50);
const genPrefix    = ref('TAG');

const filteredTags = computed(() => {
  let rows = tags.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    rows = rows.filter(t => t.tag_number.toLowerCase().includes(q) || t.participant_name?.toLowerCase().includes(q));
  }
  if (assignFilter.value === 'assigned')   rows = rows.filter(t => t.ticket_id);
  if (assignFilter.value === 'unassigned') rows = rows.filter(t => !t.ticket_id);
  if (assignFilter.value === 'printed')    rows = rows.filter(t => t.is_printed);
  return rows;
});

onMounted(async () => {
  try {
    const { data } = await api.get('/events');
    events.value = data.data || [];
    await eventStore.fetchActiveEvent();
    if (eventStore.activeEvent) { selectedEvent.value = eventStore.activeEvent.id; loadTags(); }
  } catch {}
});

const loadTags = async () => {
  if (!selectedEvent.value) { tags.value = []; stats.value = null; return; }
  loading.value = true;
  selectedIds.value = [];
  try {
    const [tRes, sRes] = await Promise.all([
      api.get(`/tags/${selectedEvent.value}`),
      api.get(`/tags/${selectedEvent.value}/stats`),
    ]);
    tags.value  = tRes.data.data || [];
    stats.value = sRes.data.data || null;
  } catch { alert.error('Failed to load tags.'); }
  finally { loading.value = false; }
};

const filterRows = () => {}; // computed handles filtering

const doGenerate = async () => {
  generating.value = true;
  try {
    const { data } = await api.post(`/events/${selectedEvent.value}/tags/generate`, {
      count: genCount.value, prefix: genPrefix.value.toUpperCase() || 'TAG',
    });
    alert.success(`${data.data?.generated || 0} tags generated!`);
    generateModal.value = false;
    loadTags();
  } catch (e) { alert.error(e.response?.data?.message || 'Generation failed.'); }
  finally { generating.value = false; }
};

const printOne = (id) => openPrint([id]);
const printSelected = () => openPrint(selectedIds.value.length ? selectedIds.value : null);

const openPrint = (ids) => {
  if (!selectedEvent.value) { alert.error('Select an event first.'); return; }
  const token = auth.token || localStorage.getItem('mys_token') || '';
  const parts = [ ids?.length ? `ids=${ids.join(',')}` : `limit=40` ];
  if (token) parts.push(`token=${encodeURIComponent(token)}`);
  window.open(`/api/events/${selectedEvent.value}/tags/print?${parts.join('&')}`, '_blank');
};

const toggleAll = (e) => {
  selectedIds.value = e.target.checked ? filteredTags.value.map(t => t.id) : [];
};
</script>
