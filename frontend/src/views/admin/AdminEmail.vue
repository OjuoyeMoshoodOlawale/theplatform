<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="font-display font-bold text-xl text-brand-green">Email Campaigns</h2>
      <button class="btn-green text-xs" @click="openCreate">
        <Plus :size="14" /> New Campaign
      </button>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <div class="w-10 h-10 bg-brand-cream flex items-center justify-center flex-shrink-0">
          <Send :size="18" class="text-brand-green" />
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wider">Total Sent</p>
          <p class="font-display font-bold text-xl text-brand-green">
            {{ campaigns.reduce((s,c) => s+(c.sent_count||0), 0).toLocaleString() }}
          </p>
        </div>
      </div>
      <div class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <div class="w-10 h-10 bg-brand-cream flex items-center justify-center flex-shrink-0">
          <Mail :size="18" class="text-brand-green" />
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wider">Campaigns</p>
          <p class="font-display font-bold text-xl text-brand-green">{{ campaigns.length }}</p>
        </div>
      </div>
      <div class="bg-white border border-gray-100 p-4 flex items-center gap-3">
        <div class="w-10 h-10 bg-brand-cream flex items-center justify-center flex-shrink-0">
          <Users :size="18" class="text-brand-green" />
        </div>
        <div>
          <p class="text-xs text-gray-400 uppercase tracking-wider">Subscribers</p>
          <p class="font-display font-bold text-xl text-brand-green">{{ subscriberCount }}</p>
        </div>
      </div>
    </div>

    <DataTable :columns="cols" :rows="campaigns" :loading="loading" empty-message="No campaigns yet.">
      <template #cell-subject="{ row }">
        <div>
          <p class="font-semibold text-sm">{{ row.subject }}</p>
          <p class="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Users :size="11" />
            {{ row.recipient_type === 'past_attendees' ? 'Past attendees' : 'All subscribers' }}
          </p>
        </div>
      </template>
      <template #cell-status="{ row }">
        <span class="badge text-xs flex items-center gap-1 w-fit" :class="statusClass(row.status)">
          <component :is="statusIcon(row.status)" :size="10" />
          {{ row.status }}
        </span>
      </template>
      <template #cell-sent_count="{ row }">
        <span v-if="row.status==='sent'" class="text-sm font-semibold">
          {{ row.sent_count }} / {{ row.recipient_count }}
          <span class="text-xs text-gray-400 ml-1">({{ row.failed_count||0 }} failed)</span>
        </span>
        <span v-else class="text-gray-300 text-xs">—</span>
      </template>
      <template #cell-created_at="{ row }">{{ fmt(row.created_at) }}</template>
      <template #actions="{ row }">
        <div class="flex gap-2 items-center justify-end">
          <button v-if="row.status==='draft'"
            class="inline-flex items-center gap-1 text-xs btn-green py-1.5 px-3"
            :disabled="sending===row.id" @click="sendCampaign(row.id)">
            <component :is="sending===row.id ? Loader : Send" :size="12"
              :class="sending===row.id ? 'animate-spin' : ''" />
            {{ sending===row.id ? 'Sending…' : 'Send' }}
          </button>
          <button v-if="row.status==='draft'"
            class="text-gray-400 hover:text-brand-green transition-colors"
            @click="openEdit(row)" title="Edit">
            <Pencil :size="14" />
          </button>
          <button v-if="row.status==='draft'"
            class="text-gray-400 hover:text-red-400 transition-colors"
            @click="deleteCampaign(row.id)" title="Delete">
            <Trash2 :size="14" />
          </button>
        </div>
      </template>
    </DataTable>
  </div>

  <!-- Create / Edit modal -->
  <AppModal v-model="modal" :title="editingId ? 'Edit Campaign' : 'New Email Campaign'" size="xl">
    <form class="space-y-5" @submit.prevent="save">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label">Subject Line <span class="text-red-500">*</span></label>
          <input v-model="form.subject" class="input" placeholder="Exciting news about MYS 4.0!" />
          <p v-if="errs.subject" class="text-red-500 text-xs mt-1">{{ errs.subject }}</p>
        </div>
        <div>
          <label class="label">Recipients</label>
          <select v-model="form.recipient_type" class="input">
            <option value="all">All subscribers</option>
            <option value="past_attendees">Past attendees only</option>
          </select>
        </div>
        <div>
          <label class="label">Related Event <span class="text-gray-400 font-normal">(optional)</span></label>
          <select v-model="form.event_id" class="input">
            <option value="">None</option>
            <option v-for="e in events" :key="e.id" :value="e.id">{{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}</option>
          </select>
        </div>
      </div>

      <!-- HTML body editor -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="label mb-0">Email Body (HTML) <span class="text-red-500">*</span></label>
          <div class="flex gap-1">
            <button type="button" class="text-xs text-brand-green hover:underline" @click="insertTemplate('intro')">
              Insert Intro
            </button>
            <span class="text-gray-300">·</span>
            <button type="button" class="text-xs text-brand-green hover:underline" @click="insertTemplate('event')">
              Insert Event Block
            </button>
          </div>
        </div>
        <textarea v-model="form.body_html" class="input font-mono text-xs leading-relaxed" rows="14"
          placeholder="<h1>Assalamu Alaikum!</h1>&#10;<p>We're excited to announce...</p>"></textarea>
        <p class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <Info :size="11" />
          You can use HTML. Variables: <code class="bg-gray-100 px-1.5 py-0.5 ml-1 font-mono">&#123;&#123;name&#125;&#125;</code>
          for recipient name.
        </p>
        <p v-if="errs.body_html" class="text-red-500 text-xs mt-1">{{ errs.body_html }}</p>
      </div>

      <!-- Preview -->
      <div v-if="form.body_html" class="border border-gray-100">
        <div class="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-100">
          <p class="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Eye :size="12" /> Preview
          </p>
        </div>
        <div class="p-4 max-h-48 overflow-y-auto bg-white prose prose-sm max-w-none text-sm"
          v-html="form.body_html.replace('{{name}}', 'Abdullahi')"></div>
      </div>

      <div class="flex gap-2 pt-2 border-t border-gray-100">
        <button type="submit" :disabled="saving"
          class="btn-green text-xs px-6 flex items-center gap-2">
          <component :is="saving ? Loader : Save" :size="14" :class="saving ? 'animate-spin' : ''" />
          {{ saving ? 'Saving…' : (editingId ? 'Update Draft' : 'Save as Draft') }}
        </button>
        <button type="button" class="btn-ghost text-xs" @click="modal=false">Cancel</button>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Plus, Send, Mail, Users, Pencil, Trash2, Loader, Save, Eye, Info } from 'lucide-vue-next';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-vue-next';
import DataTable from '@/components/admin/DataTable.vue';
import AppModal  from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert    = useAlertStore();
const campaigns= ref([]);
const events   = ref([]);
const loading  = ref(false);
const saving   = ref(false);
const sending  = ref(null);
const modal    = ref(false);
const editingId= ref(null);
const subscriberCount = ref(0);

const form = reactive({ subject:'', body_html:'', recipient_type:'all', event_id:'' });
const errs = reactive({ subject:'', body_html:'' });

const cols = [
  { key:'subject',    label:'Campaign'  },
  { key:'status',     label:'Status'    },
  { key:'sent_count', label:'Delivered' },
  { key:'created_at', label:'Created'   },
];

const statusClass = (s) => ({
  draft:   'bg-gray-100 text-gray-600',
  sending: 'bg-yellow-100 text-yellow-700',
  sent:    'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-600',
}[s] ?? '');

const statusIcon = (s) => ({ draft:Clock, sending:Loader, sent:CheckCircle2, failed:AlertCircle }[s] ?? Clock);
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}) : '—';

const load = async () => {
  loading.value = true;
  try {
    const [cRes, eRes, pRes] = await Promise.all([
      api.get('/email/campaigns'),
      api.get('/events'),
      api.get('/participants?limit=1'),
    ]);
    campaigns.value  = cRes.data.data || [];
    events.value     = eRes.data.data || [];
    subscriberCount.value = pRes.data.pagination?.total || 0;
  } catch { alert.error('Failed to load campaigns.'); }
  finally { loading.value = false; }
};

onMounted(load);

const openCreate = () => {
  editingId.value = null;
  Object.assign(form, { subject:'', body_html:'', recipient_type:'all', event_id:'' });
  Object.assign(errs, { subject:'', body_html:'' });
  modal.value = true;
};

const openEdit = (row) => {
  editingId.value = row.id;
  Object.assign(form, {
    subject: row.subject, body_html: row.body_html||'',
    recipient_type: row.recipient_type, event_id: row.event_id||'',
  });
  modal.value = true;
};

const validate = () => {
  errs.subject  = form.subject.trim()    ? '' : 'Subject is required.';
  errs.body_html= form.body_html.trim()  ? '' : 'Email body is required.';
  return !errs.subject && !errs.body_html;
};

const save = async () => {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload = { ...form, event_id: form.event_id||null };
    if (editingId.value) {
      await api.put(`/email/campaigns/${editingId.value}`, payload);
      alert.success('Campaign updated.');
    } else {
      await api.post('/email/campaigns', payload);
      alert.success('Campaign saved as draft.');
    }
    modal.value = false; load();
  } catch (err) { alert.error(err.response?.data?.message||'Failed to save.'); }
  finally { saving.value = false; }
};

const sendCampaign = async (id) => {
  if (!confirm('Send this campaign now? This cannot be undone.')) return;
  sending.value = id;
  try {
    const { data } = await api.post(`/email/campaigns/${id}/send`);
    alert.success(data.message || 'Campaign is being sent!'); load();
  } catch (err) { alert.error(err.response?.data?.message||'Send failed.'); }
  finally { sending.value = null; }
};

const deleteCampaign = async (id) => {
  if (!confirm('Delete this draft campaign?')) return;
  try { await api.delete(`/email/campaigns/${id}`); alert.success('Deleted.'); load(); }
  catch { alert.error('Delete failed.'); }
};

const insertTemplate = (type) => {
  const templates = {
    intro: `<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#FBF6E6">
  <img src="https://muslimyouthsummit.com/logos/logo-black.png" alt="MYS" style="height:48px;margin-bottom:24px" />
  <h1 style="color:#02462E;font-size:28px;margin:0 0 16px">Assalamu Alaikum, {{name}}!</h1>
  <p style="color:#444;line-height:1.7;margin:0 0 16px">We hope this message finds you in the best of health and faith.</p>
</div>`,
    event: `<div style="background:#02462E;color:white;padding:24px;margin:16px 0;text-align:center">
  <p style="font-size:12px;letter-spacing:3px;color:#FEC700;margin:0 0 8px">UPCOMING EVENT</p>
  <h2 style="font-size:24px;margin:0 0 8px">Muslim Youth Summit 4.0</h2>
  <p style="color:rgba(255,255,255,0.7);margin:0 0 20px">Date · Venue · City</p>
  <a href="#" style="background:#FEC700;color:#02462E;padding:12px 32px;font-weight:bold;text-decoration:none;display:inline-block">
    Register Now →
  </a>
</div>`,
  };
  form.body_html = (form.body_html || '') + '\n' + templates[type];
};
</script>
