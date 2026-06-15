<template>
  <div class="min-h-screen bg-brand-cream flex flex-col items-center px-4 py-8">
    <!-- Header -->
    <div class="flex items-center gap-2.5 mb-8">
      <img src="/logos/logo.svg" alt="MYS" class="h-10" />
      <div>
        <p class="font-display font-bold text-brand-green leading-tight">Muslim Youth Summit</p>
        <p class="text-xs text-brand-green/60">Tag Verification</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center gap-3 mt-12">
      <Loader :size="32" class="animate-spin text-brand-green" />
      <p class="text-sm text-brand-green/60">Looking up tag…</p>
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
      <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <XCircle :size="32" class="text-red-400" />
      </div>
      <h1 class="font-display font-bold text-xl text-gray-800 mb-1">Tag Not Found</h1>
      <p class="text-sm text-gray-500">No tag matches <span class="font-mono font-semibold">{{ tagNumber }}</span>. Please check the number.</p>
    </div>

    <!-- Result card -->
    <div v-else-if="data" class="bg-white rounded-2xl shadow-lg overflow-hidden max-w-sm w-full">
      <!-- Tag number banner -->
      <div class="bg-brand-green text-white px-6 py-4 text-center">
        <p class="text-white/50 text-xs uppercase tracking-widest">Tag Number</p>
        <p class="font-display font-bold text-3xl tracking-wide">{{ data.tag_number }}</p>
        <p class="text-white/60 text-xs mt-1">{{ data.event_title }} · {{ data.edition }}</p>
      </div>

      <!-- Assigned -->
      <div v-if="data.assigned" class="p-6 space-y-5">
        <div class="flex flex-col items-center text-center">
          <div class="w-20 h-20 rounded-full bg-brand-green flex items-center justify-center mb-3">
            <span class="text-white font-bold text-3xl">{{ data.participant.name?.[0]?.toUpperCase() }}</span>
          </div>
          <h1 class="font-display font-bold text-2xl text-brand-green">{{ data.participant.name }}</h1>
          <span v-if="data.participant.category"
            class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            :style="{ backgroundColor: (data.participant.category_color || '#02462E') + '22', color: data.participant.category_color || '#02462E' }">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: data.participant.category_color || '#02462E' }"></span>
            {{ data.participant.category }}
          </span>
        </div>

        <!-- Details -->
        <div class="border-t border-gray-100 pt-4 space-y-2.5">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Ticket No.</span>
            <span class="font-mono font-semibold text-gray-700">{{ data.participant.ticket_number }}</span>
          </div>
          <div v-if="data.participant.ticket_type" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Ticket Type</span>
            <span class="font-semibold text-gray-700">{{ data.participant.ticket_type }}</span>
          </div>
          <div v-if="data.participant.email" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Email</span>
            <span class="font-semibold text-gray-700 truncate ml-2">{{ data.participant.email }}</span>
          </div>
          <div v-if="data.participant.phone" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Phone</span>
            <span class="font-semibold text-gray-700">{{ data.participant.phone }}</span>
          </div>
          <div v-if="data.participant.gender" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Gender</span>
            <span class="font-semibold text-gray-700 capitalize">{{ data.participant.gender.replace(/_/g,' ') }}</span>
          </div>
          <div v-if="data.participant.occupation" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Occupation</span>
            <span class="font-semibold text-gray-700">{{ data.participant.occupation }}</span>
          </div>
          <div v-if="data.participant.hostel" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Hostel</span>
            <span class="font-semibold text-gray-700">{{ data.participant.hostel }}<span v-if="data.participant.room_number"> · Rm {{ data.participant.room_number }}</span></span>
          </div>
          <div v-if="data.venue" class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Venue</span>
            <span class="font-semibold text-gray-700">{{ data.venue }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-400">Status</span>
            <span v-if="data.participant.checked_out" class="inline-flex items-center gap-1 font-semibold text-gray-500">
              <LogOut :size="14" /> Checked out
            </span>
            <span v-else-if="data.participant.checked_in" class="inline-flex items-center gap-1 font-semibold text-green-600">
              <CheckCircle2 :size="14" /> On-site
            </span>
            <span v-else class="inline-flex items-center gap-1 font-semibold text-amber-600">
              <Clock :size="14" /> Not checked in
            </span>
          </div>
          <div v-if="data.participant.checked_in_at" class="flex items-center justify-between text-xs text-gray-400">
            <span>Checked in</span>
            <span>{{ formatTime(data.participant.checked_in_at) }}</span>
          </div>
          <div v-if="data.participant.checked_out_at" class="flex items-center justify-between text-xs text-gray-400">
            <span>Checked out</span>
            <span>{{ formatTime(data.participant.checked_out_at) }}</span>
          </div>
        </div>

        <div class="bg-brand-cream rounded-xl p-3 text-center">
          <p class="text-xs text-brand-green/70">This tag belongs to the attendee above.</p>
        </div>
      </div>

      <!-- Not assigned -->
      <div v-else class="p-8 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
          <TicketIcon :size="30" class="text-amber-400" />
        </div>
        <div>
          <h1 class="font-display font-bold text-xl text-gray-800">Not Assigned Yet</h1>
          <p class="text-sm text-gray-500 mt-1">
            This tag hasn't been given to anyone yet. It will be assigned to an attendee at registration.
          </p>
        </div>
      </div>
    </div>

    <p class="text-xs text-brand-green/40 mt-8">muslimyouthsummit.com</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Loader, XCircle, CheckCircle2, LogOut, Clock, Ticket as TicketIcon } from 'lucide-vue-next';
import api from '@/composables/useApi.js';

const formatTime = (d) => {
  if (!d) return '';
  try { return new Date(d.replace(' ', 'T')).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return d; }
};

const route = useRoute();
const tagNumber = ref((route.params.tagNumber || '').toUpperCase());
const loading = ref(true);
const notFound = ref(false);
const data = ref(null);

onMounted(async () => {
  if (!tagNumber.value) { loading.value = false; notFound.value = true; return; }
  try {
    const { data: res } = await api.get(`/tags/lookup/${encodeURIComponent(tagNumber.value)}`);
    data.value = res.data;
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
});
</script>
