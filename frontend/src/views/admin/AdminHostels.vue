<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Hostels</h2>
        <p class="text-sm text-gray-500">Permanent accommodation units — reused each year</p>
      </div>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="14" /> Add Hostel
      </button>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="stat in summaryStats" :key="stat.label"
        class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0"
          :class="stat.bg">
          <component :is="stat.icon" :size="18" class="text-brand-green" />
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wider">{{ stat.label }}</p>
          <p class="font-display font-bold text-xl text-brand-green">{{ stat.value }}</p>
        </div>
      </div>
    </div>

    <!-- Hostel cards grid -->
    <div v-if="loading" class="flex justify-center py-16">
      <Loader :size="28" class="animate-spin text-brand-green/40" />
    </div>

    <div v-else-if="hostels.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="h in hostels" :key="h.id"
        class="bg-white border border-gray-100 hover:border-brand-green/30 transition-all duration-200 p-5">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 flex items-center justify-center flex-shrink-0"
              :class="{ 'bg-blue-50': h.gender==='male', 'bg-pink-50': h.gender==='female', 'bg-brand-cream': h.gender==='mixed' }">
              <component :is="genderIcon(h.gender)" :size="18"
                :class="{ 'text-blue-500': h.gender==='male', 'text-pink-400': h.gender==='female', 'text-brand-green': h.gender==='mixed' }" />
            </div>
            <div>
              <p class="font-display font-bold text-brand-green">{{ h.name }}</p>
              <p class="text-xs text-gray-400 capitalize">{{ h.gender }}</p>
            </div>
          </div>
          <span class="badge text-xs" :class="h.is_active ? 'badge-green' : 'bg-gray-100 text-gray-400'">
            {{ h.is_active ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <!-- Beds bar -->
        <div class="mb-4">
          <div class="flex justify-between text-xs text-gray-500 mb-1.5">
            <span class="flex items-center gap-1"><Users :size="11" /> Beds</span>
            <span class="font-semibold">{{ h.total_assigned || 0 }} / {{ h.beds }}</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500"
              :class="pctClass(h.total_assigned, h.beds)"
              :style="{ width: `${Math.min(100, ((h.total_assigned||0)/h.beds)*100)}%` }"></div>
          </div>
          <p class="text-xs mt-1" :class="(h.beds-(h.total_assigned||0)) > 0 ? 'text-green-600' : 'text-red-500'">
            {{ h.beds - (h.total_assigned||0) }} beds remaining
          </p>
        </div>

        <!-- Location -->
        <p v-if="h.location" class="text-xs text-gray-500 flex items-center gap-1 mb-4">
          <MapPin :size="11" /> {{ h.location }}
        </p>
        <p v-if="h.description" class="text-xs text-gray-400 mb-4 line-clamp-2">{{ h.description }}</p>

        <!-- Actions -->
        <div class="flex gap-2 pt-3 border-t border-gray-50">
          <button class="btn-outline text-xs flex-1 py-1.5 justify-center" @click="openEdit(h)">
            <Pencil :size="12" /> Edit
          </button>
          <button class="text-gray-400 hover:text-red-400 transition-colors px-3 py-1.5 border border-gray-200"
            @click="remove(h)" title="Delete">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-16 text-gray-300">
      <BedDouble :size="48" class="mx-auto mb-3 opacity-40" />
      <p class="text-sm">No hostels created yet.</p>
    </div>
  </div>

  <!-- Create / Edit modal -->
  <AppModal v-model="modal" :title="editing ? 'Edit Hostel' : 'Add Hostel'" size="md">
    <form @submit.prevent="save" class="space-y-4" novalidate>
      <div>
        <label class="label">Hostel Name <span class="text-red-500">*</span></label>
        <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
          placeholder="e.g. Khadijah Hall, Block A, Annexe..." />
        <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Gender <span class="text-red-500">*</span></label>
          <select v-model="form.gender" class="input">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <label class="label">Beds <span class="text-red-500">*</span></label>
          <input v-model.number="form.beds" type="number" min="1" class="input" :class="{'input-error':errs.beds}" placeholder="50" />
          <p v-if="errs.beds" class="text-red-500 text-xs mt-1">{{ errs.beds }}</p>
        </div>
      </div>
      <div>
        <label class="label">Location / Building</label>
        <input v-model="form.location" class="input" placeholder="e.g. Block B, 2nd Floor" />
      </div>
      <div>
        <label class="label">Description / Notes</label>
        <textarea v-model="form.description" class="input" rows="2"
          placeholder="Facilities, rules, etc."></textarea>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Sort Order</label>
          <input v-model.number="form.sort_order" type="number" min="0" class="input" />
        </div>
        <div>
          <label class="label">Status</label>
          <select v-model="form.is_active" class="input">
            <option :value="1">Active</option>
            <option :value="0">Inactive</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs px-6 flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''"/>
          {{ saving ? 'Saving…' : (editing ? 'Update Hostel' : 'Create Hostel') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Plus, Loader, Save, Pencil, Trash2, Users, MapPin, BedDouble,
  UserCheck, UserX, Blend,
} from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert   = useAlertStore();
const hostels = ref([]);
const loading = ref(false);
const saving  = ref(false);
const modal   = ref(false);
const editing = ref(null);

const form = reactive({ name:'', gender:'mixed', "beds":50, location:'', description:'', sort_order:0, is_active:1 });
const errs = reactive({ name:'', "beds":'' });

const summaryStats = computed(() => [
  { label:'Total Hostels', value: hostels.value.length, icon: BedDouble,   bg:'bg-brand-cream' },
  { label:'Male',          value: hostels.value.filter(h=>h.gender==='male').length,   icon: UserCheck, bg:'bg-blue-50'   },
  { label:'Female',        value: hostels.value.filter(h=>h.gender==='female').length, icon: UserX,     bg:'bg-pink-50'   },
  { label:'Total Beds',    value: hostels.value.reduce((s,h)=>s+h.beds,0), icon: Users, bg:'bg-green-50'  },
]);

const genderIcon = (g) => ({ male:UserCheck, female:UserX, mixed:Blend }[g] || Blend);
const pctClass = (used, cap) => {
  const p = ((used||0)/cap)*100;
  return p >= 100 ? 'bg-red-500' : p >= 80 ? 'bg-yellow-400' : 'bg-brand-green';
};

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/hostels');
    hostels.value = data.data || [];
  } catch { alert.error('Failed to load hostels.'); }
  finally { loading.value = false; }
};

onMounted(load);

const resetForm = () => {
  Object.assign(form, { name:'', gender:'mixed', "beds":50, location:'', description:'', sort_order:0, is_active:1 });
  Object.assign(errs, { name:'', "beds":'' });
};

const openCreate = () => { editing.value = null; resetForm(); modal.value = true; };
const openEdit   = (h)  => {
  editing.value = h.id;
  Object.assign(form, { name:h.name, gender:h.gender, "beds":h.beds, location:h.location||'',
    description:h.description||'', sort_order:h.sort_order, is_active:h.is_active });
  modal.value = true;
};

const validate = () => {
  errs.name     = form.name.trim()       ? '' : 'Name is required.';
  errs.beds = form.beds >= 1     ? '' : 'Beds must be at least 1.';
  return !errs.name && !errs.beds;
};

const save = async () => {
  if (!validate()) return;
  saving.value = true;
  try {
    if (editing.value) { await api.put(`/hostels/${editing.value}`, form); alert.success('Hostel updated.'); }
    else               { await api.post('/hostels', form);               alert.success('Hostel created.'); }
    modal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Save failed.'); }
  finally { saving.value = false; }
};

const remove = async (h) => {
  if (!confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
  try { await api.delete(`/hostels/${h.id}`); alert.success('Hostel deleted.'); load(); }
  catch (err) { alert.error(err.response?.data?.message || 'Delete failed.'); }
};
</script>
