<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Sponsors & Partners</h2>
        <p class="text-sm text-gray-500">Manage sponsors — displayed on the event landing page</p>
      </div>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="13" /> Add Sponsor
      </button>
    </div>

    <!-- Tier badges -->
    <div class="flex gap-2 flex-wrap">
      <button v-for="t in tiers" :key="t.value"
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all"
        :class="tierFilter===t.value ? 'opacity-100' : 'opacity-60 hover:opacity-100'"
        :style="{ borderColor:t.color+'50', background:t.color+'15', color:t.color }"
        @click="tierFilter = tierFilter===t.value ? '' : t.value">
        {{ t.label }} ({{ countByTier(t.value) }})
      </button>
    </div>

    <!-- Search -->
    <div class="bg-white border border-gray-100 p-4">
      <div class="relative max-w-sm">
        <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" class="input pl-8 text-sm" placeholder="Search by name…" />
      </div>
    </div>

    <!-- DataTable -->
    <div class="bg-white border border-gray-100 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-16">
        <Loader :size="28" class="animate-spin text-brand-green/40" />
      </div>
      <div v-else-if="filteredSponsors.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-green text-white">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Sponsor</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tier</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Event</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Visible</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sp in filteredSponsors" :key="sp.id"
              class="border-b border-gray-50 hover:bg-brand-cream/20 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img v-if="sp.logo_url" :src="sp.logo_url" :alt="sp.name" class="w-full h-full object-contain p-1" />
                    <span v-else class="font-bold text-gray-400 text-sm">{{ sp.name?.[0] }}</span>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800">{{ sp.name }}</p>
                    <a v-if="sp.website_url" :href="sp.website_url" target="_blank"
                      class="text-xs text-brand-green hover:underline flex items-center gap-1">
                      <ExternalLink :size="10" />{{ sp.website_url.replace(/^https?:\/\//,'').split('/')[0] }}
                    </a>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="badge text-xs font-bold capitalize"
                  :style="{ background:tierColor(sp.tier)+'20', color:tierColor(sp.tier), border:'1px solid '+tierColor(sp.tier)+'40' }">
                  {{ sp.tier }}
                </span>
              </td>
              <td class="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                {{ sp.event_title ? `${sp.edition} – ${sp.event_title}` : 'All Events' }}
              </td>
              <td class="px-4 py-3">
                <span class="badge text-xs" :class="sp.is_active ? 'badge-green' : 'bg-gray-100 text-gray-400'">
                  {{ sp.is_active ? 'Visible' : 'Hidden' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex gap-2 justify-end">
                  <button class="text-brand-green hover:opacity-70" @click="openEdit(sp)"><Pencil :size="14" /></button>
                  <button class="text-gray-400 hover:text-red-400 transition-colors" @click="promptDelete(sp)"><Trash2 :size="14" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center text-gray-300">
        <Star :size="48" class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">{{ search||tierFilter ? 'No sponsors match.' : 'No sponsors yet.' }}</p>
      </div>
      <div class="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
        {{ filteredSponsors.length }} of {{ sponsors.length }} sponsors
      </div>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <AppModal v-model="modal" :title="editing ? 'Edit Sponsor' : 'Add Sponsor'" size="lg">
    <form @submit.prevent="save" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Sponsor / Partner Name <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
            placeholder="e.g. Dangote Foundation, MTN Nigeria, The Nation Newspaper" />
          <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
        </div>
        <div>
          <label class="label">Sponsorship Tier</label>
          <select v-model="form.tier" class="input">
            <option v-for="t in tiers" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div>
          <label class="label">Associated Event</label>
          <select v-model="form.event_id" class="input text-sm">
            <option :value="null">All Events (Global)</option>
            <option v-for="e in events" :key="e.id" :value="e.id">
              {{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Website URL</label>
          <input v-model="form.website_url" class="input" placeholder="https://www.sponsor.com" />
        </div>
        <div>
          <label class="label">Sort Order</label>
          <input v-model.number="form.sort_order" type="number" min="0" class="input" />
        </div>
      </div>

      <div>
        <label class="label">Logo URL <span class="text-gray-400 font-normal text-xs">(transparent PNG or SVG recommended)</span></label>
        <input v-model="form.logo_url" class="input" placeholder="https://… sponsor logo image" />
        <div v-if="form.logo_url" class="mt-2 h-16 w-40 border border-gray-100 bg-gray-50 flex items-center justify-center p-2 overflow-hidden">
          <img :src="form.logo_url" class="max-w-full max-h-full object-contain"
            @error="logoError=true" @load="logoError=false" />
        </div>
        <p v-if="logoError && form.logo_url" class="text-xs text-amber-600 mt-1">
          Preview unavailable — the URL will still be saved. Double-check it's a direct image link.
        </p>
      </div>

      <div>
        <label class="label">Notes <span class="text-gray-400 font-normal text-xs">(internal only)</span></label>
        <textarea v-model="form.description" class="input" rows="2"
          placeholder="Sponsorship amount, contact person, agreement details…" />
      </div>

      <div class="flex items-center gap-3 py-2 border-t border-gray-100">
        <span class="text-sm font-semibold text-gray-700">Show on landing page</span>
        <button type="button"
          class="relative w-12 h-6 rounded-full transition-colors duration-200"
          :class="form.is_active ? 'bg-brand-green' : 'bg-gray-200'"
          @click="form.is_active = form.is_active ? 0 : 1">
          <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
            :class="form.is_active ? 'left-6' : 'left-0.5'"></span>
        </button>
      </div>

      <div class="flex gap-2 pt-2">
        <button type="submit" :disabled="saving" class="btn-green text-xs flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : (editing ? 'Update' : 'Add Sponsor') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <ConfirmModal v-model="deleteModal" title="Remove Sponsor"
    :message="`Remove '${deleting?.name}' from the sponsors list?`"
    type="danger" confirm-label="Remove" :loading="deleteBusy" @confirm="doDelete" />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Plus, Loader, Save, Pencil, Trash2, Search, ExternalLink, Star } from 'lucide-vue-next';
import AppModal     from '@/components/common/AppModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert    = useAlertStore();
const sponsors = ref([]);
const events   = ref([]);
const loading  = ref(false);
const saving   = ref(false);
const deleteBusy = ref(false);
const modal      = ref(false);
const deleteModal= ref(false);
const editing    = ref(null);
const deleting   = ref(null);
const search     = ref('');
const tierFilter = ref('');

const tiers = [
  { value:'title',   label:'Title',     color:'#FEC700' },
  { value:'gold',    label:'Gold',      color:'#d4a017' },
  { value:'silver',  label:'Silver',    color:'#9ca3af' },
  { value:'bronze',  label:'Bronze',    color:'#cd7f32' },
  { value:'media',   label:'Media',     color:'#6366f1' },
  { value:'partner', label:'Partner',   color:'#02462E' },
];
const form = reactive({ event_id:null, name:'', logo_url:'', website_url:'', tier:'gold', description:'', sort_order:0, is_active:1 });
const errs = reactive({ name:'' });
const logoError = ref(false);

const tierColor = (t) => tiers.find(x=>x.value===t)?.color || '#02462E';
const countByTier = (t) => sponsors.value.filter(s=>s.tier===t).length;

const filteredSponsors = computed(() => {
  let rows = sponsors.value;
  if (search.value) { const q=search.value.toLowerCase(); rows=rows.filter(s=>s.name.toLowerCase().includes(q)); }
  if (tierFilter.value) rows = rows.filter(s=>s.tier===tierFilter.value);
  return rows;
});

const loadSponsors = async () => {
  loading.value = true;
  try { const {data}=await api.get('/sponsors/all'); sponsors.value=data.data||[]; }
  catch { alert.error('Failed to load sponsors.'); }
  finally { loading.value=false; }
};

onMounted(async () => {
  const [,evRes] = await Promise.allSettled([loadSponsors(), api.get('/events')]);
  if (evRes.status==='fulfilled') events.value = evRes.value.data.data || [];
});

const resetForm = () => { Object.assign(form,{event_id:null,name:'',logo_url:'',website_url:'',tier:'gold',description:'',sort_order:sponsors.value.length,is_active:1}); errs.name=''; editing.value=null; };
const openCreate = () => { resetForm(); logoError.value=false; modal.value=true; };
const openEdit = (sp) => { editing.value=sp.id; Object.assign(form,{event_id:sp.event_id||null,name:sp.name,logo_url:sp.logo_url||'',website_url:sp.website_url||'',tier:sp.tier,description:sp.description||'',sort_order:sp.sort_order,is_active:sp.is_active}); logoError.value=false; modal.value=true; };
const save = async () => {
  errs.name = form.name.trim()?'':'Name is required.';
  if (errs.name) return;
  saving.value=true;
  try {
    const payload={...form,event_id:form.event_id||null};
    editing.value ? await api.put(`/sponsors/${editing.value}`,payload) : await api.post('/sponsors',payload);
    alert.success(editing.value?'Updated.':'Sponsor added.'); modal.value=false; loadSponsors();
  } catch(e){ alert.error(e.response?.data?.message||'Failed.'); }
  finally { saving.value=false; }
};
const promptDelete=(sp)=>{deleting.value=sp;deleteModal.value=true;};
const doDelete=async()=>{
  deleteBusy.value=true;
  try{ await api.delete(`/sponsors/${deleting.value.id}`); alert.success('Removed.'); deleteModal.value=false; loadSponsors(); }
  catch(e){ alert.error(e.response?.data?.message||'Failed.'); }
  finally{deleteBusy.value=false;}
};
</script>
