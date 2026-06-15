<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">Souvenirs & Merchandise</h2>
        <p class="text-sm text-gray-500">Pre-order items with online payment — anyone can buy</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-outline text-xs" @click="activeTab='orders'">
          <ShoppingCart :size="13" /> Orders ({{ orders.length }})
        </button>
        <button class="btn-green text-xs" @click="openCreate">
          <Plus :size="13" /> Add Item
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <Package :size="20" class="text-brand-green flex-shrink-0" />
        <div><p class="text-xs text-gray-400">Total Items</p><p class="font-bold text-xl text-brand-green">{{ souvenirs.length }}</p></div>
      </div>
      <div class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <ShoppingCart :size="20" class="text-brand-green flex-shrink-0" />
        <div><p class="text-xs text-gray-400">Total Orders</p><p class="font-bold text-xl text-brand-green">{{ orders.length }}</p></div>
      </div>
      <div class="bg-green-50 border border-green-100 p-4 flex items-center gap-3">
        <Banknote :size="20" class="text-green-600 flex-shrink-0" />
        <div><p class="text-xs text-gray-400">Revenue</p><p class="font-bold text-xl text-green-700">₦{{ fmtP(totalRevenue) }}</p></div>
      </div>
      <div class="bg-yellow-50 border border-yellow-100 p-4 flex items-center gap-3">
        <Clock :size="20" class="text-yellow-600 flex-shrink-0" />
        <div><p class="text-xs text-gray-400">Pending</p><p class="font-bold text-xl text-yellow-700">{{ pendingOrders }}</p></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-4 border-b border-gray-200">
      <button v-for="t in ['items','orders']" :key="t"
        class="pb-3 font-semibold text-sm border-b-2 transition-colors capitalize"
        :class="activeTab===t ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-400'"
        @click="activeTab=t">{{ t }}</button>
    </div>

    <!-- Items tab -->
    <div v-if="activeTab==='items'">
      <div v-if="souvenirs.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="sv in souvenirs" :key="sv.id"
          class="bg-white border border-gray-100 hover:border-brand-green/30 transition-all overflow-hidden">
          <!-- Image -->
          <div class="h-40 bg-brand-cream/50 relative overflow-hidden">
            <img v-if="sv.image_url" :src="sv.image_url" :alt="sv.name"
              class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center">
              <Package :size="48" class="text-brand-green/20" />
            </div>
            <div class="absolute top-2 right-2 flex gap-1.5">
              <span class="badge text-xs" :class="sv.is_active ? 'badge-green' : 'bg-gray-100 text-gray-400'">
                {{ sv.is_active ? 'Active' : 'Hidden' }}
              </span>
            </div>
          </div>
          <div class="p-4">
            <p class="font-display font-bold text-brand-green">{{ sv.name }}</p>
            <p v-if="sv.event_title" class="text-xs text-brand-gold mt-0.5">{{ sv.edition }}</p>
            <p v-if="sv.description" class="text-xs text-gray-500 mt-1 line-clamp-2">{{ sv.description }}</p>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <div>
                <p class="font-display font-bold text-xl text-brand-green">₦{{ fmtP(sv.price) }}</p>
                <p class="text-xs text-gray-400">
                  {{ sv.sold_qty }} sold
                  <span v-if="sv.available_qty">/ {{ sv.available_qty }}</span>
                </p>
              </div>
              <div class="flex gap-2">
                <button class="text-brand-green hover:opacity-70 transition-opacity" @click="openEdit(sv)">
                  <Pencil :size="15" />
                </button>
                <button class="text-gray-400 hover:text-red-400 transition-colors" @click="promptDelete(sv)">
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="bg-white border border-dashed border-gray-200 py-16 text-center">
        <Package :size="48" class="mx-auto mb-3 text-gray-300" />
        <p class="text-sm text-gray-400">No merchandise yet. Add your first item.</p>
      </div>
    </div>

    <!-- Orders tab -->
    <div v-if="activeTab==='orders'">
      <div class="flex gap-3 mb-4 flex-wrap">
        <select v-model="orderFilter" class="input text-sm w-40">
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div v-if="filteredOrders.length" class="bg-white border border-gray-100 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-brand-green text-white">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Buyer</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Item</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Date</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id"
              class="border-b border-gray-50 hover:bg-brand-cream/20">
              <td class="px-4 py-3">
                <p class="font-semibold text-gray-800">{{ o.buyer_name }}</p>
                <p class="text-xs text-gray-400">{{ o.buyer_email }}</p>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <p class="text-sm">{{ o.souvenir_name }}</p>
                <p class="text-xs text-gray-400">Qty: {{ o.quantity }}</p>
              </td>
              <td class="px-4 py-3 font-bold text-brand-green">₦{{ fmtP(o.total_amount) }}</td>
              <td class="px-4 py-3">
                <span class="badge text-xs" :class="statusClass(o.status)">{{ o.status }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{{ fmt(o.created_at) }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="o.status==='paid'"
                  class="btn-green text-xs py-1 px-3 flex items-center gap-1 ml-auto"
                  @click="markDelivered(o.id)">
                  <CheckCircle2 :size="11" /> Delivered
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="bg-white border border-dashed border-gray-200 py-16 text-center">
        <ShoppingCart :size="48" class="mx-auto mb-3 text-gray-300" />
        <p class="text-sm text-gray-400">No orders yet.</p>
      </div>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <AppModal v-model="modal" :title="editing ? 'Edit Souvenir' : 'Add Souvenir'" size="lg">
    <form @submit.prevent="save" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Item Name <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
            placeholder="e.g. MYS3 T-Shirt, Notebook, Tote Bag" />
          <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
        </div>
        <div>
          <label class="label">Related Event <span class="text-gray-400 font-normal text-xs">(optional)</span></label>
          <select v-model="form.event_id" class="input text-sm">
            <option :value="null">All events / General</option>
            <option v-for="e in events" :key="e.id" :value="e.id">
              {{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Price (₦) <span class="text-red-500">*</span></label>
          <input v-model.number="form.price" type="number" min="0" step="50" class="input"
            :class="{'input-error':errs.price}" placeholder="5000" />
          <p v-if="errs.price" class="text-red-500 text-xs mt-1">{{ errs.price }}</p>
        </div>
      </div>
      <div>
        <label class="label">Description</label>
        <textarea v-model="form.description" class="input" rows="3"
          placeholder="Describe the item — material, sizes available, etc." />
      </div>
      <div>
        <label class="label">Image URL</label>
        <input v-model="form.image_url" class="input" placeholder="https://... (product photo)" />
        <div v-if="form.image_url" class="mt-2 w-24 h-24 border border-gray-100 overflow-hidden">
          <img :src="form.image_url" class="w-full h-full object-cover" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="label">Stock Qty</label>
          <input v-model.number="form.available_qty" type="number" min="0" class="input" placeholder="Unlimited" />
        </div>
        <div>
          <label class="label">Sort Order</label>
          <input v-model.number="form.sort_order" type="number" min="0" class="input" />
        </div>
        <div>
          <label class="label">Visibility</label>
          <select v-model="form.is_active" class="input">
            <option :value="1">Visible (shop)</option>
            <option :value="0">Hidden</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Saving…' : (editing ? 'Update' : 'Create Item') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <ConfirmModal v-model="deleteModal" title="Delete Souvenir"
    :message="`Delete '${deleting?.name}'? Cannot be undone.`"
    type="danger" confirm-label="Delete" :loading="deleteBusy"
    @confirm="doDelete" />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Plus, Loader, Save, Pencil, Trash2, Package, ShoppingCart,
  Banknote, Clock, CheckCircle2,
} from 'lucide-vue-next';
import AppModal    from '@/components/common/AppModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert     = useAlertStore();
const souvenirs = ref([]);
const orders    = ref([]);
const events    = ref([]);
const loading   = ref(false);
const saving    = ref(false);
const deleteBusy= ref(false);
const modal     = ref(false);
const deleteModal=ref(false);
const editing   = ref(null);
const deleting  = ref(null);
const activeTab = ref('items');
const orderFilter=ref('');

const form = reactive({ event_id:null, name:'', description:'', price:'', image_url:'', available_qty:'', sort_order:0, is_active:1 });
const errs = reactive({ name:'', price:'' });

const totalRevenue  = computed(() => orders.value.filter(o=>o.status==='paid'||o.status==='delivered').reduce((s,o)=>s+Number(o.total_amount||0),0));
const pendingOrders = computed(() => orders.value.filter(o=>o.status==='paid').length);
const filteredOrders= computed(() => orderFilter.value ? orders.value.filter(o=>o.status===orderFilter.value) : orders.value);

const statusClass = (s) => ({
  pending:   'bg-gray-100 text-gray-500',
  paid:      'bg-green-100 text-green-700',
  delivered: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}[s] ?? '');

const fmtP = (n) => Number(n||0).toLocaleString('en-NG');
const fmt  = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '';

onMounted(async () => {
  loading.value = true;
  try {
    const [svRes, orRes, evRes] = await Promise.all([
      api.get('/souvenirs/all'),
      api.get('/souvenir-orders'),
      api.get('/events'),
    ]);
    souvenirs.value = svRes.data.data || [];
    orders.value    = orRes.data.data || [];
    events.value    = evRes.data.data || [];
  } catch { alert.error('Failed to load.'); }
  finally { loading.value = false; }
});

const resetForm = () => {
  Object.assign(form, { event_id:null, name:'', description:'', price:'', image_url:'', available_qty:'', sort_order: souvenirs.value.length, is_active:1 });
  Object.assign(errs, { name:'', price:'' });
  editing.value = null;
};

const openCreate = () => { resetForm(); modal.value=true; };
const openEdit   = (sv) => {
  editing.value = sv.id;
  Object.assign(form, { event_id: sv.event_id||null, name: sv.name, description: sv.description||'',
    price: sv.price, image_url: sv.image_url||'', available_qty: sv.available_qty||'',
    sort_order: sv.sort_order, is_active: sv.is_active });
  modal.value = true;
};

const validate = () => {
  errs.name  = form.name.trim()  ? '' : 'Name is required.';
  errs.price = form.price >= 0   ? '' : 'Valid price required.';
  return !errs.name && !errs.price;
};

const save = async () => {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload = { ...form, available_qty: form.available_qty || null, event_id: form.event_id || null };
    if (editing.value) { await api.put(`/souvenirs/${editing.value}`, payload); alert.success('Updated.'); }
    else               { await api.post('/souvenirs', payload);               alert.success('Created.'); }
    modal.value = false;
    const { data } = await api.get('/souvenirs/all'); souvenirs.value = data.data || [];
  } catch (e) { alert.error(e.response?.data?.message || 'Save failed.'); }
  finally { saving.value = false; }
};

const promptDelete = (sv) => { deleting.value=sv; deleteModal.value=true; };
const doDelete = async () => {
  deleteBusy.value = true;
  try {
    await api.delete(`/souvenirs/${deleting.value.id}`);
    alert.success('Deleted.'); deleteModal.value=false;
    const { data } = await api.get('/souvenirs/all'); souvenirs.value = data.data || [];
  } catch (e) { alert.error(e.response?.data?.message || 'Delete failed.'); }
  finally { deleteBusy.value=false; }
};

const markDelivered = async (id) => {
  try { await api.patch(`/souvenir-orders/${id}/deliver`); alert.success('Marked as delivered.');
    const { data } = await api.get('/souvenir-orders'); orders.value = data.data || [];
  } catch { alert.error('Failed.'); }
};
</script>
