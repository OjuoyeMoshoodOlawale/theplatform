<template>
  <div class="space-y-5">
    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-brand-green text-white p-5">
        <p class="text-white/50 text-xs uppercase tracking-wider mb-1">Total Requested</p>
        <p class="font-display font-bold text-2xl">₦{{ fmtP(summary.total_requested) }}</p>
      </div>
      <div class="bg-yellow-50 border border-yellow-100 p-5">
        <p class="text-yellow-600 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
          <Clock :size="11" /> Pending
        </p>
        <p class="font-display font-bold text-2xl text-yellow-700">{{ summary.pending || 0 }}</p>
      </div>
      <div class="bg-green-50 border border-green-100 p-5">
        <p class="text-green-600 text-xs uppercase tracking-wider mb-1">Approved</p>
        <p class="font-display font-bold text-2xl text-green-700">₦{{ fmtP(summary.total_approved) }}</p>
      </div>
      <div class="bg-white border border-gray-100 p-5">
        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Paid Out</p>
        <p class="font-display font-bold text-2xl text-brand-green">₦{{ fmtP(summary.total_paid) }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex gap-2 flex-wrap">
        <select v-model="filterStatus" class="input text-sm w-36" @change="load">
          <option value="">All Status</option>
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <select v-if="isAdmin" v-model="filterDept" class="input text-sm w-48" @change="load">
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="14" /> Raise Request
      </button>
    </div>

    <!-- Requests table -->
    <div class="bg-white border border-gray-100 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-16">
        <Loader :size="28" class="animate-spin text-brand-green/40" />
      </div>
      <div v-else-if="expenses.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Request</th>
              <th v-if="isAdmin" class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Department</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Priority</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
              <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 hidden md:table-cell">Date</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in expenses" :key="e.id"
              class="border-b border-gray-50 hover:bg-brand-cream/20 transition-colors">
              <td class="px-4 py-4">
                <p class="font-semibold text-gray-800 truncate max-w-[200px]">{{ e.title }}</p>
                <p v-if="e.description" class="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{{ e.description }}</p>
                <p v-if="e.due_date" class="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                  <Calendar :size="10" /> Due: {{ fmt(e.due_date) }}
                </p>
              </td>
              <td v-if="isAdmin" class="px-4 py-4">
                <span class="text-sm font-medium flex items-center gap-1.5">
                  <Building2 :size="13" class="text-brand-green" />
                  {{ e.department_name }}
                </span>
                <p class="text-xs text-gray-400">{{ e.raised_by_name }}</p>
              </td>
              <td class="px-4 py-4">
                <p class="font-display font-bold text-brand-green">₦{{ fmtP(e.amount_requested) }}</p>
                <p v-if="e.amount_approved && e.amount_approved !== e.amount_requested"
                  class="text-xs text-green-600">Approved: ₦{{ fmtP(e.amount_approved) }}</p>
                <p v-if="e.amount_paid" class="text-xs text-blue-600">Paid: ₦{{ fmtP(e.amount_paid) }}</p>
              </td>
              <td class="px-4 py-4">
                <span class="badge text-xs" :class="priorityClass(e.priority)">
                  <component :is="priorityIcon(e.priority)" :size="9" class="inline mr-0.5" />
                  {{ e.priority }}
                </span>
              </td>
              <td class="px-4 py-4">
                <span class="badge text-xs flex items-center gap-1 w-fit" :class="statusClass(e.status)">
                  <component :is="statusIcon(e.status)" :size="10" />
                  {{ e.status }}
                </span>
                <p v-if="e.approve_note" class="text-xs text-gray-400 mt-1 max-w-[140px] truncate italic">
                  "{{ e.approve_note }}"
                </p>
              </td>
              <td class="px-4 py-4 text-xs text-gray-400 hidden md:table-cell">{{ fmt(e.created_at) }}</td>
              <td class="px-4 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5 flex-wrap">
                  <!-- Dept: edit own pending -->
                  <button v-if="canEdit(e)" class="text-brand-green hover:opacity-70"
                    title="Edit" @click="openEdit(e)"><Pencil :size="14" /></button>

                  <!-- Admin: approve/reject pending -->
                  <template v-if="isAdmin && e.status === 'pending'">
                    <button class="btn-green text-xs py-1 px-2.5 flex items-center gap-1"
                      @click="review(e, 'approve')">
                      <CheckCircle2 :size="11" /> Approve
                    </button>
                    <button class="text-xs border border-red-200 text-red-500 px-2.5 py-1 hover:bg-red-50 flex items-center gap-1"
                      @click="review(e, 'reject')">
                      <XCircle :size="11" /> Reject
                    </button>
                  </template>

                  <!-- Admin: mark paid -->
                  <button v-if="isAdmin && e.status === 'approved'"
                    class="btn-green text-xs py-1 px-2.5 flex items-center gap-1"
                    @click="openPay(e)">
                    <Banknote :size="11" /> Mark Paid
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-16 text-center text-gray-400">
        <ReceiptText :size="40" class="mx-auto mb-3 opacity-30" />
        <p class="text-sm">No expense requests found.</p>
        <button class="btn-green text-xs mt-4" @click="openCreate">Raise First Request</button>
      </div>
    </div>
  </div>

  <!-- Create / Edit modal -->
  <AppModal v-model="createModal" :title="editingId ? 'Edit Request' : 'Raise Expense Request'" size="lg">
    <form @submit.prevent="save" class="space-y-4" novalidate>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Title <span class="text-red-500">*</span></label>
          <input v-model="form.title" class="input" :class="{'input-error':errs.title}"
            placeholder="e.g. Cooking gas for day 1, Generator fuel, Sound equipment hire" />
          <p v-if="errs.title" class="text-red-500 text-xs mt-1">{{ errs.title }}</p>
        </div>
        <div v-if="isAdmin">
          <label class="label">Department <span class="text-red-500">*</span></label>
          <select v-model="form.department_id" class="input" :class="{'input-error':errs.department_id}">
            <option value="">Select department…</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <p v-if="errs.department_id" class="text-red-500 text-xs mt-1">{{ errs.department_id }}</p>
        </div>
        <div>
          <label class="label">Related Event <span class="text-gray-400 font-normal text-xs">(optional)</span></label>
          <select v-model="form.event_id" class="input">
            <option value="">Not event-specific</option>
            <option v-for="ev in events" :key="ev.id" :value="ev.id">{{ ev.display_title || ev.title }}</option>
          </select>
        </div>
        <div>
          <label class="label">Amount Requested (₦) <span class="text-red-500">*</span></label>
          <input v-model.number="form.amount_requested" type="number" min="1" class="input"
            :class="{'input-error':errs.amount_requested}" placeholder="5000" />
          <p v-if="errs.amount_requested" class="text-red-500 text-xs mt-1">{{ errs.amount_requested }}</p>
        </div>
        <div>
          <label class="label">Priority</label>
          <select v-model="form.priority" class="input">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent (High Priority)</option>
          </select>
        </div>
        <div>
          <label class="label">Needed By (Date)</label>
          <input v-model="form.due_date" type="date" class="input" />
        </div>
      </div>
      <div>
        <label class="label">Description / Justification</label>
        <textarea v-model="form.description" class="input" rows="3"
          placeholder="Explain what the funds will be used for and why they are needed…"></textarea>
      </div>
      <div>
        <label class="label">Additional Notes</label>
        <textarea v-model="form.raise_note" class="input" rows="2"
          placeholder="Any other information for the approver…"></textarea>
      </div>
      <div class="flex gap-2 pt-3 border-t border-gray-100">
        <button type="submit" :disabled="saving" class="btn-green text-xs px-6 flex items-center gap-2">
          <component :is="saving ? Loader : Send" :size="14" :class="saving?'animate-spin':''" />
          {{ saving ? 'Submitting…' : (editingId ? 'Update Request' : 'Submit for Approval') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="createModal=false">Cancel</button>
      </div>
    </form>
  </AppModal>

  <!-- Review modal (approve/reject) -->
  <AppModal v-model="reviewModal" :title="reviewAction==='approve' ? 'Approve Request' : 'Reject Request'" size="md">
    <div class="space-y-4">
      <div class="bg-gray-50 p-4 rounded">
        <p class="font-semibold">{{ reviewing?.title }}</p>
        <p class="text-brand-green font-display font-bold text-xl mt-1">₦{{ fmtP(reviewing?.amount_requested) }}</p>
        <p class="text-xs text-gray-400 mt-1">{{ reviewing?.department_name }}</p>
      </div>
      <div v-if="reviewAction==='approve'">
        <label class="label">Amount to Approve (₦)</label>
        <input v-model.number="reviewForm.amount_approved" type="number" class="input"
          :placeholder="reviewing?.amount_requested" />
        <p class="text-xs text-gray-400 mt-1">Leave blank to approve the full requested amount.</p>
      </div>
      <div>
        <label class="label">{{ reviewAction==='approve' ? 'Approval' : 'Rejection' }} Note</label>
        <textarea v-model="reviewForm.approve_note" class="input" rows="3"
          :placeholder="reviewAction==='approve' ? 'Any instructions or conditions for payment…' : 'Reason for rejection…'">
        </textarea>
      </div>
      <div class="flex gap-2 pt-2">
        <button class="text-xs px-5 py-2 font-bold uppercase tracking-wide flex items-center gap-2"
          :class="reviewAction==='approve' ? 'btn-green' : 'bg-red-500 text-white hover:bg-red-600'"
          :disabled="reviewing_saving" @click="submitReview">
          <component :is="reviewing_saving ? Loader : (reviewAction==='approve' ? CheckCircle2 : XCircle)"
            :size="14" :class="reviewing_saving?'animate-spin':''" />
          {{ reviewing_saving ? 'Saving…' : (reviewAction==='approve' ? 'Approve' : 'Reject') }}
        </button>
        <button class="btn-ghost text-xs" @click="reviewModal=false">Cancel</button>
      </div>
    </div>
  </AppModal>

  <!-- Pay modal -->
  <AppModal v-model="payModal" title="Record Payment" size="md">
    <div class="space-y-4">
      <div class="bg-green-50 border border-green-100 p-4 rounded">
        <p class="font-semibold">{{ paying?.title }}</p>
        <p class="text-green-700 font-display font-bold text-xl mt-1">
          Approved: ₦{{ fmtP(paying?.amount_approved || paying?.amount_requested) }}
        </p>
      </div>
      <div>
        <label class="label">Amount Paid (₦)</label>
        <input v-model.number="payForm.amount_paid" type="number" class="input"
          :placeholder="paying?.amount_approved || paying?.amount_requested" />
      </div>
      <div>
        <label class="label">Payment Reference / Note</label>
        <textarea v-model="payForm.pay_note" class="input" rows="2"
          placeholder="Transfer reference, receipt number, or any note…"></textarea>
      </div>
      <div class="flex gap-2 pt-2">
        <button class="btn-green text-xs px-6 flex items-center gap-2" :disabled="pay_saving" @click="submitPay">
          <component :is="pay_saving ? Loader : Banknote" :size="14" :class="pay_saving?'animate-spin':''" />
          {{ pay_saving ? 'Saving…' : 'Confirm Payment' }}
        </button>
        <button class="btn-ghost text-xs" @click="payModal=false">Cancel</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Plus, Loader, Send, Pencil, Building2, Clock, Calendar, Banknote,
  CheckCircle2, XCircle, ReceiptText, AlertTriangle, ArrowUp, Minus,
} from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import { useAuthStore  } from '@/stores/authStore.js';
import api from '@/composables/useApi.js';

const alert       = useAlertStore();
const authStore   = useAuthStore();
const isAdmin     = computed(() => ['super_admin','admin'].includes(authStore.admin?.role));

const expenses    = ref([]);
const departments = ref([]);
const events      = ref([]);
const summary     = ref({});
const loading     = ref(false);
const saving      = ref(false);
const reviewing_saving = ref(false);
const pay_saving  = ref(false);
const filterStatus= ref('');
const filterDept  = ref('');
const createModal = ref(false);
const reviewModal = ref(false);
const payModal    = ref(false);
const editingId   = ref(null);
const reviewing   = ref(null);
const reviewAction= ref('approve');
const paying      = ref(null);

const statuses = [
  { value:'pending',  label:'Pending'  },
  { value:'approved', label:'Approved' },
  { value:'paid',     label:'Paid'     },
  { value:'rejected', label:'Rejected' },
];

const form = reactive({
  title:'', department_id:'', event_id:'',
  amount_requested:'', priority:'normal',
  description:'', raise_note:'', due_date:'',
});
const errs = reactive({ title:'', department_id:'', amount_requested:'' });
const reviewForm = reactive({ amount_approved:'', approve_note:'' });
const payForm    = reactive({ amount_paid:'', pay_note:'' });

const load = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filterStatus.value) params.status      = filterStatus.value;
    if (filterDept.value)   params.department_id= filterDept.value;
    const [expRes, sumRes] = await Promise.all([
      api.get('/expenses', { params }),
      api.get('/expenses/summary'),
    ]);
    expenses.value = expRes.data.data || [];
    summary.value  = sumRes.data.data || {};
  } catch { alert.error('Failed to load expenses.'); }
  finally { loading.value = false; }
};

onMounted(async () => {
  const [depRes, evRes] = await Promise.all([
    api.get('/departments'),
    api.get('/events'),
  ]);
  departments.value = depRes.data.data || [];
  events.value      = (evRes.data.data || []).map(e => ({
    ...e, display_title: `[${e.edition}] ${e.title}`,
  }));
  load();
});

const fmtP = (n) => Number(n||0).toLocaleString('en-NG', { minimumFractionDigits:0 });
const fmt  = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }) : '';

const statusClass = (s) => ({
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  paid:     'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-600',
}[s] ?? '');

const statusIcon = (s) => ({ pending:Clock, approved:CheckCircle2, paid:Banknote, rejected:XCircle }[s] ?? Clock);

const priorityClass = (p) => ({
  urgent: 'bg-red-100 text-red-600',
  normal: 'bg-gray-100 text-gray-600',
  low:    'bg-gray-50 text-gray-400',
}[p] ?? '');

const priorityIcon = (p) => ({ urgent:AlertTriangle, normal:Minus, low:ArrowUp }[p] ?? Minus);

const canEdit = (e) => {
  if (isAdmin.value) return false; // admins use review actions
  return e.status === 'pending' && e.raised_by === authStore.admin?.id;
};

const resetForm = () => {
  Object.assign(form, { title:'', department_id: authStore.admin?.department_id || '',
    event_id:'', amount_requested:'', priority:'normal', description:'', raise_note:'', due_date:'' });
  Object.assign(errs, { title:'', department_id:'', amount_requested:'' });
  editingId.value = null;
};

const openCreate = () => { resetForm(); createModal.value = true; };
const openEdit   = (e) => {
  editingId.value = e.id;
  Object.assign(form, { title:e.title, department_id:e.department_id, event_id:e.event_id||'',
    amount_requested:e.amount_requested, priority:e.priority,
    description:e.description||'', raise_note:e.raise_note||'', due_date:e.due_date||'' });
  createModal.value = true;
};

const validate = () => {
  errs.title            = form.title.trim()          ? '' : 'Title is required.';
  errs.amount_requested = form.amount_requested > 0  ? '' : 'Amount must be > 0.';
  if (isAdmin.value) errs.department_id = form.department_id ? '' : 'Department is required.';
  return !Object.values(errs).some(Boolean);
};

const save = async () => {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload = { ...form, event_id: form.event_id || null, department_id: form.department_id || null };
    if (editingId.value) { await api.put(`/expenses/${editingId.value}`, payload); alert.success('Request updated.'); }
    else                 { await api.post('/expenses', payload); alert.success('Request submitted for approval!'); }
    createModal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Failed.'); }
  finally { saving.value = false; }
};

const review = (e, action) => {
  reviewing.value = e; reviewAction.value = action;
  reviewForm.amount_approved = ''; reviewForm.approve_note = '';
  reviewModal.value = true;
};

const submitReview = async () => {
  reviewing_saving.value = true;
  try {
    await api.post(`/expenses/${reviewing.value.id}/review`, {
      action: reviewAction.value,
      amount_approved: reviewForm.amount_approved || null,
      approve_note: reviewForm.approve_note || null,
    });
    alert.success(reviewAction.value === 'approve' ? 'Request approved!' : 'Request rejected.');
    reviewModal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Failed.'); }
  finally { reviewing_saving.value = false; }
};

const openPay = (e) => { paying.value = e; payForm.amount_paid=''; payForm.pay_note=''; payModal.value=true; };
const submitPay = async () => {
  pay_saving.value = true;
  try {
    await api.post(`/expenses/${paying.value.id}/pay`, payForm);
    alert.success('Payment recorded!'); payModal.value=false; load();
  } catch (err) { alert.error(err.response?.data?.message || 'Failed.'); }
  finally { pay_saving.value = false; }
};
</script>
