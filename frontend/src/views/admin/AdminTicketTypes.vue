<template>
  <div class="space-y-5">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <RouterLink to="/admin/events" class="hover:text-brand-green flex items-center gap-1">
        <CalendarDays :size="13" /> Events
      </RouterLink>
      <ChevronRight :size="13" />
      <RouterLink :to="`/admin/events/${eventId}`" class="hover:text-brand-green truncate">
        {{ event?.title || 'Event' }}
      </RouterLink>
      <ChevronRight :size="13" />
      <span class="text-brand-green font-semibold">Ticket Types</span>
    </div>

    <!-- Info banner -->
    <div class="bg-amber-50 border border-amber-200 px-5 py-3 flex items-start gap-3">
      <Info :size="16" class="text-amber-600 flex-shrink-0 mt-0.5" />
      <p class="text-amber-800 text-sm">
        Create pricing for each participant type — <strong>Undergraduate, Graduate, Professional</strong>, etc.
        Early bird pricing activates automatically based on the event's Early Bird close date
        (<strong>{{ event?.early_bird_closes_at ? fmt(event.early_bird_closes_at) : 'not set' }}</strong>).
        Changes here are <strong>live immediately</strong> — no developer needed.
      </p>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Ticket Types</h2>
        <p class="text-sm text-gray-500">{{ event?.title }}</p>
      </div>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="14" /> Add Ticket Type
      </button>
    </div>

    <!-- Ticket type cards -->
    <div v-if="loading" class="flex justify-center py-16">
      <Loader :size="28" class="animate-spin text-brand-green/40" />
    </div>

    <div v-else-if="types.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="(tt, i) in types" :key="tt.id"
        class="bg-white border-2 transition-all duration-200 p-5 relative"
        :class="tt.is_active ? 'border-gray-100 hover:border-brand-green/30' : 'border-dashed border-gray-200 opacity-60'">

        <!-- Drag handle + sort order -->
        <div class="absolute top-3 right-3 flex items-center gap-1.5">
          <span class="text-xs text-gray-300 font-mono">#{{ tt.sort_order }}</span>
          <span v-if="!tt.is_active" class="badge bg-gray-100 text-gray-400 text-xs">Inactive</span>
        </div>

        <!-- Category badge -->
        <div class="mb-3">
          <span class="badge text-xs" :class="categoryClass(tt.participant_category)">
            <GraduationCap :size="10" class="inline mr-1" />
            {{ categoryLabel(tt.participant_category) }}
          </span>
        </div>

        <!-- Name + description -->
        <h3 class="font-display font-bold text-lg text-brand-green leading-tight">{{ tt.name }}</h3>
        <p v-if="tt.description" class="text-xs text-gray-500 mt-1">{{ tt.description }}</p>

        <!-- Pricing -->
        <div class="mt-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Banknote :size="11" /> Regular Price
            </span>
            <span class="font-display font-bold text-brand-green text-lg">₦{{ fmtP(tt.regular_price) }}</span>
          </div>
          <div v-if="tt.early_bird_price" class="flex items-center justify-between bg-brand-cream/60 px-3 py-1.5 rounded">
            <span class="text-xs font-semibold text-brand-gold flex items-center gap-1">
              <Zap :size="11" /> Early Bird
              <span v-if="tt.early_bird_active" class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block ml-1 animate-pulse"></span>
              <span v-else class="text-gray-400 font-normal">(expired)</span>
            </span>
            <span class="font-display font-bold text-brand-gold">₦{{ fmtP(tt.early_bird_price) }}</span>
          </div>
          <div v-else class="text-xs text-gray-300 italic">No early bird pricing</div>
        </div>

        <!-- Capacity / sold -->
        <div class="mt-3 pt-3 border-t border-gray-50">
          <div class="flex justify-between text-xs text-gray-500 mb-1.5">
            <span class="flex items-center gap-1"><Ticket :size="10" /> Sold / Capacity</span>
            <span class="font-semibold">{{ tt.quantity_sold }} / {{ tt.quantity_available ?? '∞' }}</span>
          </div>
          <div v-if="tt.quantity_available" class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all"
              :class="soldPct(tt) >= 100 ? 'bg-red-500' : soldPct(tt) >= 80 ? 'bg-yellow-400' : 'bg-brand-green'"
              :style="{ width: `${Math.min(100, soldPct(tt))}%` }">
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 mt-4 pt-3 border-t border-gray-50">
          <button class="btn-outline text-xs flex-1 py-1.5 justify-center" @click="openEdit(tt)">
            <Pencil :size="11" /> Edit
          </button>
          <button class="px-3 py-1.5 border border-gray-200 text-gray-400 hover:text-red-400 transition-colors"
            @click="remove(tt)" title="Delete">
            <Trash2 :size="13" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16 bg-white border border-dashed border-gray-200">
      <Ticket :size="40" class="mx-auto mb-3 text-gray-300" />
      <p class="text-sm text-gray-400 mb-4">No ticket types yet for this event.</p>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="13" /> Add First Ticket Type
      </button>
    </div>
  </div>

  <!-- Create / Edit Modal -->
  <AppModal v-model="modal" :title="editing ? 'Edit Ticket Type' : 'Add Ticket Type'" size="lg">
    <form @submit.prevent="save" class="space-y-5" novalidate>

      <!-- Name + Category on same row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">Type Name <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
            placeholder="e.g. Regular – Undergraduate" />
          <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
        </div>
        <div>
          <label class="label">Participant Category <span class="text-red-500">*</span></label>
          <select v-model="form.participant_category" class="input">
            <option v-for="c in participantCategories" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label class="label">Description <span class="text-gray-400 font-normal text-xs">(shown on registration form)</span></label>
        <input v-model="form.description" class="input"
          placeholder="e.g. For 100–400 level university students only" />
      </div>

      <!-- Pricing -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-brand-cream/50 border border-brand-gold/20 rounded">
        <div>
          <label class="label flex items-center gap-1.5">
            <Banknote :size="13" class="text-brand-green" />
            Regular Price (₦) <span class="text-red-500">*</span>
          </label>
          <input v-model.number="form.regular_price" type="number" min="0" step="50"
            class="input" :class="{'input-error':errs.regular_price}" placeholder="5000" />
          <p v-if="errs.regular_price" class="text-red-500 text-xs mt-1">{{ errs.regular_price }}</p>
        </div>
        <div>
          <label class="label flex items-center gap-1.5">
            <Zap :size="13" class="text-brand-gold" />
            Early Bird Price (₦) <span class="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <input v-model.number="form.early_bird_price" type="number" min="0" step="50"
            class="input" :class="{'input-error':errs.early_bird_price}"
            :placeholder="`e.g. ${form.regular_price ? Math.round(form.regular_price * 0.7) : '3500'}`" />
          <p v-if="errs.early_bird_price" class="text-red-500 text-xs mt-1">{{ errs.early_bird_price }}</p>
          <p class="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Info :size="10" />
            Activates until <strong class="text-gray-600">{{ event?.early_bird_closes_at ? fmt(event.early_bird_closes_at) : 'event early bird date' }}</strong>
          </p>
        </div>
      </div>

      <!-- Savings preview -->
      <div v-if="form.regular_price && form.early_bird_price && form.early_bird_price < form.regular_price"
        class="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-2 rounded">
        <Zap :size="14" class="text-green-500" />
        Early bird saves <strong>₦{{ fmtP(form.regular_price - form.early_bird_price) }}</strong>
        ({{ Math.round((1 - form.early_bird_price / form.regular_price) * 100) }}% off)
      </div>

      <!-- Capacity + sort -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label class="label">Max Quantity</label>
          <input v-model.number="form.quantity_available" type="number" min="1" class="input"
            placeholder="Unlimited" />
        </div>
        <div>
          <label class="label">Sort Order</label>
          <input v-model.number="form.sort_order" type="number" min="0" class="input" />
        </div>
        <div>
          <label class="label">Status</label>
          <select v-model="form.is_active" class="input">
            <option :value="1">Active (visible)</option>
            <option :value="0">Inactive (hidden)</option>
          </select>
        </div>
      </div>

      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs px-8 flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : (editing ? 'Update Type' : 'Create Type') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import {
  Plus, Loader, Save, Pencil, Trash2, Info, Ticket,
  CalendarDays, ChevronRight, GraduationCap, Banknote, Zap,
} from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';
import { useRoute } from 'vue-router';

const route   = useRoute();
const alert   = useAlertStore();
const eventId = route.params.id;

const types   = ref([]);
const event   = ref(null);
const loading = ref(false);
const saving  = ref(false);
const modal   = ref(false);
const editing = ref(null);

const participantCategories = ref([
  { value:'all',           label:'All Participants' },
  { value:'undergraduate', label:'Undergraduate Students' },
  { value:'graduate',      label:'Graduate / Postgraduate' },
  { value:'professional',  label:'Professionals / Alumni' },
  { value:'other',         label:'Other' },
]);

const form = reactive({
  name:'', participant_category:'all', description:'',
  regular_price:'', early_bird_price:'',
  quantity_available:'', sort_order:0, is_active:1,
});
const errs = reactive({ name:'', regular_price:'', early_bird_price:'' });

const load = async () => {
  loading.value = true;
  try {
    const [evRes, ttRes] = await Promise.all([
      api.get(`/events/${eventId}`),
      api.get(`/events/${eventId}/ticket-types/all`),
    ]);
    event.value = evRes.data.data;
    types.value = ttRes.data.data || [];
  } catch { alert.error('Failed to load ticket types.'); }
  finally { loading.value = false; }
};

onMounted(load);

const soldPct = (tt) => tt.quantity_available ? (tt.quantity_sold / tt.quantity_available) * 100 : 0;
const fmtP = (n) => Number(n || 0).toLocaleString('en-NG');
const fmt  = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

const categoryLabel = (v) => participantCategories.value.find(c => c.value === v)?.label || v;
const categoryClass = (v) => ({
  all:           'bg-brand-cream text-brand-green',
  undergraduate: 'bg-blue-100 text-blue-700',
  graduate:      'bg-purple-100 text-purple-700',
  professional:  'bg-orange-100 text-orange-700',
  other:         'bg-gray-100 text-gray-600',
}[v] ?? 'bg-gray-100 text-gray-600');

const resetForm = () => {
  Object.assign(form, { name:'', participant_category:'all', description:'',
    regular_price:'', early_bird_price:'', quantity_available:'', sort_order: types.value.length, is_active:1 });
  Object.assign(errs, { name:'', regular_price:'', early_bird_price:'' });
};

const openCreate = () => { editing.value=null; resetForm(); modal.value=true; };
const openEdit   = (tt) => {
  editing.value = tt.id;
  Object.assign(form, {
    name:                 tt.name,
    participant_category: tt.participant_category,
    description:          tt.description || '',
    regular_price:        tt.regular_price,
    early_bird_price:     tt.early_bird_price || '',
    quantity_available:   tt.quantity_available || '',
    sort_order:           tt.sort_order,
    is_active:            tt.is_active,
  });
  Object.assign(errs, { name:'', regular_price:'', early_bird_price:'' });
  modal.value = true;
};

const validate = () => {
  errs.name          = form.name.trim() ? '' : 'Type name is required.';
  errs.regular_price = form.regular_price >= 0 ? '' : 'Price must be 0 or more.';
  errs.early_bird_price = (!form.early_bird_price || form.early_bird_price < form.regular_price)
    ? '' : 'Early bird price must be less than regular price.';
  return !Object.values(errs).some(Boolean);
};

const save = async () => {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload = {
      ...form,
      early_bird_price:   form.early_bird_price   || null,
      quantity_available: form.quantity_available  || null,
    };
    if (editing.value) {
      await api.put(`/ticket-types/${editing.value}`, payload);
      alert.success('Ticket type updated.');
    } else {
      await api.post(`/events/${eventId}/ticket-types`, payload);
      alert.success('Ticket type created.');
    }
    modal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Save failed.'); }
  finally { saving.value = false; }
};

const remove = async (tt) => {
  if (!confirm(`Delete "${tt.name}"? This cannot be undone.`)) return;
  try { await api.delete(`/ticket-types/${tt.id}`); alert.success('Deleted.'); load(); }
  catch (err) { alert.error(err.response?.data?.message || 'Delete failed.'); }
};
</script>
