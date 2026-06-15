<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="font-display font-bold text-xl text-brand-green">Departments</h2>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="14" /> Add Department
      </button>
    </div>

    <!-- Summary stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="s in summaryStats" :key="s.label" class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <div class="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-brand-cream">
          <component :is="s.icon" :size="18" class="text-brand-green" />
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wider">{{ s.label }}</p>
          <p class="font-display font-bold text-xl text-brand-green">{{ s.value }}</p>
        </div>
      </div>
    </div>

    <!-- DataTable -->
    <div class="bg-white border border-gray-100">
      <!-- Search + filters -->
      <div class="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
        <div class="relative flex-1 min-w-[200px]">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="search" class="input pl-8 text-sm" placeholder="Search departments…" @input="filtered" />
        </div>
        <select v-model="statusFilter" class="input text-sm w-32" @change="filtered">
          <option value="">All status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      <div v-if="loading" class="flex justify-center py-16">
        <Loader :size="28" class="animate-spin text-brand-green/40" />
      </div>
      <div v-else-if="filteredRows.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-green text-white">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Department</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Head</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Members</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Pending</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden lg:table-cell">Paid Out</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in filteredRows" :key="d.id"
              class="border-b border-gray-50 hover:bg-brand-cream/20 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-brand-cream flex items-center justify-center flex-shrink-0">
                    <Building2 :size="16" class="text-brand-green" />
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800">{{ d.name }}</p>
                    <p v-if="d.description" class="text-xs text-gray-400 truncate max-w-[200px]">{{ d.description }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <p class="text-sm text-gray-600">{{ d.head_name || '—' }}</p>
              </td>
              <td class="px-4 py-3 font-bold text-brand-green">{{ d.member_count || 0 }}</td>
              <td class="px-4 py-3 hidden md:table-cell">
                <span v-if="d.pending_count > 0" class="badge bg-yellow-100 text-yellow-700 text-xs">
                  {{ d.pending_count }} pending
                </span>
                <span v-else class="text-gray-300 text-xs">—</span>
              </td>
              <td class="px-4 py-3 text-gray-600 hidden lg:table-cell">₦{{ fmtK(d.total_paid || 0) }}</td>
              <td class="px-4 py-3">
                <span class="badge text-xs" :class="d.is_active ? 'badge-green' : 'bg-gray-100 text-gray-400'">
                  {{ d.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex gap-2 justify-end">
                  <button class="text-brand-green hover:opacity-70 transition-opacity" @click="openEdit(d)" title="Edit">
                    <Pencil :size="14" />
                  </button>
                  <button class="text-gray-400 hover:text-red-400 transition-colors" @click="promptDelete(d)" title="Delete">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center text-gray-300">
        <Building2 :size="40" class="mx-auto mb-3 opacity-40" />
        <p class="text-sm">{{ search ? 'No departments match your search.' : 'No departments yet.' }}</p>
      </div>

      <div class="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
        Showing {{ filteredRows.length }} of {{ departments.length }} departments
      </div>
    </div>
  </div>

  <!-- Create / Edit Modal -->
  <AppModal v-model="modal" :title="editing ? 'Edit Department' : 'Add Department'" size="md">
    <form @submit.prevent="save" class="space-y-4">
      <div>
        <label class="label">Department Name <span class="text-red-500">*</span></label>
        <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
          placeholder="e.g. Kitchen, Gate, AV Team, Transport…" />
        <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
      </div>
      <div>
        <label class="label">Head / Coordinator Name</label>
        <input v-model="form.head_name" class="input" placeholder="Name of department head" />
      </div>
      <div>
        <label class="label">Description</label>
        <textarea v-model="form.description" class="input" rows="2" placeholder="What does this department handle?" />
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
        <button type="submit" :disabled="saving" class="btn-green text-xs flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : (editing ? 'Update' : 'Create') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <!-- Delete Confirm Modal -->
  <ConfirmModal v-model="deleteModal" title="Delete Department"
    :message="`Delete '${deleting?.name}'? This cannot be undone.`"
    type="danger" confirm-label="Delete" :loading="deleting_busy"
    @confirm="doDelete" />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Plus, Loader, Save, Pencil, Trash2, Building2, Search, Users, ReceiptText, Banknote } from 'lucide-vue-next';
import AppModal    from '@/components/common/AppModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert       = useAlertStore();
const departments = ref([]);
const loading     = ref(false);
const saving      = ref(false);
const deleting_busy = ref(false);
const modal       = ref(false);
const deleteModal = ref(false);
const editing     = ref(null);
const deleting    = ref(null);
const search      = ref('');
const statusFilter= ref('');

const form = reactive({ name:'', description:'', head_name:'', sort_order:0, is_active:1 });
const errs = reactive({ name:'' });

const summaryStats = computed(() => [
  { label:'Total', value: departments.value.length, icon: Building2 },
  { label:'Active', value: departments.value.filter(d=>d.is_active).length, icon: Building2 },
  { label:'Members', value: departments.value.reduce((s,d)=>s+(d.member_count||0),0), icon: Users },
  { label:'Pending', value: departments.value.reduce((s,d)=>s+(d.pending_count||0),0), icon: ReceiptText },
]);

const filteredRows = computed(() => {
  let rows = departments.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    rows = rows.filter(d => d.name.toLowerCase().includes(q) || d.head_name?.toLowerCase().includes(q));
  }
  if (statusFilter.value !== '') rows = rows.filter(d => String(d.is_active) === statusFilter.value);
  return rows;
});

const filtered = () => {}; // reactive computed handles it

const load = async () => {
  loading.value = true;
  try { const { data } = await api.get('/departments'); departments.value = data.data || []; }
  catch { alert.error('Failed to load departments.'); }
  finally { loading.value = false; }
};

onMounted(load);

const fmtK = (n) => n >= 1000 ? `₦${(n/1000).toFixed(0)}k` : `₦${n}`;
const resetForm = () => { Object.assign(form, { name:'', description:'', head_name:'', sort_order: departments.value.length, is_active:1 }); errs.name=''; };
const openCreate = () => { editing.value=null; resetForm(); modal.value=true; };
const openEdit   = (d)  => { editing.value=d.id; Object.assign(form, { name:d.name, description:d.description||'', head_name:d.head_name||'', sort_order:d.sort_order, is_active:d.is_active }); modal.value=true; };
const promptDelete = (d) => { deleting.value=d; deleteModal.value=true; };

const save = async () => {
  errs.name = form.name.trim() ? '' : 'Name is required.';
  if (errs.name) return;
  saving.value = true;
  try {
    if (editing.value) { await api.put(`/departments/${editing.value}`, form); alert.success('Updated.'); }
    else               { await api.post('/departments', form);               alert.success('Created.'); }
    modal.value=false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Failed.'); }
  finally { saving.value=false; }
};

const doDelete = async () => {
  if (!deleting.value) return;
  deleting_busy.value = true;
  try { await api.delete(`/departments/${deleting.value.id}`); alert.success('Deleted.'); deleteModal.value=false; load(); }
  catch (err) { alert.error(err.response?.data?.message || 'Delete failed.'); }
  finally { deleting_busy.value=false; }
};
</script>
