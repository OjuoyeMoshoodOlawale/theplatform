<template>
  <div class="space-y-5">
    <div class="grid grid-cols-3 gap-4">
      <StatsWidget label="Checked In"  :value="live.checked_in  ?? '—'" :icon="ShieldCheck" iconBg="bg-green-50"  iconColor="text-green-600" />
      <StatsWidget label="Checked Out" :value="live.checked_out ?? '—'" :icon="LogOut"      iconBg="bg-blue-50"   iconColor="text-blue-600" />
      <StatsWidget label="On Premises" :value="live.on_premises  ?? '—'" :icon="Users"       iconBg="bg-brand-cream" />
    </div>

    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="font-display font-bold text-xl text-brand-green">Attendance Log</h2>
      <div class="flex gap-2">
        <input v-model="search" class="input text-sm w-48" placeholder="Search name / ticket…" />
        <button class="btn-green text-xs" @click="load">Refresh</button>
      </div>
    </div>

    <DataTable :columns="cols" :rows="rows" :loading="loading" :pagination="pagination" @page="changePage">
      <template #cell-name="{ row }">
        <div>
          <p class="font-semibold text-sm">{{ row.name }}</p>
          <p class="text-xs text-gray-400">{{ row.unique_number }}</p>
        </div>
      </template>
      <template #cell-check_in_at="{ row }">{{ row.check_in_at ? fmtTime(row.check_in_at) : '—' }}</template>
      <template #cell-check_out_at="{ row }">{{ row.check_out_at ? fmtTime(row.check_out_at) : '—' }}</template>
      <template #cell-tag_number="{ row }">
        <span v-if="row.tag_number" class="badge-gold text-xs">{{ row.tag_number }}</span>
        <span v-else class="text-gray-300 text-xs">No tag</span>
      </template>
      <template #cell-status="{ row }">
        <span class="badge text-xs" :class="row.check_out_at ? 'bg-gray-100 text-gray-500' : row.check_in_at ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'">
          {{ row.check_out_at ? 'Left' : row.check_in_at ? 'Present' : 'Not in' }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <button v-if="!row.check_out_at && row.check_in_at"
            class="text-xs text-red-500 hover:text-red-700 font-semibold"
            @click="checkOut(row.attendance_id)">Check Out</button>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { ShieldCheck, LogOut, Users } from 'lucide-vue-next';
import StatsWidget from '@/components/admin/StatsWidget.vue';
import DataTable   from '@/components/admin/DataTable.vue';
import { useEventStore } from '@/stores/eventStore.js';
import { useAlertStore  } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const eventStore = useEventStore();
const alert = useAlertStore();
const rows       = ref([]);
const live       = ref({});
const loading    = ref(false);
const search     = ref('');
const pagination = ref(null);
const page       = ref(1);

const cols = [
  { key:'name',         label:'Participant' },
  { key:'check_in_at',  label:'Checked In'  },
  { key:'check_out_at', label:'Checked Out' },
  { key:'tag_number',   label:'Tag'         },
  { key:'category_name',label:'Category'    },
  { key:'status',       label:'Status'      },
];

const load = async () => {
  await eventStore.fetchActiveEvent();
  const eid = eventStore.activeEvent?.id;
  if (!eid) return;
  loading.value = true;
  try {
    const [liveRes, logRes] = await Promise.all([
      api.get(`/attendance/live/${eid}`),
      api.get(`/attendance/report/${eid}`, { params: { page: page.value, search: search.value } }),
    ]);
    live.value       = liveRes.data.data ?? {};
    rows.value       = logRes.data.data  ?? [];
    pagination.value = logRes.data.pagination ?? null;
  } catch { alert.error('Failed to load attendance.'); }
  finally { loading.value = false; }
};

onMounted(load);
watch(search, () => { page.value = 1; load(); });

const changePage = (p) => { page.value = p; load(); };

const checkOut = async (aid) => {
  try {
    await api.post('/attendance/checkout', { attendance_id: aid });
    alert.success('Checked out.'); load();
  } catch { alert.error('Checkout failed.'); }
};

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-NG', { hour:'2-digit', minute:'2-digit' });
</script>
