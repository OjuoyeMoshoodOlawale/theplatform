<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
      <h1 class="font-display font-bold text-lg">Platform Admin</h1>
      <button class="text-sm text-gray-400 hover:text-white" @click="logout">Sign out</button>
    </header>

    <div class="max-w-5xl mx-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="font-display font-bold text-2xl text-gray-800">Organisations</h2>
          <p class="text-sm text-gray-400">{{ tenants.length }} tenant{{ tenants.length===1?'':'s' }} on the platform</p>
        </div>
        <button class="btn-green text-sm" @click="showCreate = true">+ New Organisation</button>
      </div>

      <div v-if="loading" class="text-center py-12 text-gray-400">Loading…</div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="t in tenants" :key="t.id"
          class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-display font-bold text-lg text-gray-800">{{ t.name }}</p>
              <a :href="`/${t.slug}`" target="_blank" class="text-xs text-brand-green font-mono">/{{ t.slug }}</a>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
              :class="{
                'bg-green-100 text-green-700': t.status==='active',
                'bg-amber-100 text-amber-700': t.status==='trial',
                'bg-red-100 text-red-700':     t.status==='suspended',
              }">{{ t.status }}</span>
          </div>
          <div class="flex gap-4 mt-4 text-sm text-gray-500">
            <span>{{ t.event_count }} events</span>
            <span>{{ t.admin_count }} admins</span>
          </div>
          <div class="flex gap-2 mt-4">
            <button v-if="t.status!=='suspended'" class="text-xs text-red-500 underline"
              @click="setStatus(t,'suspended')">Suspend</button>
            <button v-else class="text-xs text-green-600 underline"
              @click="setStatus(t,'active')">Activate</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="showCreate=false">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="font-display font-bold text-xl mb-4">New Organisation</h3>
        <form @submit.prevent="create" class="space-y-3">
          <div><label class="label">Organisation name *</label><input v-model="form.name" class="input" placeholder="Islamic Camping Programs" /></div>
          <div><label class="label">URL slug *</label>
            <div class="flex"><span class="px-3 py-2 bg-gray-100 text-gray-400 text-sm rounded-l">/</span>
              <input v-model="form.slug" class="input rounded-l-none" placeholder="icp" /></div>
          </div>
          <div><label class="label">Tagline</label><input v-model="form.tagline" class="input" /></div>
          <div class="grid grid-cols-2 gap-2">
            <div><label class="label">Primary colour</label><input v-model="form.color_primary" type="color" class="input h-10 p-1" /></div>
            <div><label class="label">Accent colour</label><input v-model="form.color_secondary" type="color" class="input h-10 p-1" /></div>
          </div>
          <hr class="my-2" />
          <p class="text-sm font-semibold text-gray-700">First admin account</p>
          <div><label class="label">Admin name</label><input v-model="form.admin_name" class="input" /></div>
          <div><label class="label">Admin email *</label><input v-model="form.admin_email" type="email" class="input" /></div>
          <div><label class="label">Admin password *</label><input v-model="form.admin_password" type="password" class="input" placeholder="Min 8 chars" /></div>
          <p v-if="cErr" class="text-sm text-red-600">{{ cErr }}</p>
          <div class="flex gap-2 pt-2">
            <button type="submit" :disabled="creating" class="btn-green text-sm">{{ creating ? 'Creating…' : 'Create' }}</button>
            <button type="button" class="btn-ghost text-sm" @click="showCreate=false">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/composables/useApi.js';

const router = useRouter();
const tenants = ref([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const cErr = ref('');
const form = reactive({
  name:'', slug:'', tagline:'',
  color_primary:'#02462E', color_secondary:'#FEC700',
  admin_name:'', admin_email:'', admin_password:'',
});

const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('mys_platform_token')}` } });

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/platform/tenants', authHeader());
    tenants.value = data.data || [];
  } catch (e) {
    if (e.response?.status === 401) router.push('/platform/login');
  } finally { loading.value = false; }
};

const create = async () => {
  creating.value = true; cErr.value = '';
  try {
    await api.post('/platform/tenants', { ...form }, authHeader());
    showCreate.value = false;
    Object.assign(form, { name:'', slug:'', tagline:'', admin_name:'', admin_email:'', admin_password:'' });
    load();
  } catch (e) {
    cErr.value = e.response?.data?.message || 'Failed to create.';
  } finally { creating.value = false; }
};

const setStatus = async (t, status) => {
  try {
    await api.patch(`/platform/tenants/${t.id}/status`, { status }, authHeader());
    load();
  } catch {}
};

const logout = () => {
  localStorage.removeItem('mys_platform_token');
  localStorage.removeItem('mys_platform_admin');
  router.push('/platform/login');
};

onMounted(load);
</script>
