<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="font-display font-bold text-xl text-brand-green">All Events</h2>
        <p class="text-sm text-gray-500">Manage MYS event editions</p>
      </div>
      <RouterLink to="/admin/events/new" class="btn-green text-xs">+ New Event</RouterLink>
    </div>

    <DataTable :columns="cols" :rows="events" :loading="loading" empty-message="No events created yet.">
      <template #cell-title="{ row }">
        <div>
          <p class="font-semibold text-gray-800">{{ row.title }}</p>
          <p class="text-xs text-gray-400">{{ row.edition }}</p>
        </div>
      </template>
      <template #cell-status="{ row }">
        <span class="badge text-xs" :class="statusClass(row.status)">{{ row.status }}</span>
      </template>
      <template #cell-start_date="{ row }">{{ fmt(row.start_date) }}</template>
      <template #cell-end_date="{ row }">{{ fmt(row.end_date) }}</template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <RouterLink :to="`/admin/events/${row.id}`"
            class="text-xs text-brand-green underline hover:no-underline font-semibold">Manage</RouterLink>
          <button v-if="row.status === 'draft'"
            class="text-xs bg-green-600 text-white px-2.5 py-1 hover:bg-green-700"
            @click="changeStatus(row.id, 'active')">Activate</button>
          <button v-if="row.status === 'active'"
            class="text-xs bg-yellow-500 text-white px-2.5 py-1 hover:bg-yellow-600"
            @click="changeStatus(row.id, 'completed')">Complete</button>
          <button v-if="row.status !== 'archived'"
            class="text-xs text-red-500 hover:text-red-700 font-semibold"
            @click="changeStatus(row.id, 'archived')">Archive</button>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataTable from '@/components/admin/DataTable.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert  = useAlertStore();
const events  = ref([]);
const loading = ref(false);

const cols = [
  { key: 'title',      label: 'Event' },
  { key: 'status',     label: 'Status' },
  { key: 'start_date', label: 'Start' },
  { key: 'end_date',   label: 'End' },
];

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/events');
    events.value = data.data || [];
  } catch { alert.error('Failed to load events.'); }
  finally { loading.value = false; }
};

onMounted(load);

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }) : '—';
const statusClass = (s) => ({
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-red-50 text-red-500',
}[s] ?? '');

const changeStatus = async (id, status) => {
  if (!confirm(`Change event status to "${status}"?`)) return;
  try {
    await api.patch(`/events/${id}/status`, { status });
    alert.success(`Event marked as ${status}.`);
    load();
  } catch (err) {
    alert.error(err.response?.data?.message || 'Status change failed.');
  }
};
</script>
