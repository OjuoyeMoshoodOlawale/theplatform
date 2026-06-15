<template>
  <div class="min-h-screen bg-brand-cream">
    <!-- Nav -->
    <div class="bg-brand-green text-white px-4 md:px-6 py-4 flex items-center justify-between no-print">
      <RouterLink to="/"><img src="/logos/logo-white.png" alt="MYS" class="h-10" /></RouterLink>
      <button v-if="ticket" class="btn-gold text-xs flex items-center gap-1.5" @click="window.print()">
        <Printer :size="14" /> Print Ticket
      </button>
    </div>

    <div class="max-w-lg mx-auto px-4 md:px-6 py-10 md:py-12" id="ticket-print-area">

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <Loader :size="36" class="animate-spin text-brand-green/40 mx-auto" />
        <p class="text-gray-500 mt-4 text-sm">{{ loadingMsg }}</p>
      </div>

      <!-- Error with manual verify form -->
      <div v-else-if="verifyError" class="space-y-4">
        <div class="bg-red-50 border border-red-200 p-5 text-center">
          <XCircle :size="40" class="mx-auto mb-3 text-red-400" />
          <h2 class="font-display font-bold text-xl text-red-700 mb-1">{{ verifyError }}</h2>
          <p class="text-red-600 text-sm">If you completed your payment, enter your reference number below.</p>
        </div>

        <!-- Manual reference input -->
        <div class="bg-white border border-gray-100 p-5">
          <h3 class="font-display font-bold text-brand-green mb-3">Check Payment Status</h3>
          <p class="text-xs text-gray-500 mb-4">
            Your reference number was shown on the Paystack payment page and sent to your email.
            It looks like <code class="bg-gray-100 px-1 rounded text-xs">PAYSTACK_XXXXXXXXX</code>
          </p>
          <div class="flex gap-2">
            <input v-model="manualRef" class="input flex-1 text-sm font-mono"
              placeholder="PAYSTACK_XXXXXXXXX or MYS3-25-000001"
              @keydown.enter="checkManual" />
            <button class="btn-green text-xs px-4 flex-shrink-0" :disabled="!manualRef || checking"
              @click="checkManual">
              <component :is="checking ? Loader : Search" :size="14" :class="checking?'animate-spin':''" />
              Check
            </button>
          </div>
          <p v-if="manualError" class="text-red-500 text-xs mt-2 flex items-center gap-1">
            <AlertCircle :size="12" /> {{ manualError }}
          </p>
        </div>

        <div class="text-center">
          <RouterLink to="/" class="text-sm text-brand-green hover:underline flex items-center gap-1 justify-center">
            <ArrowLeft :size="13" /> Back to Home
          </RouterLink>
        </div>
      </div>

      <!-- Ticket display -->
      <div v-else-if="ticket" class="space-y-4">
        <!-- Status banner -->
        <div class="text-center py-3 px-4 flex items-center justify-center gap-2"
          :class="ticket.status==='paid' && !hasBalance
            ? 'bg-green-50 border border-green-200'
            : hasBalance ? 'bg-yellow-50 border border-yellow-300'
            : 'bg-yellow-50 border border-yellow-200'">
          <component :is="ticket.status==='paid' && !hasBalance ? CheckCircle2 : AlertTriangle"
            :size="16"
            :class="ticket.status==='paid' && !hasBalance ? 'text-green-600' : 'text-yellow-600'" />
          <p class="font-bold text-sm"
            :class="ticket.status==='paid' && !hasBalance ? 'text-green-700' : 'text-yellow-700'">
            {{ ticket.status==='paid' && !hasBalance
              ? 'Payment Confirmed — Fully Paid'
              : hasBalance
                ? `Outstanding Balance: ₦${fmtP(ticket.balance_due)} — Pay at registration desk`
                : 'Payment Pending' }}
          </p>
        </div>

        <!-- Ticket card -->
        <div class="bg-white shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="bg-brand-green text-white p-6">
            <img src="/logos/logo-white.png" alt="MYS" class="h-10 mb-4" />
            <h2 class="font-display font-bold text-2xl">{{ ticket.event_title }}</h2>
            <p v-if="ticket.event_venue" class="text-white/60 text-sm mt-1 flex items-center gap-1.5">
              <MapPin :size="13" /> {{ ticket.event_venue }}
            </p>
            <p v-if="ticket.event_start_date" class="text-white/60 text-sm mt-1 flex items-center gap-1.5">
              <CalendarDays :size="13" /> {{ formatDate(ticket.event_start_date) }}
            </p>
          </div>
          <div class="bg-brand-gold h-1.5"></div>

          <!-- Body -->
          <div class="p-6 space-y-5">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Name</p>
                <p class="font-bold text-gray-800">{{ ticket.participant_name }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Ticket Type</p>
                <p class="font-semibold text-gray-700">{{ ticket.ticket_type_name }}</p>
              </div>
              <div>
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Amount Paid</p>
                <p class="font-bold text-brand-green">₦{{ fmtP(ticket.amount_paid) }}</p>
              </div>
              <div v-if="hasBalance">
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Balance Due</p>
                <p class="font-bold text-red-500">₦{{ fmtP(ticket.balance_due) }}</p>
              </div>
              <div v-if="ticket.payment_method">
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Payment Method</p>
                <p class="font-semibold text-gray-600 capitalize">{{ ticket.payment_method?.replace('_',' ') }}</p>
              </div>
              <div v-if="ticket.is_early_bird">
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Pricing</p>
                <span class="badge-gold text-xs">Early Bird</span>
              </div>
            </div>

            <div v-if="hasBalance" class="bg-yellow-50 border border-yellow-200 p-4 text-sm">
              <p class="font-bold text-yellow-800 flex items-center gap-1.5 mb-1">
                <AlertTriangle :size="14" /> Outstanding Balance
              </p>
              <p class="text-yellow-700">
                Please complete payment of <strong>₦{{ fmtP(ticket.balance_due) }}</strong> at the registration desk on arrival.
              </p>
            </div>

            <div class="border-t border-dashed border-gray-200"></div>

            <!-- Ticket number + QR -->
            <div class="text-center">
              <p class="text-xs text-gray-400 uppercase tracking-widest mb-2">Ticket Number</p>
              <p class="font-display font-bold text-3xl text-brand-green tracking-wider mb-4">
                {{ ticket.unique_number }}
              </p>
              <div v-if="ticket.qr_code_svg"
                class="inline-block p-4 border-2 border-brand-green/20 bg-white"
                v-html="ticket.qr_code_svg"></div>
              <div v-else class="inline-flex items-center gap-2 text-gray-400 text-sm py-4">
                <Loader :size="16" class="animate-spin" /> Generating QR code…
              </div>
              <p class="text-xs text-gray-400 mt-3">Present this QR code at the event gate</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-brand-cream px-6 py-4 flex items-center justify-between">
            <p class="text-xs text-gray-400">Muslim Youth Summit</p>
            <p class="text-xs text-gray-400">{{ ticket.edition }}</p>
          </div>
        </div>

        <p class="text-center text-xs text-gray-400 no-print">
          Ticket sent to <strong>{{ ticket.participant_email }}</strong>
        </p>
        <div class="text-center no-print">
          <button class="btn-green text-xs flex items-center gap-2 mx-auto" @click="window.print()">
            <Printer :size="14" /> Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Printer, Loader, XCircle, CheckCircle2, AlertTriangle, AlertCircle,
  MapPin, CalendarDays, Search, ArrowLeft,
} from 'lucide-vue-next';
import api from '@/composables/useApi.js';

const route      = useRoute();
const ticket     = ref(null);
const loading    = ref(true);
const loadingMsg = ref('Loading your ticket…');
const verifyError= ref('');
const manualRef  = ref('');
const manualError= ref('');
const checking   = ref(false);

const window = globalThis;  // makes window available in template
const hasBalance = computed(() => ticket.value && Number(ticket.value.balance_due) > 0);

onMounted(async () => {
  // Paystack sends both 'reference' and 'trxref' as query params after redirect
  const reference = route.query.reference || route.query.trxref || route.params.ref;

  if (!reference) {
    loading.value  = false;
    verifyError.value = 'No ticket reference found.';
    return;
  }

  try {
    // If it looks like a Paystack reference — run verify (updates DB + generates QR)
    const isPaystackRef = /^[A-Z0-9_-]{8,}$/i.test(reference) && !reference.includes('-25-');
    // Unique ticket numbers look like MYS3-25-000001, Paystack refs look like PAYSTACK_xxxxxx
    const endpoint = (route.query.reference || route.query.trxref)
      ? `/tickets/verify/${reference}`   // coming from Paystack redirect — always verify
      : `/tickets/${reference}`;         // direct link to ticket — just fetch

    loadingMsg.value = (route.query.reference || route.query.trxref)
      ? 'Confirming your payment…'
      : 'Loading your ticket…';

    const { data } = await api.get(endpoint);
    ticket.value = data.data?.ticket || data.data;
  } catch (err) {
    verifyError.value = err.response?.data?.message || 'Could not verify payment.';
  } finally {
    loading.value = false;
  }
});

const checkManual = async () => {
  if (!manualRef.value.trim()) return;
  manualError.value = '';
  checking.value    = true;
  try {
    // Try verify first (Paystack reference), then direct fetch (ticket number)
    let data;
    try {
      ({ data } = await api.get(`/tickets/verify/${manualRef.value.trim()}`));
    } catch {
      ({ data } = await api.get(`/tickets/${manualRef.value.trim()}`));
    }
    ticket.value     = data.data?.ticket || data.data;
    verifyError.value = '';
  } catch (err) {
    manualError.value = err.response?.data?.message || 'Reference not found. Check and try again.';
  } finally {
    checking.value = false;
  }
};

const fmtP       = (n) => Number(n||0).toLocaleString('en-NG');
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'}) : '';
</script>

<style>
@media print {
  .no-print, nav, header { display: none !important; }
  #ticket-print-area { padding: 0 !important; }
  body { background: white !important; }
}
</style>
