<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-center gap-2 text-sm text-gray-500">
      <RouterLink to="/admin/participants" class="hover:text-brand-green flex items-center gap-1">
        <Users :size="13" /> Participants
      </RouterLink>
      <ChevronRight :size="14" />
      <span class="text-brand-green font-semibold">Manual Registration</span>
    </div>

    <!-- Info banner -->
    <div class="bg-blue-50 border border-blue-200 px-5 py-4 flex items-start gap-3">
      <Info :size="18" class="text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p class="font-semibold text-blue-800 text-sm">On-site / Manual Registration</p>
        <p class="text-blue-700 text-xs mt-0.5">
          Register a participant directly (walk-in, phone payment, bank transfer, etc.).
          A ticket will be generated instantly and marked as paid.
        </p>
      </div>
    </div>

    <div class="bg-white border border-gray-100 p-8 space-y-6">
      <h2 class="font-display font-bold text-xl text-brand-green border-b border-gray-100 pb-4">
        Register Participant
      </h2>

      <form @submit.prevent="submit" class="space-y-5" novalidate>
        <!-- Event + ticket type -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-brand-cream/50 border border-brand-gold/20">
          <div>
            <label class="label">Event <span class="text-red-500">*</span></label>
            <select v-model="form.event_id" class="input" @change="loadEventData">
              <option value="">Select event…</option>
              <option v-for="e in events" :key="e.id" :value="e.id">{{ e.title }}</option>
            </select>
            <p v-if="errs.event_id" class="text-red-500 text-xs mt-1">{{ errs.event_id }}</p>
          </div>
          <div>
            <label class="label">Ticket Type <span class="text-red-500">*</span></label>
            <select v-model="form.ticket_type_id" class="input" :disabled="!ticketTypes.length">
              <option value="">{{ ticketTypes.length ? 'Select type…' : 'Select event first' }}</option>
              <option v-for="tt in ticketTypes" :key="tt.id" :value="tt.id">
                {{ tt.name }} — ₦{{ fmtP(tt.regular_price) }}
              </option>
            </select>
            <p v-if="errs.ticket_type_id" class="text-red-500 text-xs mt-1">{{ errs.ticket_type_id }}</p>
          </div>
        </div>

        <!-- Category -->
        <div v-if="categories.length">
          <label class="label">Category / Division</label>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <label v-for="c in categories" :key="c.id"
              class="flex items-center gap-2 border-2 p-3 cursor-pointer transition-all text-sm"
              :class="form.category_id===c.id ? 'border-brand-green bg-brand-cream' : 'border-gray-100 hover:border-gray-300'">
              <input type="radio" v-model="form.category_id" :value="c.id" class="accent-brand-green" />
              <span class="w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
              <span class="truncate font-medium">{{ c.name }}</span>
            </label>
          </div>
        </div>

        <!-- Personal details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="label">Full Name <span class="text-red-500">*</span></label>
            <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
              placeholder="Abdullahi Musa Ibrahim" />
            <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
          </div>
          <div>
            <label class="label">Email <span class="text-red-500">*</span></label>
            <input v-model="form.email" type="email" class="input" :class="{'input-error':errs.email}"
              placeholder="participant@email.com" />
            <p v-if="errs.email" class="text-red-500 text-xs mt-1">{{ errs.email }}</p>
          </div>
          <div>
            <label class="label">Phone <span class="text-red-500">*</span></label>
            <input v-model="form.phone" class="input" :class="{'input-error':errs.phone}"
              placeholder="080XXXXXXXX" />
            <p v-if="errs.phone" class="text-red-500 text-xs mt-1">{{ errs.phone }}</p>
          </div>
          <div>
            <label class="label">Gender</label>
            <select v-model="form.gender" class="input">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label class="label">Occupation</label>
            <input v-model="form.occupation" class="input" placeholder="Student / Professional…" />
          </div>
        </div>

        <!-- Payment info -->
        <div class="p-4 bg-gray-50 border border-gray-100 space-y-3">
          <p class="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <CreditCard :size="15" class="text-brand-green" /> Payment Details
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="label">Amount Paid (₦)</label>
              <input v-model.number="form.amount_paid" type="number" min="0" class="input"
                :placeholder="selectedPrice ? String(selectedPrice) : '0'" />
              <!-- Balance calculation -->
              <div v-if="selectedPrice && form.amount_paid >= 0" class="mt-2 text-xs">
                <div v-if="form.amount_paid < selectedPrice"
                  class="p-2 bg-yellow-50 border border-yellow-200 text-yellow-800">
                  <span class="font-bold">Balance Due: ₦{{ (selectedPrice - (form.amount_paid||0)).toLocaleString('en-NG') }}</span>
                  — participant pays remainder at gate
                </div>
                <div v-else class="text-green-600 flex items-center gap-1 p-1">
                  Fully paid ✓
                </div>
              </div>
            </div>
            <div>
              <label class="label">Payment Method</label>
              <select v-model="form.payment_method" class="input">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="pos">POS</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Payment Reference / Note</label>
            <input v-model="form.payment_note" class="input text-sm"
              placeholder="Receipt no., transfer ref., or any note…" />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="send_email" v-model="form.send_email" type="checkbox" class="accent-brand-green w-4 h-4" />
          <label for="send_email" class="text-sm text-gray-700 cursor-pointer flex items-center gap-1.5">
            <Mail :size="13" class="text-brand-green" />
            Send ticket confirmation email to participant
          </label>
        </div>

        <p v-if="serverError" class="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-3">
          {{ serverError }}
        </p>

        <div class="flex gap-3 pt-2 border-t border-gray-100">
          <button type="submit" :disabled="saving" class="btn-green flex-1 justify-center py-4">
            <component :is="saving ? Loader : UserPlus" :size="17" :class="saving ? 'animate-spin' : ''" />
            {{ saving ? 'Registering…' : 'Register & Generate Ticket' }}
          </button>
          <RouterLink to="/admin/participants" class="btn-ghost">Cancel</RouterLink>
        </div>
      </form>
    </div>
  </div>

  <!-- Success modal -->
  <AppModal v-model="successModal" title="Registration Successful!" size="md">
    <div class="text-center py-4 space-y-4">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 :size="36" class="text-green-500" />
      </div>
      <div>
        <p class="font-display font-bold text-xl text-brand-green">{{ createdTicket?.participant_name }}</p>
        <p class="text-gray-500 text-sm mt-1">{{ createdTicket?.participant_email }}</p>
      </div>
      <div class="bg-brand-cream p-4 inline-block">
        <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Ticket Number</p>
        <p class="font-display font-bold text-2xl text-brand-green tracking-widest">
          {{ createdTicket?.unique_number }}
        </p>
      </div>
      <div class="flex gap-2 justify-center pt-2">
        <RouterLink :to="`/ticket/${createdTicket?.unique_number}`" target="_blank"
          class="btn-green text-xs">
          <Eye :size="14" /> View Ticket
        </RouterLink>
        <button class="btn-outline text-xs" @click="resetAndNew">
          <UserPlus :size="14" /> Register Another
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  Users, ChevronRight, Info, CreditCard, Mail, UserPlus, Loader,
  CheckCircle2, Eye,
} from 'lucide-vue-next';
import AppModal from '@/components/common/AppModal.vue';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const alert       = useAlertStore();
const events      = ref([]);
const ticketTypes = ref([]);
const categories  = ref([]);
const saving      = ref(false);
const successModal= ref(false);
const createdTicket = ref(null);
const serverError = ref('');

const form = reactive({
  event_id:'', ticket_type_id:'', category_id:null,
  name:'', email:'', phone:'', gender:'', occupation:'',
  amount_paid:'', payment_method:'cash', payment_note:'', send_email:true,
});
const errs = reactive({ event_id:'', ticket_type_id:'', name:'', email:'', phone:'' });

onMounted(async () => {
  const { data } = await api.get('/events');
  events.value = (data.data||[]);
  // Auto-select active event
  const active = events.value.find(e=>e.status==='active');
  if (active) { form.event_id = active.id; await loadEventData(); }
});

const loadEventData = async () => {
  ticketTypes.value = []; categories.value = [];
  form.ticket_type_id = ''; form.category_id = null;
  if (!form.event_id) return;
  try {
    const [ttRes, catRes] = await Promise.all([
      api.get(`/events/${form.event_id}/ticket-types`),
      api.get(`/categories`),
    ]);
    ticketTypes.value = ttRes.data.data||[];
    categories.value  = (catRes.data.data||[]).filter(c=>c.is_active);
    if (ticketTypes.value.length===1) form.ticket_type_id = ticketTypes.value[0].id;
  } catch {}
};

const selectedType = computed(()=> ticketTypes.value.find(t=>t.id===form.ticket_type_id));
const selectedPrice= computed(()=> selectedType.value?.regular_price || 0);
const fmtP = (n) => Number(n||0).toLocaleString('en-NG');

const validate = () => {
  errs.event_id      = form.event_id       ? '' : 'Please select an event.';
  errs.ticket_type_id= form.ticket_type_id ? '' : 'Please select a ticket type.';
  errs.name          = form.name.trim()    ? '' : 'Full name is required.';
  errs.email         = /\S+@\S+\.\S+/.test(form.email) ? '' : 'Valid email required.';
  errs.phone         = form.phone.trim()   ? '' : 'Phone is required.';
  return !Object.values(errs).some(Boolean);
};

const submit = async () => {
  if (!validate()) return;
  saving.value = true; serverError.value = '';
  try {
    const payload = {
      event_id:       form.event_id,
      ticket_type_id: form.ticket_type_id,
      category_id:    form.category_id || null,
      name:           form.name.trim(),
      email:          form.email.trim().toLowerCase(),
      phone:          form.phone.trim(),
      gender:         form.gender || null,
      occupation:     form.occupation || null,
      amount_paid:    form.amount_paid || selectedPrice.value || 0,
      payment_method: form.payment_method,
      payment_note:   form.payment_note,
      send_email:     form.send_email,
      manual:         true, // flag for backend
    };
    const { data } = await api.post('/tickets/manual', payload);
    createdTicket.value = data.data;
    successModal.value  = true;
  } catch (err) {
    serverError.value = err.response?.data?.message || 'Registration failed. Please try again.';
  } finally { saving.value = false; }
};

const resetAndNew = () => {
  successModal.value = false; createdTicket.value = null;
  Object.assign(form, { name:'', email:'', phone:'', gender:'', occupation:'',
    amount_paid:'', payment_method:'cash', payment_note:'', send_email:true,
    category_id:null, ticket_type_id: ticketTypes.value.length===1 ? ticketTypes.value[0].id : '' });
  serverError.value = '';
};
</script>
