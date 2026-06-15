<template>
  <div class="min-h-screen bg-brand-cream">
    <!-- Nav -->
    <nav class="bg-brand-green text-white px-4 md:px-6 py-4 flex items-center justify-between">
      <RouterLink to="/"><img src="/logos/logo-white.png" alt="MYS" class="h-9" /></RouterLink>
      <RouterLink to="/" class="text-white/60 text-sm hover:text-white flex items-center gap-1.5">
        <ArrowLeft :size="14" /> Home
      </RouterLink>
    </nav>

    <div class="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-14">
      <!-- Lookup form -->
      <div v-if="!certificate" class="bg-white border border-gray-100 p-6 md:p-8">
        <div class="text-center mb-6">
          <Award :size="48" class="mx-auto mb-3 text-brand-gold" />
          <h1 class="font-display font-bold text-2xl text-brand-green">Certificate of Attendance</h1>
          <p class="text-gray-500 text-sm mt-2">
            Enter your ticket number or tag number to view and download your certificate.
          </p>
        </div>

        <div class="space-y-3 max-w-md mx-auto">
          <input v-model="lookupInput"
            class="input text-center font-mono"
            placeholder="MYS3-25-000001 or TAG-001"
            @keydown.enter="findCertificate" />
          <button class="btn-green w-full justify-center py-3" :disabled="busy || !lookupInput" @click="findCertificate">
            <component :is="busy ? Loader : Search" :size="16" :class="busy?'animate-spin':''" />
            {{ busy ? 'Searching…' : 'Find My Certificate' }}
          </button>
          <p v-if="errorMsg" class="text-red-500 text-sm text-center flex items-center justify-center gap-1.5">
            <AlertCircle :size="14" /> {{ errorMsg }}
          </p>
        </div>
      </div>

      <!-- Certificate display -->
      <div v-else>
        <div v-if="certificate.preview"
          class="bg-amber-50 border border-amber-300 text-amber-800 text-sm px-4 py-2.5 mb-4 flex items-center gap-2 no-print">
          <AlertCircle :size="15" />
          Admin preview — this event hasn't concluded yet. Participants can't access this until it's completed.
        </div>
        <div id="certificate" class="bg-white shadow-2xl border-8 border-brand-green relative overflow-hidden mx-auto"
          style="aspect-ratio: 1.414/1; max-width: 297mm;">
          <!-- Decorative corners -->
          <div class="absolute top-0 left-0 w-10 h-10 sm:w-24 sm:h-24 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-brand-gold m-2 sm:m-4"></div>
          <div class="absolute top-0 right-0 w-10 h-10 sm:w-24 sm:h-24 border-t-2 sm:border-t-4 border-r-2 sm:border-r-4 border-brand-gold m-2 sm:m-4"></div>
          <div class="absolute bottom-0 left-0 w-10 h-10 sm:w-24 sm:h-24 border-b-2 sm:border-b-4 border-l-2 sm:border-l-4 border-brand-gold m-2 sm:m-4"></div>
          <div class="absolute bottom-0 right-0 w-10 h-10 sm:w-24 sm:h-24 border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-brand-gold m-2 sm:m-4"></div>

          <div class="h-full flex flex-col items-center justify-center text-center px-4 sm:px-8 md:px-16 py-4 sm:py-10">
            <img src="/logos/logo-black.png" alt="MYS" class="h-8 sm:h-12 md:h-16 mb-2 sm:mb-4" />
            <p class="text-brand-gold font-bold text-xs md:text-sm uppercase tracking-[0.3em] mb-2">
              Certificate of Attendance
            </p>
            <div class="w-16 h-0.5 bg-brand-gold mb-6"></div>

            <p class="text-gray-500 text-sm mb-2">This certifies that</p>
            <h2 class="font-display font-bold text-xl sm:text-3xl md:text-4xl text-brand-green mb-2 sm:mb-4">
              {{ certificate.participant_name }}
            </h2>
            <p class="text-gray-600 text-sm md:text-base max-w-lg leading-relaxed mb-6">
              attended and participated in <strong>{{ certificate.event_title }}</strong>
              held on {{ formatDate(certificate.event_start_date) }}
              at {{ certificate.event_venue }}.
            </p>

            <div class="flex items-center gap-8 mt-4">
              <div class="text-center">
                <div class="w-32 h-px bg-gray-300 mb-1"></div>
                <p class="text-xs text-gray-400">Organising Committee</p>
              </div>
              <div class="text-center">
                <p class="font-mono text-xs text-gray-400">{{ certificate.unique_number }}</p>
                <p class="text-xs text-gray-400">Reference</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6 justify-center no-print">
          <button class="btn-green flex items-center gap-2" @click="printCert">
            <Printer :size="16" /> Print / Download PDF
          </button>
          <button class="btn-outline" @click="certificate=null; lookupInput=''">
            Look up another
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { Award, Search, Loader, AlertCircle, Printer, ArrowLeft } from 'lucide-vue-next';
import api from '@/composables/useApi.js';

const route       = useRoute();
const lookupInput = ref(route.params.ref || '');
const certificate = ref(null);
const busy        = ref(false);
const errorMsg    = ref('');

const findCertificate = async () => {
  const val = lookupInput.value.trim().toUpperCase();
  if (!val) return;
  busy.value = true; errorMsg.value = '';
  try {
    // Pass the admin token (from URL ?token= or localStorage) so admins can
    // preview before the event concludes, even in a freshly opened tab.
    const token = route.query.token || localStorage.getItem('mys_token') || '';
    const url = token
      ? `/tickets/certificate/${encodeURIComponent(val)}?token=${encodeURIComponent(token)}`
      : `/tickets/certificate/${encodeURIComponent(val)}`;
    const { data } = await api.get(url);
    certificate.value = data.data;
  } catch (err) {
    errorMsg.value = err.response?.data?.message
      || 'No certificate found. Make sure the event is completed and your number is correct.';
  } finally { busy.value = false; }
};

// Auto-lookup if ref is in URL
if (lookupInput.value) findCertificate();

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'}) : '';
const printCert  = () => window.print();
</script>

<style>
@media print {
  @page { size: A4 landscape; margin: 0; }
  .no-print, nav { display: none !important; }
  #certificate {
    box-shadow: none !important;
    width: 100% !important;
    max-width: none !important;
    height: 100vh !important;
    aspect-ratio: auto !important;
    border-width: 8px !important;
  }
  body { background: white !important; }
}
</style>
