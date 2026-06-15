<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Event Categories</h2>
        <p class="text-sm text-gray-500">Global divisions/classes — permanent, reused across all events</p>
      </div>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="14" /> Add Category
      </button>
    </div>

    <!-- Stats badges -->
    <div v-if="categories.length" class="flex flex-wrap gap-3">
      <div v-for="c in categories" :key="c.id"
        class="flex items-center gap-2 px-3 py-1.5 border border-gray-100 bg-white text-sm">
        <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
        <span class="font-semibold text-gray-700">{{ c.name }}</span>
        <span class="text-gray-400 text-xs">{{ c.registered_count || 0 }} registered</span>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" v-if="categories.length">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-8">#</th>
              <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Category</th>
              <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Registered</th>
              <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Capacity</th>
              <th class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
              <th class="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in categories" :key="c.id"
              class="border-b border-gray-50 hover:bg-brand-cream/30">
              <td class="px-5 py-3 text-gray-400 font-mono text-xs">{{ i+1 }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <span class="w-4 h-4 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
                  <div>
                    <p class="font-semibold">{{ c.name }}</p>
                    <p v-if="c.description" class="text-xs text-gray-400">{{ c.description }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3 font-bold text-brand-green">{{ c.registered_count || 0 }}</td>
              <td class="px-5 py-3 text-gray-500">
                <div v-if="c.capacity">
                  <div class="flex items-center gap-2">
                    <span>{{ c.capacity }}</span>
                    <div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div class="h-full bg-brand-green rounded-full"
                        :style="{ width: `${Math.min(100,((c.registered_count||0)/c.capacity)*100)}%` }"></div>
                    </div>
                  </div>
                </div>
                <span v-else class="text-gray-300">Unlimited</span>
              </td>
              <td class="px-5 py-3">
                <span class="badge text-xs" :class="c.is_active ? 'badge-green' : 'bg-gray-100 text-gray-400'">
                  {{ c.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex gap-2 justify-end items-center">
                  <button class="text-brand-green hover:opacity-70 transition-opacity" @click="openEdit(c)" title="Edit">
                    <Pencil :size="14" />
                  </button>
                  <button class="text-gray-400 hover:text-red-400 transition-colors" @click="remove(c)" title="Delete">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="py-16 text-center text-gray-400 text-sm">
          <Tag :size="36" class="mx-auto mb-3 opacity-30" />
          <p>No categories yet. Create your first division/class.</p>
        </div>
      </div>
    </div>
  </div>

  <AppModal v-model="modal" :title="editing ? 'Edit Category' : 'New Category'" size="md">
    <form @submit.prevent="save" class="space-y-4" novalidate>
      <div>
        <label class="label">Name <span class="text-red-500">*</span></label>
        <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
          placeholder="Youth / Professionals / Brother A / Sister B…" />
        <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
      </div>
      <div>
        <label class="label">Description</label>
        <input v-model="form.description" class="input" placeholder="Short description (optional)" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Badge Colour</label>
          <div class="flex items-center gap-3">
            <input v-model="form.color" type="color" class="w-12 h-10 border border-gray-200 cursor-pointer" />
            <input v-model="form.color" class="input text-sm font-mono" placeholder="#02462E" />
          </div>
        </div>
        <div>
          <label class="label">Capacity <span class="text-gray-400 font-normal text-xs">(per event)</span></label>
          <input v-model.number="form.capacity" type="number" min="1" class="input" placeholder="Unlimited" />
        </div>
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
          {{ saving ? 'Saving…' : (editing ? 'Update' : 'Create') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Plus, Pencil, Trash2, Loader, Save, Tag } from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert      = useAlertStore();
const categories = ref([]);
const saving     = ref(false);
const modal      = ref(false);
const editing    = ref(null);
const form = reactive({ name:'', description:'', color:'#02462E', capacity:'', sort_order:0, is_active:1 });
const errs = reactive({ name:'' });

const load = async () => {
  try { const { data } = await api.get('/categories'); categories.value = data.data || []; }
  catch { alert.error('Failed to load categories.'); }
};

onMounted(load);

const resetForm = () => { Object.assign(form, { name:'', description:'', color:'#02462E', capacity:'', sort_order:0, is_active:1 }); errs.name=''; };
const openCreate = () => { editing.value=null; resetForm(); modal.value=true; };
const openEdit   = (c)  => {
  editing.value=c.id;
  Object.assign(form, { name:c.name, description:c.description||'', color:c.color,
    capacity:c.capacity||'', sort_order:c.sort_order, is_active:c.is_active });
  modal.value=true;
};

const save = async () => {
  errs.name = form.name.trim() ? '' : 'Name is required.';
  if (errs.name) return;
  saving.value = true;
  try {
    const payload = { ...form, capacity: form.capacity || null };
    if (editing.value) { await api.put(`/categories/${editing.value}`, payload); alert.success('Updated.'); }
    else               { await api.post('/categories', payload);               alert.success('Created.'); }
    modal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Failed.'); }
  finally { saving.value = false; }
};

const remove = async (c) => {
  if (!confirm(`Delete "${c.name}"?`)) return;
  try { await api.delete(`/categories/${c.id}`); alert.success('Deleted.'); load(); }
  catch (err) { alert.error(err.response?.data?.message || 'Delete failed.'); }
};
</script>
