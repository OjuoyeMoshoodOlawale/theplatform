<template>
  <div class="min-h-screen bg-brand-cream">
    <!-- Navbar -->
    <nav class="bg-brand-green text-white px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <RouterLink to="/"><img src="/logos/logo-white.png" alt="MYS" class="h-9" /></RouterLink>
      <RouterLink to="/" class="text-white/60 text-sm hover:text-white transition-colors flex items-center gap-1.5">
        <ArrowLeft :size="14" /> Home
      </RouterLink>
    </nav>

    <!-- Hero -->
    <div class="bg-brand-green geometric-bg py-12 md:py-16 text-white text-center px-4">
      <p class="text-brand-gold font-bold text-xs uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
        <History :size="13" /> History
      </p>
      <h1 class="font-display font-bold text-3xl md:text-5xl">Past Editions</h1>
      <p class="text-white/60 mt-3 text-base md:text-lg">A journey through our annual summits</p>
    </div>

    <!-- Events -->
    <div class="max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-16">
      <div v-if="loading" class="flex justify-center py-20">
        <Loader :size="36" class="animate-spin text-brand-green/40" />
      </div>

      <div v-else-if="events.length" class="space-y-12 md:space-y-20">
        <article v-for="evt in events" :key="evt.id" :id="evt.edition">
          <!-- Edition header -->
          <div class="border-l-4 border-brand-gold pl-4 md:pl-6 mb-6 md:mb-8">
            <div class="flex items-start justify-between flex-wrap gap-4">
              <div>
                <span class="badge-gold text-xs mb-2 inline-flex">{{ evt.edition }}</span>
                <h2 class="font-display font-bold text-2xl md:text-3xl text-brand-green mt-1">{{ evt.title }}</h2>
                <div class="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                  <span class="flex items-center gap-1.5"><CalendarDays :size="13" />
                    {{ formatDateRange(evt.start_date, evt.end_date) }}
                  </span>
                  <span v-if="evt.venue" class="flex items-center gap-1.5"><MapPin :size="13" />
                    {{ evt.venue }}
                  </span>
                  <span v-if="evt.total_participants" class="flex items-center gap-1.5"><Users :size="13" />
                    {{ evt.total_participants }} attendees
                  </span>
                </div>
              </div>
              <span class="badge bg-blue-100 text-blue-700 text-xs">{{ evt.status }}</span>
            </div>
          </div>

          <!-- Description -->
          <p v-if="evt.tagline || evt.description" class="text-gray-600 leading-relaxed mb-6 text-sm md:text-base">
            {{ evt.tagline || evt.description?.slice(0, 300) }}
          </p>

          <!-- Gallery -->
          <div v-if="evt.gallery?.length" class="mb-8">
            <h3 class="font-display font-bold text-brand-green text-lg mb-4 flex items-center gap-2">
              <Images :size="16" /> Gallery
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              <div v-for="(img, i) in evt.gallery.slice(0, showAllGallery[evt.id] ? 99 : 6)"
                :key="img.id"
                class="aspect-video bg-gray-100 overflow-hidden group cursor-pointer"
                @click="openLightbox(evt.gallery, i)">
                <img :src="img.image_url" :alt="img.caption || evt.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
            </div>
            <button v-if="evt.gallery.length > 6 && !showAllGallery[evt.id]"
              class="mt-3 text-brand-green text-sm font-semibold hover:underline flex items-center gap-1"
              @click="showAllGallery[evt.id] = true">
              View all {{ evt.gallery.length }} photos <ChevronDown :size="14" />
            </button>
          </div>

          <!-- Schedule/Programme -->
          <div v-if="evt.lectures?.length" class="mb-8">
            <h3 class="font-display font-bold text-brand-green text-lg mb-4 flex items-center gap-2">
              <LayoutList :size="16" /> Programme
            </h3>
            <!-- Day tabs if multi-day -->
            <div v-if="evt.days?.length > 1" class="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button v-for="d in evt.days" :key="d.id"
                class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold border-2 transition-all"
                :class="(selectedDay[evt.id] ?? evt.days[0]?.id) === d.id
                  ? 'border-brand-green bg-brand-green text-white'
                  : 'border-gray-200 text-gray-500 hover:border-brand-green'"
                @click="selectedDay[evt.id] = d.id">
                Day {{ d.day_number }} <span class="opacity-60 ml-1">{{ fmtShort(d.event_date) }}</span>
              </button>
            </div>
            <div class="bg-white border border-gray-100 overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th class="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-8">S/N</th>
                    <th class="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-24">Time</th>
                    <th class="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Session</th>
                    <th class="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400 hidden md:table-cell">Speaker</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(l, i) in lecturesForDay(evt, selectedDay[evt.id] ?? evt.days?.[0]?.id)"
                    :key="l.id" class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="px-3 py-2.5 font-mono text-xs text-brand-gold font-bold text-center">{{ l.s_n || i+1 }}</td>
                    <td class="px-3 py-2.5 text-xs text-brand-green font-semibold whitespace-nowrap">{{ l.start_time || '—' }}</td>
                    <td class="px-3 py-2.5">
                      <p class="font-semibold text-gray-800 text-sm">{{ l.title }}</p>
                    </td>
                    <td class="px-3 py-2.5 text-gray-500 text-xs hidden md:table-cell">{{ l.main_speaker_name || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Speakers -->
          <div v-if="evt.speakers?.length" class="mb-6">
            <h3 class="font-display font-bold text-brand-green text-lg mb-4 flex items-center gap-2">
              <Mic :size="16" /> Speakers
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="s in evt.speakers" :key="s.id"
                class="bg-white border border-gray-100 p-3 flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center flex-shrink-0">
                  <img v-if="s.photo_url" :src="s.photo_url" :alt="s.name"
                    class="w-full h-full rounded-full object-cover" />
                  <span v-else class="font-bold text-brand-green text-sm">{{ s.name?.[0] }}</span>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-xs text-brand-green truncate">{{ s.name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ s.title }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-4 mt-4">
            <RouterLink v-if="eventStore.hasActiveEvent" to="/register"
              class="btn-gold text-xs inline-flex items-center gap-2">
              <Ticket :size="13" /> Register for Upcoming Event
            </RouterLink>
          </div>
        </article>
      </div>

      <div v-else class="text-center py-16 text-gray-300">
        <History :size="48" class="mx-auto mb-4 opacity-40" />
        <p class="text-sm">No completed events yet.</p>
      </div>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
        @click.self="lightbox.open=false">
        <button class="absolute top-4 right-4 text-white/60 hover:text-white" @click="lightbox.open=false">
          <X :size="28" />
        </button>
        <button class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          @click="lightbox.idx = (lightbox.idx - 1 + lightbox.images.length) % lightbox.images.length">
          <ChevronLeft :size="36" />
        </button>
        <img :src="lightbox.images[lightbox.idx]?.image_url" class="max-w-full max-h-[90vh] object-contain" />
        <button class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          @click="lightbox.idx = (lightbox.idx + 1) % lightbox.images.length">
          <ChevronRight :size="36" />
        </button>
        <p v-if="lightbox.images[lightbox.idx]?.caption"
          class="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          {{ lightbox.images[lightbox.idx].caption }}
        </p>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import {
  ArrowLeft, History, CalendarDays, MapPin, Users, Images, LayoutList, Mic,
  Ticket, Loader, ChevronDown, ChevronLeft, ChevronRight, X,
} from 'lucide-vue-next';
import { useEventStore } from '@/stores/eventStore.js';
import api from '@/composables/useApi.js';

const eventStore  = useEventStore();
const events      = ref([]);
const loading     = ref(true);
const showAllGallery = reactive({});
const selectedDay    = reactive({});
const lightbox = reactive({ open: false, images: [], idx: 0 });

onMounted(async () => {
  loading.value = true;
  try {
    // Fetch past events with their gallery, lectures, speakers
    const { data } = await api.get('/events/past?include=gallery,lectures,speakers');
    events.value = data.data || [];

    // Scroll to anchor if URL has hash (e.g. /past-events#MYS2)
    if (window.location.hash) {
      setTimeout(() => {
        const el = document.querySelector(window.location.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  } catch { events.value = []; }
  finally { loading.value = false; }

  await eventStore.fetchActiveEvent();
});

const lecturesForDay = (evt, dayId) => {
  if (!dayId || !evt.days?.length) return evt.lectures || [];
  return (evt.lectures || []).filter(l => l.event_day_id === dayId);
};

const openLightbox = (images, idx) => {
  lightbox.images = images; lightbox.idx = idx; lightbox.open = true;
};

const formatDateRange = (start, end) => {
  if (!start) return '';
  const s = new Date(start), e = end ? new Date(end) : null;
  const opts = { day:'numeric', month:'long', year:'numeric' };
  if (!e) return s.toLocaleDateString('en-NG', opts);
  return `${s.toLocaleDateString('en-NG',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('en-NG', opts)}`;
};
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-NG',{month:'short',day:'numeric'}) : '';
</script>
