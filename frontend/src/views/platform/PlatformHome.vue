<template>
  <div class="bg-[#04110b] text-white">
    <!-- ═══ HERO: 3D constellation ═══ -->
    <section class="relative min-h-screen overflow-hidden">
      <PlatformHero3D :nodes="tenants" @select-node="goTenant" ref="hero" />

      <div class="pointer-events-none absolute inset-0"
        style="background: radial-gradient(ellipse at center, transparent 30%, rgba(4,17,11,0.82) 100%)"></div>

      <!-- Top bar -->
      <header class="relative z-10 flex items-center justify-between px-6 py-5">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-brand-gold text-brand-green font-display font-bold text-sm">ٱ</span>
          <span class="font-display font-bold tracking-tight text-lg">The Platform</span>
        </div>
        <RouterLink to="/platform/login"
          class="text-sm text-white/55 hover:text-white transition-colors">
          Organisation sign-in →
        </RouterLink>
      </header>

      <!-- Hero copy -->
      <main class="relative z-10 flex flex-col items-center text-center px-4 mt-[7vh] sm:mt-[11vh]">
        <p class="text-brand-gold/85 text-xs uppercase tracking-[0.3em] mb-5 animate-fade-in">
          Bismillāh · one home for Islamic work
        </p>
        <h1 class="font-display font-black text-4xl sm:text-6xl leading-[1.02] max-w-3xl animate-rise">
          Where the work of the<br /><span class="text-brand-gold">ummah</span> is organised.
        </h1>
        <p class="text-white/65 max-w-xl mt-6 text-base sm:text-lg animate-rise" style="animation-delay:.1s">
          The Platform gives every Islamic organisation its own space to run
          programmes, manage their people, and serve their community — da'wah,
          education, conferences, camps, and more. Each space orbiting above is a
          real community at work.
        </p>

        <!-- Enter a space -->
        <div class="mt-9 w-full max-w-md animate-rise" style="animation-delay:.2s">
          <label class="sr-only" for="slug">Your organisation's address</label>
          <div class="flex items-stretch rounded-xl overflow-hidden ring-1 ring-white/15 backdrop-blur-md bg-white/5">
            <span class="shrink-0 px-3 flex items-center text-white/40 text-xs sm:text-sm font-mono border-r border-white/10 whitespace-nowrap">theplatform.ng/</span>
            <input id="slug" v-model="slug" @keyup.enter="go"
              class="flex-1 min-w-0 bg-transparent px-3 py-3.5 outline-none text-white font-mono placeholder-white/30"
              placeholder="your-org" />
            <button class="shrink-0 bg-brand-gold text-brand-green font-bold px-5 sm:px-6 whitespace-nowrap hover:brightness-110 transition" @click="go">
              Enter
            </button>
          </div>

          <div v-if="tenants.length" class="flex gap-2 flex-wrap justify-center mt-5">
            <button v-for="t in tenants" :key="t.slug"
              class="group flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition"
              @click="goTenant(t)">
              <span class="w-2 h-2 rounded-full" :style="{ background: t.color_secondary || '#FEC700' }"></span>
              <span class="text-white/80 group-hover:text-white">{{ t.name }}</span>
            </button>
          </div>
          <p v-else-if="!loading" class="text-white/30 text-xs mt-5">
            No organisations live yet — enter a name above to find a space.
          </p>
        </div>

        <a href="#mission" class="mt-12 text-white/30 hover:text-white/60 text-xs tracking-widest uppercase animate-fade-in transition-colors">
          What we do ↓
        </a>
      </main>
    </section>

    <!-- ═══ MISSION ═══ -->
    <section id="mission" class="bg-brand-cream text-brand-green py-20 sm:py-28 px-6">
      <div class="max-w-4xl mx-auto">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-brand-green/50 mb-4">Our intention</p>
        <h2 class="font-display font-bold text-3xl sm:text-5xl leading-tight max-w-3xl">
          Tools shouldn't be the hard part of serving the deen.
        </h2>
        <p class="mt-6 text-lg text-brand-green/75 max-w-2xl leading-relaxed">
          Across the ummah, dedicated people run summits, halaqahs, relief drives
          and schools — often held together by spreadsheets, group chats and late
          nights. The Platform carries that weight: registration, payments,
          attendance, certificates and communication, so the people doing the work
          can focus on the work itself, with iḥsān.
        </p>
      </div>
    </section>

    <!-- ═══ WHAT EACH SPACE INCLUDES ═══ -->
    <section class="bg-white text-brand-green py-20 sm:py-28 px-6">
      <div class="max-w-5xl mx-auto">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-brand-green/50 mb-4">In every space</p>
        <h2 class="font-display font-bold text-3xl sm:text-4xl mb-12">Everything an organisation needs to run a programme.</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-green/10 rounded-2xl overflow-hidden">
          <div v-for="f in features" :key="f.title" class="bg-white p-7">
            <component :is="f.icon" :size="26" class="text-brand-gold mb-4" :stroke-width="1.75" />
            <h3 class="font-display font-bold text-lg mb-1.5">{{ f.title }}</h3>
            <p class="text-sm text-brand-green/65 leading-relaxed">{{ f.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ WHO IT'S FOR ═══ -->
    <section class="bg-brand-green text-white py-20 sm:py-28 px-6">
      <div class="max-w-4xl mx-auto">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-brand-gold/70 mb-4">Who it's for</p>
        <h2 class="font-display font-bold text-3xl sm:text-4xl mb-10">Built for those who do the work.</h2>
        <div class="grid sm:grid-cols-2 gap-x-10 gap-y-6">
          <div v-for="w in audiences" :key="w" class="flex items-start gap-3 border-t border-white/15 pt-5">
            <span class="text-brand-gold mt-0.5">✦</span>
            <p class="text-white/80">{{ w }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CTA ═══ -->
    <section class="bg-brand-cream text-brand-green py-20 sm:py-28 px-6 text-center">
      <div class="max-w-2xl mx-auto">
        <h2 class="font-display font-bold text-3xl sm:text-5xl leading-tight">
          Bring your organisation's work home.
        </h2>
        <p class="mt-5 text-lg text-brand-green/70">
          Set up a branded space for your community — and let the tools serve the
          mission, not the other way around.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <RouterLink to="/platform/login"
            class="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-brand-green text-white font-bold hover:brightness-110 transition">
            Sign in to your space
          </RouterLink>
          <a href="#mission"
            class="inline-flex items-center justify-center px-7 py-3.5 rounded-xl ring-1 ring-brand-green/25 font-bold hover:bg-brand-green/5 transition">
            Learn more
          </a>
        </div>
        <p class="mt-6 text-sm text-brand-green/50">
          To open a new organisation's space, contact the platform administrator.
        </p>
      </div>
    </section>

    <!-- ═══ FOOTER ═══ -->
    <footer class="bg-[#04110b] text-white/40 py-10 px-6 text-center text-sm">
      <p class="font-display font-bold text-white mb-1">The Platform</p>
      <p>A home for Islamic work and the people who carry it.</p>
      <p class="mt-3 text-white/25 text-xs">© {{ new Date().getFullYear() }} The Platform. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  ClipboardList, CreditCard, QrCode, Award, Mail, Store,
} from 'lucide-vue-next';
import api from '@/composables/useApi.js';
import PlatformHero3D from '@/components/platform/PlatformHero3D.vue';

const router = useRouter();
const slug = ref('');
const tenants = ref([]);
const loading = ref(true);
const hero = ref(null);

const features = [
  { icon: ClipboardList, title: 'Registration', body: 'Open registration with multiple ticket types, early-bird pricing, and group sign-ups for families.' },
  { icon: CreditCard, title: 'Payments', body: 'Collect fees through your own Paystack account. Funds reach the organisation directly.' },
  { icon: QrCode, title: 'Check-in & tags', body: 'Print attendee tags with QR codes; check people in and out at the gate in seconds.' },
  { icon: Award, title: 'Certificates', body: 'Issue named certificates of attendance or completion, ready to download and share.' },
  { icon: Mail, title: 'Communication', body: 'Reach attendees by email and SMS — reminders, schedules and announcements.' },
  { icon: Store, title: 'Souvenir shop', body: 'Sell branded merchandise and manage orders alongside the programme.' },
];

const audiences = [
  'Da\'wah organisations running outreach and public programmes',
  'Islamic schools, academies and tuition centres',
  'Conference and summit organisers serving Muslim youth',
  'Camps, retreats and tarbiyyah programmes',
  'Masjid committees coordinating community events',
  'Relief and welfare initiatives managing volunteers',
];

const go = () => { const s = slug.value.trim().toLowerCase(); if (s) router.push(`/${s}`); };
const goTenant = (t) => { if (t?.slug) router.push(`/${t.slug}`); };

onMounted(async () => {
  try {
    const { data } = await api.get('/tenants');
    tenants.value = data.data || [];
    await nextTick();
    hero.value?.rebuild?.();
  } catch {
    tenants.value = [];
  } finally { loading.value = false; }
});
</script>

<style scoped>
@keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
.animate-rise { animation: rise .8s cubic-bezier(.16,1,.3,1) both; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fade-in 1.2s ease both; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  .animate-rise, .animate-fade-in { animation: none; }
  html { scroll-behavior: auto; }
}
</style>
