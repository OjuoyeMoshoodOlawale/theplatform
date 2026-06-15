<template>
  <div class="bg-white border border-gray-100 overflow-hidden">
    <!-- Search / toolbar slot -->
    <div v-if="$slots.toolbar" class="px-5 py-3 border-b border-gray-100 bg-gray-50">
      <slot name="toolbar" />
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/70">
            <th v-for="col in columns" :key="col.key"
              class="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap"
              :class="col.class">
              {{ col.label }}
            </th>
            <th v-if="$slots.actions" class="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- loading -->
          <tr v-if="loading">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-5 py-12 text-center">
              <div class="flex items-center justify-center gap-2 text-gray-400">
                <div class="w-5 h-5 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin"></div>
                <span class="text-sm">Loading…</span>
              </div>
            </td>
          </tr>
          <!-- empty -->
          <tr v-else-if="!rows.length">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-5 py-12 text-center">
              <p class="text-gray-400 text-sm">{{ emptyMessage }}</p>
            </td>
          </tr>
          <!-- rows -->
          <tr v-else v-for="(row, i) in rows" :key="row.id ?? i"
            class="border-b border-gray-50 hover:bg-brand-cream/40 transition-colors">
            <td v-for="col in columns" :key="col.key"
              class="px-5 py-3.5 text-gray-700" :class="col.tdClass">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] ?? '—' }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="px-5 py-3.5 text-right whitespace-nowrap">
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 text-sm">
      <p class="text-gray-500">
        Showing <span class="font-semibold text-gray-700">{{ pagination.from }}–{{ pagination.to }}</span>
        of <span class="font-semibold text-gray-700">{{ pagination.total }}</span>
      </p>
      <div class="flex gap-2">
        <button :disabled="pagination.page <= 1"
          class="px-3 py-1 border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
          @click="$emit('page', pagination.page - 1)">‹</button>
        <button :disabled="pagination.page >= pagination.pages"
          class="px-3 py-1 border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-white transition-colors"
          @click="$emit('page', pagination.page + 1)">›</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  columns:      { type: Array,   required: true },
  rows:         { type: Array,   default: () => [] },
  loading:      { type: Boolean, default: false },
  pagination:   { type: Object,  default: null },
  emptyMessage: { type: String,  default: 'No records found.' },
});
defineEmits(['page']);
</script>
