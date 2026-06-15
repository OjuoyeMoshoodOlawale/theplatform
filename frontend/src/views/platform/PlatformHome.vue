<template>
  <div class="relative min-h-screen overflow-hidden bg-[#04110b] text-white">
    <!-- 3D scene fills the background -->
    <PlatformHero3D :nodes="tenants" @select-node="goTenant" ref="hero" />

    <!-- Radial vignette so text stays legible over the 3D -->
    <div class="pointer-events-none absolute inset-0"
      style="background: radial-gradient(ellipse at center, transparent 35%, rgba(4,17,11,0.75) 100%)"></div>

    <!-- Top bar -->
    <header class="relative z-10 flex items-center justify-between px-6 py-5">
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full bg-brand-gold animate-pulse"></div>
        <span class="font-display font-bold tracking-tight">EventSphere</span>
      </div>
      <RouterLink to="/platform/login"
        class="text-sm text-white/50 hover:text-white transition-colors">
        Platform admin →
      </RouterLink>
    </header>

    <!-- Hero copy + entry -->
    <main class="relative z-10 flex flex-col items-center text-center px-4 mt-[8vh] sm:mt-[12vh]">
      <p class="text-brand-gold/80 text-xs uppercase tracking-[0.3em] mb-5 animate-fade-in">
        One platform · many spaces
      </p>
      <h1 class="font-display font-black text-5xl sm:text-7xl leading-[0.95] max-w-3xl animate-rise">
        Every event its<br />own <span class="text-brand-gold">universe</span>.
      </h1>
      <p class="text-white/60 max-w-md mt-6 text-base sm:text-lg animate-rise" style="animation-delay:.1s">
        Each organisation runs a fully branded space — registration, check-in, tags,
        certificates and shop. Orbiting above is every live space on the platform.
      </p>

      <!-- Enter a space -->
      <div class="mt-9 w-full max-w-md animate-rise" style="animation-delay:.2s">
        <div class="flex items-stretch rounded-xl overflow-hidden ring-1 ring-white/15 backdrop-blur-md bg-white/5">
          <span class="px-3.5 flex items-center text-white/40 text-sm font-mono border-r border-white/10">eventsphere.com/</span>
          <input v-model="slug" @keyup.enter="go"
            class="flex-1 bg-transparent px-3 py-3.5 outline-none text-white font-mono placeholder-white/30"
            placeholder="your-space" />
          <button class="bg-brand-gold text-brand-green font-bold px-6 hover:brightness-110 transition" @click="go">
            Enter
          </button>
        </div>

        <!-- Live spaces -->
        <div v-if="tenants.length" class="flex gap-2 flex-wrap justify-center mt-5">
          <button v-for="t in tenants" :key="t.slug"
            class="group flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition"
            @click="goTenant(t)">
            <span class="w-2 h-2 rounded-full" :style="{ background: t.color_secondary || '#FEC700' }"></span>
            <span class="text-white/80 group-hover:text-white">{{ t.name }}</span>
          </button>
        </div>
        <p v-else-if="!loading" class="text-white/30 text-xs mt-5">No live spaces yet — type a slug above.</p>
      </div>
    </main>

    <!-- Footer hint -->
    <footer class="absolute bottom-5 left-0 right-0 z-10 text-center text-white/25 text-xs">
      Drag your cursor to look around · click a glowing node to enter
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/composables/useApi.js';
import PlatformHero3D from '@/components/platform/PlatformHero3D.vue';

const router = useRouter();
const slug = ref('');
const tenants = ref([]);
const loading = ref(true);
const hero = ref(null);

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
@media (prefers-reduced-motion: reduce) {
  .animate-rise, .animate-fade-in { animation: none; }
}
</style>
