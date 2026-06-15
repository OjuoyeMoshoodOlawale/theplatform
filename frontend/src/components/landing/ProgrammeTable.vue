<template>
  <div class="overflow-hidden border border-gray-100">
    <!-- Day tabs -->
    <div v-if="dayGroups.length > 1"
      class="flex overflow-x-auto bg-gray-50 border-b border-gray-100">
      <button
        class="px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 flex-shrink-0"
        :class="activeDay === 'all'
          ? 'border-brand-green text-brand-green bg-white'
          : 'border-transparent text-gray-500 hover:text-brand-green'"
        @click="activeDay = 'all'">All Days</button>
      <button v-for="g in dayGroups" :key="g.day"
        class="px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 flex-shrink-0"
        :class="activeDay === g.day
          ? 'border-brand-green text-brand-green bg-white'
          : 'border-transparent text-gray-500 hover:text-brand-green'"
        @click="activeDay = g.day">
        {{ g.day ?? 'General' }}
        <span v-if="g.date" class="font-normal normal-case ml-1 text-gray-400">— {{ g.date }}</span>
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-brand-green text-white">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider w-10 text-white/70">S/N</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Day / Time</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Lecture / Session</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Lecturer</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Facilitators</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(g, gi) in visibleGroups" :key="g.day">
            <!-- Day separator row (only in 'all' view) -->
            <tr v-if="activeDay === 'all' && dayGroups.length > 1" class="bg-brand-cream">
              <td colspan="5" class="px-4 py-2">
                <span class="font-display font-bold text-xs text-brand-green uppercase tracking-widest">
                  {{ g.day ?? 'General Sessions' }}
                  <span v-if="g.date" class="font-normal normal-case text-gray-500 ml-2">{{ g.date }}</span>
                </span>
                <span v-if="g.theme" class="ml-3 text-xs text-brand-gold font-semibold italic">{{ g.theme }}</span>
              </td>
            </tr>
            <tr v-for="(row, ri) in g.rows" :key="row.id"
              class="border-b border-gray-50 hover:bg-brand-cream/40 transition-colors">
              <td class="px-4 py-3 font-mono font-bold text-brand-gold text-center">{{ row.s_n || (ri+1) }}</td>
              <td class="px-4 py-3">
                <p class="font-semibold text-brand-green">
                  <span v-if="row.start_time">{{ row.start_time }}</span>
                  <span v-if="row.start_time && row.end_time" class="text-gray-400"> – </span>
                  <span v-if="row.end_time">{{ row.end_time }}</span>
                  <span v-if="!row.start_time" class="text-gray-300 text-xs">TBA</span>
                </p>
              </td>
              <td class="px-4 py-3">
                <p class="font-semibold text-gray-800">{{ row.title }}</p>
                <span v-if="row.lecture_type !== 'lecture'"
                  class="text-xs bg-brand-cream text-brand-green px-2 py-0.5 font-semibold uppercase tracking-wide mt-0.5 inline-block">
                  {{ row.lecture_type }}
                </span>
              </td>
              <td class="px-4 py-3 font-medium text-gray-700">
                {{ row.main_speaker_name || row.speaker_names?.split('||')[0] || '—' }}
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs leading-relaxed hidden md:table-cell">
                {{ row.facilitators || '—' }}
              </td>
            </tr>
          </template>

          <tr v-if="!schedule.length">
            <td colspan="5" class="px-4 py-10 text-center text-gray-300 text-sm">
              Schedule will be announced soon.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  schedule: { type: Array, default: () => [] },
  days:     { type: Array, default: () => [] },
});

const activeDay = ref('all');

// Group rows by day
const dayGroups = computed(() => {
  const map = {};
  props.schedule.forEach(row => {
    const key = row.day_number ?? 'general';
    if (!map[key]) {
      map[key] = {
        day:   row.day_number ? `Day ${row.day_number}` : null,
        date:  row.event_date ? new Date(row.event_date).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'}) : null,
        theme: row.day_theme,
        rows:  [],
      };
    }
    map[key].rows.push(row);
  });
  return Object.values(map);
});

const visibleGroups = computed(() => {
  if (activeDay.value === 'all') return dayGroups.value;
  return dayGroups.value.filter(g => (g.day || 'general') === activeDay.value);
});
</script>
