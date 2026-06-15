<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <RouterLink to="/admin/events" class="hover:text-brand-green">Events</RouterLink>
      <span>/</span><span class="text-brand-green font-semibold">New Event</span>
    </div>

    <div class="bg-white border border-gray-100 p-8 space-y-8">
      <h2 class="font-display font-bold text-2xl text-brand-green border-b border-gray-100 pb-4">Create New Event</h2>

      <form @submit.prevent="submit" class="space-y-6" novalidate>
        <!-- Basic info -->
        <section class="space-y-4">
          <h3 class="font-display font-semibold text-brand-green text-sm uppercase tracking-wider">Basic Info</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="label">Event Title *</label>
              <input v-model="form.title" class="input" placeholder="Muslim Youth Summit 3.0" />
              <p v-if="errs.title" class="text-red-500 text-xs mt-1">{{ errs.title }}</p>
            </div>
            <div>
              <label class="label">Edition Code *</label>
              <input v-model="form.edition" class="input" placeholder="MYS3" />
              <p class="text-xs text-gray-400 mt-1">Used in ticket numbers, e.g. MYS3-0001</p>
            </div>
            <div>
              <label class="label">Venue</label>
              <input v-model="form.venue" class="input" placeholder="Lagos City Hall" />
            </div>
            <div class="md:col-span-2">
              <label class="label">Tagline</label>
              <input v-model="form.tagline" class="input" placeholder="Short inspiring tagline" />
            </div>
            <div class="md:col-span-2">
              <label class="label">Description</label>
              <textarea v-model="form.description" class="input" rows="4" placeholder="Full event description…"></textarea>
            </div>
          </div>
        </section>

        <!-- Dates -->
        <section class="space-y-4">
          <h3 class="font-display font-semibold text-brand-green text-sm uppercase tracking-wider">Event Dates</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="label">Start Date *</label>
              <input v-model="form.start_date" type="date" class="input" />
              <p v-if="errs.start_date" class="text-red-500 text-xs mt-1">{{ errs.start_date }}</p>
            </div>
            <div>
              <label class="label">End Date *</label>
              <input v-model="form.end_date" type="date" class="input" />
              <p v-if="errs.end_date" class="text-red-500 text-xs mt-1">{{ errs.end_date }}</p>
            </div>
            <div>
              <label class="label">Early Bird Closes At</label>
              <input v-model="form.early_bird_closes_at" type="datetime-local" class="input" />
            </div>
          </div>
        </section>

        <!-- Ticket types -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-semibold text-brand-green text-sm uppercase tracking-wider">Ticket Types</h3>
            <button type="button" class="text-xs btn-outline py-1.5 px-3" @click="addTicketType">+ Add Type</button>
          </div>
          <div v-for="(tt, i) in form.ticket_types" :key="i"
            class="border border-gray-100 p-4 space-y-3 relative">
            <button v-if="form.ticket_types.length > 1" type="button"
              class="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-sm"
              @click="form.ticket_types.splice(i,1)">&times;</button>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="col-span-2 md:col-span-1">
                <label class="label text-xs">Type Name *</label>
                <input v-model="tt.name" class="input text-sm" placeholder="Regular" />
              </div>
              <div>
                <label class="label text-xs">Regular Price (₦) *</label>
                <input v-model.number="tt.regular_price" type="number" min="0" class="input text-sm" />
              </div>
              <div>
                <label class="label text-xs">Early Bird Price (₦)</label>
                <input v-model.number="tt.early_bird_price" type="number" min="0" class="input text-sm" />
              </div>
              <div>
                <label class="label text-xs">Max Quantity</label>
                <input v-model.number="tt.quantity_available" type="number" min="1" class="input text-sm" placeholder="Unlimited" />
              </div>
            </div>
          </div>
        </section>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button type="submit" :disabled="saving"
            class="btn-green px-8">
            <span v-if="saving">Creating…</span>
            <span v-else>Create Event →</span>
          </button>
          <RouterLink to="/admin/events" class="btn-ghost">Cancel</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const router = useRouter();
const alert  = useAlertStore();
const saving  = ref(false);

const form = reactive({
  title: '', edition: '', ticket_prefix: '', tagline: '', description: '',
  venue: '', start_date: '', end_date: '', early_bird_closes_at: '',
  ticket_types: [{ name: 'Regular', regular_price: 0, early_bird_price: '', quantity_available: '' }],
});
const errs = reactive({ title:'', edition:'', start_date:'', end_date:'' });

const addTicketType = () =>
  form.ticket_types.push({ name: '', regular_price: 0, early_bird_price: '', quantity_available: '' });

const validate = () => {
  errs.title = form.title ? '' : 'Title is required.';
  errs.edition = form.edition ? '' : 'Edition is required.';
  errs.start_date = form.start_date ? '' : 'Start date is required.';
  errs.end_date = form.end_date ? '' : 'End date is required.';
  return !Object.values(errs).some(Boolean);
};

const submit = async () => {
  if (!validate()) return;
  saving.value = true;
  try {
    const payload = {
      ...form,
      ticket_types: form.ticket_types.map(tt => ({
        ...tt,
        early_bird_price:    tt.early_bird_price || null,
        quantity_available:  tt.quantity_available || null,
      })),
    };
    const { data } = await api.post('/events', payload);
    alert.success('Event created successfully!');
    router.push(`/admin/events/${data.data.id}`);
  } catch (err) {
    alert.error(err.response?.data?.message || 'Failed to create event.');
  } finally {
    saving.value = false;
  }
};
</script>
