<template>
  <div class="min-h-screen bg-brand-cream">
    <!-- Header -->
    <div class="bg-brand-green text-white px-6 py-4 flex items-center justify-between">
      <RouterLink to="/" class="flex items-center gap-3">
        <img src="/logos/logo-white.png" alt="MYS" class="h-10" />
      </RouterLink>
      <p class="text-white/60 text-sm flex items-center gap-2">
        <Ticket :size="14" /> Ticket Registration
      </p>
    </div>

    <div class="max-w-xl mx-auto px-4 md:px-6 py-10 md:py-12">
      <!-- No active event -->
      <div v-if="!eventStore.hasActiveEvent && !loading" class="text-center py-20">
        <CalendarX :size="48" class="text-gray-300 mx-auto mb-4" />
        <h2 class="font-display font-bold text-2xl text-brand-green mb-2">No Active Event</h2>
        <p class="text-gray-500 mb-6">Ticket registration is currently closed.</p>
        <RouterLink to="/" class="btn-green">← Back to Home</RouterLink>
      </div>

      <div v-else>
        <!-- Event header -->
        <div class="mb-8">
          <p class="text-brand-gold font-bold text-xs uppercase tracking-widest mb-2">
            {{ eventStore.activeEvent?.edition }}
          </p>
          <h1 class="font-display font-bold text-3xl text-brand-green">
            {{ eventStore.activeEvent?.title }}
          </h1>
          <p class="text-gray-500 text-sm mt-2 flex items-center gap-2">
            <MapPin :size="13" /> {{ eventStore.activeEvent?.venue }}
            · {{ formatDate(eventStore.activeEvent?.start_date) }}
          </p>
        </div>

        <!-- Ticket type picker -->
        <div class="bg-white border border-gray-100 p-5 mb-6">
          <h2 class="font-display font-bold text-base text-brand-green mb-1">Select Your Ticket</h2>
          <p class="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Info :size="11" /> Choose the option that matches your status
          </p>

          <!-- Early bird notice -->
          <div v-if="earlyBirdActive"
            class="flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold px-4 py-2 mb-4">
            <Zap :size="13" />
            Early Bird pricing active until {{ formatDate(eventStore.activeEvent?.early_bird_closes_at) }}
          </div>

          <div v-for="group in groupedTicketTypes" :key="group.category" class="mb-5 last:mb-0">
            <p v-if="group.category !== 'all' && groupedTicketTypes.length > 1"
              class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <GraduationCap :size="11" /> {{ group.label }}
            </p>
            <div class="space-y-2">
              <label v-for="tt in group.types" :key="tt.id"
                class="flex items-center justify-between p-4 border-2 cursor-pointer transition-all"
                :class="form.ticket_type_id===tt.id ? 'border-brand-green bg-brand-cream' : 'border-gray-100 hover:border-brand-green/30'">
                <div class="flex items-center gap-3">
                  <input type="radio" v-model="form.ticket_type_id" :value="tt.id" class="accent-brand-green" />
                  <div>
                    <p class="font-semibold text-sm">{{ tt.name }}</p>
                    <p v-if="tt.description" class="text-xs text-gray-400 mt-0.5">{{ tt.description }}</p>
                    <div v-if="earlyBirdActive && tt.early_bird_price" class="flex items-center gap-1 mt-1">
                      <Zap :size="10" class="text-brand-gold" />
                      <span class="text-xs text-brand-gold font-semibold">Early Bird Active</span>
                    </div>
                  </div>
                </div>
                <div class="text-right flex-shrink-0 ml-4">
                  <p class="font-display font-bold text-xl text-brand-green">
                    ₦{{ fmtP(earlyBirdActive && tt.early_bird_price ? tt.early_bird_price : tt.regular_price) }}
                  </p>
                  <div v-if="earlyBirdActive && tt.early_bird_price" class="flex items-center justify-end gap-1.5">
                    <span class="text-xs text-gray-400 line-through">₦{{ fmtP(tt.regular_price) }}</span>
                    <span class="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5">
                      -{{ Math.round((1 - tt.early_bird_price / tt.regular_price) * 100) }}%
                    </span>
                  </div>
                  <p v-if="tt.quantity_available" class="text-xs mt-1"
                    :class="tt.quantity_available - tt.quantity_sold <= 10 ? 'text-red-500 font-semibold' : 'text-gray-400'">
                    {{ tt.quantity_available - tt.quantity_sold }} left
                  </p>
                </div>
              </label>
            </div>
          </div>
          <p v-if="!eventStore.ticketTypes.length" class="text-gray-400 text-sm text-center py-4">
            No ticket types available yet.
          </p>
        </div>

        <!-- Personal details + Pay -->
        <div class="bg-white border border-gray-100 p-5 mb-6">
          <h2 class="font-display font-bold text-base text-brand-green mb-4">Your Details</h2>
          <form class="space-y-4" @submit.prevent="pay" novalidate>
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="label">Full Name <span class="text-red-500">*</span></label>
                <input v-model="form.name" class="input" :class="{'input-error':errs.name}"
                  placeholder="Abdullahi Musa" autocomplete="name" />
                <p v-if="errs.name" class="text-red-500 text-xs mt-1">{{ errs.name }}</p>
              </div>
              <div>
                <label class="label">Email <span class="text-red-500">*</span></label>
                <input v-model="form.email" type="email" class="input" :class="{'input-error':errs.email}"
                  placeholder="you@email.com" autocomplete="email" />
                <p v-if="errs.email" class="text-red-500 text-xs mt-1">{{ errs.email }}</p>
              </div>
              <div>
                <label class="label">Phone <span class="text-red-500">*</span></label>
                <input v-model="form.phone" class="input" :class="{'input-error':errs.phone}"
                  placeholder="080XXXXXXXX" autocomplete="tel" />
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
                <input v-model="form.occupation" class="input" placeholder="Student / Engineer…" />
              </div>
            </div>

            <!-- Error -->
            <div v-if="serverError" class="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2">
              <AlertCircle :size="15" class="flex-shrink-0 mt-0.5" />
              <span>{{ serverError }}</span>
            </div>

            <!-- Quantity selector -->
            <div v-if="form.ticket_type_id" class="flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-lg">
              <div>
                <p class="font-semibold text-gray-800 text-sm">Number of tickets</p>
                <p class="text-xs text-gray-400">Buying for a group? Add more.</p>
              </div>
              <div class="flex items-center gap-3">
                <button type="button" class="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 text-lg font-bold disabled:opacity-40"
                  :disabled="form.quantity <= 1" @click="form.quantity = Math.max(1, form.quantity - 1)">–</button>
                <span class="font-display font-bold text-xl text-brand-green w-8 text-center">{{ form.quantity }}</span>
                <button type="button" class="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 text-lg font-bold disabled:opacity-40"
                  :disabled="form.quantity >= 20" @click="form.quantity = Math.min(20, form.quantity + 1)">+</button>
              </div>
            </div>

            <!-- Fee breakdown -->
            <div v-if="selectedPrice > 0" class="bg-brand-cream border border-brand-gold/30 p-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Ticket price <span v-if="form.quantity > 1" class="text-gray-400">× {{ form.quantity }}</span></span>
                <span class="font-semibold text-gray-800">{{ fmtNaira(feeInfo.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 flex items-center gap-1">
                  Payment processing fee
                  <span class="text-xs text-gray-400">(Paystack)</span>
                </span>
                <span class="font-semibold text-gray-600">{{ fmtNaira(feeInfo.fee) }}</span>
              </div>
              <div class="flex justify-between text-base pt-2 border-t border-brand-gold/20">
                <span class="font-bold text-brand-green">Total to pay</span>
                <span class="font-display font-bold text-brand-green">{{ fmtNaira(feeInfo.total) }}</span>
              </div>
              <p class="text-xs text-gray-400 pt-1">
                The processing fee is added so the full ticket price reaches the organisers.
              </p>
            </div>

            <!-- Pay button -->
            <div class="pt-2">
              <button type="submit"
                :disabled="processing || !form.ticket_type_id"
                class="btn-gold w-full justify-center py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                <span v-if="processing" class="flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin"></span>
                  Processing…
                </span>
                <span v-else class="flex items-center gap-2">
                  <CreditCard :size="16" />
                  Pay {{ fmtNaira(feeInfo.total) }} with Paystack
                </span>
              </button>
            </div>

            <p class="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <ShieldCheck :size="13" class="text-green-500" />
              Secured by Paystack · Your ticket is emailed instantly on payment
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForm, validators as v } from '@/composables/useForm.js';
import { grossUpForPaystack, fmtNaira } from '@/composables/usePaystackFees.js';
import { useEventStore } from '@/stores/eventStore.js';
import {
  Ticket, CalendarX, MapPin, Info, Zap, GraduationCap,
  ShieldCheck, AlertCircle, CreditCard,
} from 'lucide-vue-next';
import api from '@/composables/useApi.js';

const router      = useRouter();
const route       = useRoute();
const eventStore  = useEventStore();
const loading     = ref(true);
const processing  = ref(false);
const serverError = ref('');

const { form, errs, saving: _saving, serverError: _se, handleSubmit, validate, reset } = useForm({
  name: '', email: '', phone: '', gender: '', occupation: '',
  ticket_type_id: route.query.type ? Number(route.query.type) : null,
  category_id: null,
  quantity: 1,
}, {
  name:  v.required('Full name'),
  email: v.email(),
  phone: v.required('Phone number'),
});

onMounted(async () => {
  await eventStore.fetchActiveEvent();
  loading.value = false;
});

const earlyBirdActive = computed(() =>
  eventStore.activeEvent?.early_bird_closes_at &&
  new Date(eventStore.activeEvent.early_bird_closes_at) > new Date()
);

const CATEGORY_LABELS = {
  all:           'All Participants',
  undergraduate: 'Undergraduate Students',
  graduate:      'Graduate / Postgraduate',
  professional:  'Professionals & Alumni',
  other:         'Other',
};

const groupedTicketTypes = computed(() => {
  const groups = {};
  const order  = ['all','undergraduate','graduate','professional','other'];
  for (const tt of (eventStore.ticketTypes || [])) {
    const cat = tt.participant_category || 'all';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(tt);
  }
  return order
    .filter(cat => groups[cat]?.length)
    .map(cat => ({ category: cat, label: CATEGORY_LABELS[cat], types: groups[cat] }));
});

const selectedType = computed(() =>
  (eventStore.ticketTypes || []).find(t => t.id === form.ticket_type_id)
);

const selectedPrice = computed(() => {
  if (!selectedType.value) return 0;
  return earlyBirdActive.value && selectedType.value.early_bird_price
    ? selectedType.value.early_bird_price
    : selectedType.value.regular_price;
});

const fmtP       = (n) => Number(n || 0).toLocaleString('en-NG');
const feeInfo    = computed(() => grossUpForPaystack(selectedPrice.value * (form.quantity || 1)));
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'}) : '';

// Validation handled by useForm

/** Load Paystack inline script once */
const loadPaystackScript = () => new Promise((resolve) => {
  if (window.PaystackPop) { resolve(true); return; }
  const s = document.createElement('script');
  s.src = 'https://js.paystack.co/v1/inline.js';
  s.onload = () => resolve(true);
  s.onerror = () => resolve(false);
  document.head.appendChild(s);
  setTimeout(() => resolve(false), 5000); // 5s timeout
});

/** Open Paystack inline popup */
const openPaystackPopup = (authData) => {
  return new Promise(async (resolve, reject) => {
    const publicKey = authData.public_key || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    // Reject missing OR placeholder keys (pk_test_xxxx...) → these cause
    // Paystack's "Please enter a valid Key" error
    if (!publicKey || /^pk_(test|live)_x+$/i.test(publicKey) || !/^pk_(test|live)_/.test(publicKey)) {
      reject(new Error('NO_KEY')); return;
    }

    const loaded = await loadPaystackScript();
    if (!loaded || !window.PaystackPop) { reject(new Error('SCRIPT_FAILED')); return; }

    // The server already initialised this transaction with Paystack (we have an
    // access_code). RESUME it instead of calling setup() again — calling setup()
    // with the same ref triggers "Duplicate Transaction Reference".
    try {
      if (authData.access_code && typeof window.PaystackPop === 'function') {
        const popup = new window.PaystackPop();
        popup.resumeTransaction(authData.access_code, {
          onSuccess: (txn) => resolve(txn),
          onCancel:  () => reject(new Error('CLOSED')),
          onError:   () => reject(new Error('SCRIPT_FAILED')),
        });
        return;
      }
    } catch { /* fall through to legacy setup */ }

    // Legacy fallback (older inline.js): setup with ref
    const handler = window.PaystackPop.setup({
      key:      publicKey,
      email:    form.email,
      amount:   Math.round(Number(feeInfo.value.total) * 100), // kobo (incl. fee)
      ref:      authData.reference,
      currency: 'NGN',
      metadata: {
        custom_fields: [
          { display_name: 'Full Name',     variable_name: 'name',   value: form.name },
          { display_name: 'Ticket Number', variable_name: 'ticket', value: authData.ticket_number },
        ],
      },
      onClose: () => reject(new Error('CLOSED')),
      callback: (response) => resolve(response),
    });
    handler.openIframe();
  });
};

const pay = async () => {
  if (!validate() || !form.ticket_type_id) return;
  serverError.value = '';
  processing.value  = true;

  try {
    // 1. Initiate on backend → server creates the Paystack transaction (using the
    //    secret key) and returns authorization_url + access_code + reference.
    const { data } = await api.post('/tickets/initiate', {
      ...form,
      event_id:       eventStore.activeEvent.id,
      ticket_type_id: form.ticket_type_id,
    });
    const authData = data.data;

    // PRIMARY: inline popup — stays on this page (no redirect). Resumes the
    // server-initialised transaction via access_code.
    if (authData.access_code || authData.public_key) {
      try {
        await openPaystackPopup({
          access_code: authData.access_code,
          reference:   authData.reference,
          public_key:  authData.public_key || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email:       form.email,
          amount:      feeInfo.value.total,
        });
        // Paid — verify then go to the confirmation page
        processing.value = true;
        try { await api.get(`/tickets/verify/${authData.reference}`); } catch {}
        router.push(`/ticket/verify?reference=${authData.reference}`);
        return;
      } catch (popupErr) {
        if (popupErr.message === 'CLOSED') {
          serverError.value = 'Payment window closed. Your ticket is reserved — click Pay to try again.';
          processing.value = false;
          return;
        }
        // popup failed (script/key) → fall back to redirect below
      }
    }

    // FALLBACK: redirect to Paystack's hosted checkout.
    if (authData.authorization_url) {
      window.location.href = authData.authorization_url;
      return;
    }

    throw new Error('Could not start the payment. Please try again or contact support.');
  } catch (err) {
    serverError.value = err.response?.data?.message || err.message || 'Payment initiation failed. Please try again.';
    processing.value = false;
  }
};
</script>
