/**
 * useEvents — shared event loading with edition-prefixed display titles
 * Usage: const { events, loadEvents } = useEvents()
 */
import { ref } from 'vue';
import api from './useApi.js';

export const useEvents = () => {
  const events = ref([]);
  const loading = ref(false);

  const loadEvents = async () => {
    loading.value = true;
    try {
      const { data } = await api.get('/events');
      events.value = (data.data || []).map(e => ({
        ...e,
        // "[MYS3] Muslim Youth Summit 3.0"
        display_title: `[${e.edition}] ${e.title}`,
      }));
    } catch {
      events.value = [];
    } finally {
      loading.value = false;
    }
  };

  return { events, loading, loadEvents };
};
