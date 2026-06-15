<template>
  <div class="min-h-screen bg-brand-cream">
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div v-if="loading" class="text-center py-12 text-brand-green/50">Loading…</div>
      <div v-else-if="error" class="text-center py-12">
        <p class="font-display font-bold text-2xl text-gray-800">Page Not Found</p>
        <p class="text-gray-500 mt-2">{{ error }}</p>
        <RouterLink :to="`/${slug}`" class="btn-green text-sm mt-4 inline-flex">Back home</RouterLink>
      </div>
      <article v-else class="bg-white rounded-2xl shadow-sm p-8 sm:p-10">
        <h1 class="font-display font-bold text-3xl text-brand-green mb-6">{{ page.title }}</h1>
        <div class="prose max-w-none text-gray-700" v-html="page.body_html"></div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/composables/useApi.js';

const route = useRoute();
const slug = route.params.slug;
const page = ref(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const { data } = await api.get(`/tenants/${slug}/pages/${route.params.pageSlug}`);
    page.value = data.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'This page does not exist.';
  } finally { loading.value = false; }
});
</script>
