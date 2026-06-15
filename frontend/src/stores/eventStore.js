import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/composables/useApi.js';

export const useEventStore = defineStore('event', () => {
  const activeEvent    = ref(null);
  const pastEvents     = ref([]);
  const speakers       = ref([]);
  const ticketTypes    = ref([]);
  const loadingActive  = ref(false);
  const loadingPast    = ref(false);

  const hasActiveEvent = computed(() => !!activeEvent.value);
  // True when we're showing a completed event as a fallback (no live event)
  const isPastEvent    = computed(() => !!activeEvent.value?.is_past);
  // Registration only open for a genuinely active (not past) event
  const isRegistrationOpen = computed(() => !!activeEvent.value && !activeEvent.value.is_past);

  /* ─── Public fetch: active event ──────────────────────── */
  const fetchActiveEvent = async () => {
    loadingActive.value = true;
    try {
      const { data } = await api.get('/events/active');
      activeEvent.value = data.data || null;
      if (activeEvent.value) {
        await Promise.all([
          fetchTicketTypes(activeEvent.value.id),
          fetchSpeakers(activeEvent.value.id),
        ]);
      }
    } catch {
      activeEvent.value = null;
    } finally {
      loadingActive.value = false;
    }
  };

  const fetchTicketTypes = async (eventId) => {
    try {
      const { data } = await api.get(`/events/${eventId}/ticket-types`);
      ticketTypes.value = data.data || [];
    } catch {
      ticketTypes.value = [];
    }
  };

  const fetchSpeakers = async (eventId) => {
    try {
      const { data } = await api.get(`/events/${eventId}/speakers`);
      speakers.value = data.data || [];
    } catch {
      speakers.value = [];
    }
  };

  /* ─── Public fetch: past events ───────────────────────── */
  const fetchPastEvents = async () => {
    loadingPast.value = true;
    try {
      const { data } = await api.get('/events/past');
      pastEvents.value = data.data || [];
    } catch {
      pastEvents.value = [];
    } finally {
      loadingPast.value = false;
    }
  };

  return {
    activeEvent,
    pastEvents,
    speakers,
    ticketTypes,
    loadingActive,
    loadingPast,
    hasActiveEvent,
    isPastEvent,
    isRegistrationOpen,
    fetchActiveEvent,
    fetchPastEvents,
    fetchTicketTypes,
    fetchSpeakers,
  };
});
