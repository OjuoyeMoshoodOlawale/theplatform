<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h2 class="font-display font-bold text-xl text-brand-green">Organisation Branding</h2>
      <p class="text-sm text-gray-400">Customise how your space looks at /{{ slug }}</p>
    </div>

    <!-- Branding -->
    <section class="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3">Identity</h3>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="label">Organisation name</label><input v-model="f.name" class="input" /></div>
        <div><label class="label">Tagline</label><input v-model="f.tagline" class="input" /></div>
      </div>
      <div><label class="label">Description</label><textarea v-model="f.description" rows="2" class="input"></textarea></div>
      <div><label class="label">Logo URL</label><input v-model="f.logo_url" class="input" placeholder="https://…/logo.png" /></div>
    </section>

    <!-- Colours -->
    <section class="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3">Colours</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><label class="label">Primary</label><input v-model="f.color_primary" type="color" class="input h-11 p-1 w-full" /></div>
        <div><label class="label">Secondary</label><input v-model="f.color_secondary" type="color" class="input h-11 p-1 w-full" /></div>
        <div><label class="label">Accent</label><input v-model="f.color_accent" type="color" class="input h-11 p-1 w-full" /></div>
        <div><label class="label">Background</label><input v-model="f.color_bg" type="color" class="input h-11 p-1 w-full" /></div>
      </div>
      <div class="flex gap-2 items-center pt-2">
        <span class="text-sm text-gray-400">Preview:</span>
        <div class="flex-1 h-10 rounded-lg flex items-center px-4 font-semibold text-sm"
          :style="{ background: f.color_primary, color: f.color_secondary }">
          {{ f.name || 'Your Organisation' }}
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section class="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3">Contact & Social</h3>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="label">Contact email</label><input v-model="f.contact_email" class="input" /></div>
        <div><label class="label">Contact phone</label><input v-model="f.contact_phone" class="input" /></div>
        <div><label class="label">Website</label><input v-model="f.website_url" class="input" /></div>
        <div><label class="label">Instagram</label><input v-model="f.social_instagram" class="input" /></div>
        <div><label class="label">Twitter / X</label><input v-model="f.social_twitter" class="input" /></div>
        <div><label class="label">Facebook</label><input v-model="f.social_facebook" class="input" /></div>
      </div>
    </section>

    <!-- Payment -->
    <section class="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3">Payment (Paystack)</h3>
      <p class="text-sm text-gray-400">Set your own Paystack keys to collect payments into your account. Leave blank to use the platform default.</p>
      <div><label class="label">Public key</label><input v-model="f.paystack_public_key" class="input" placeholder="pk_live_… or pk_test_…" /></div>
      <div><label class="label">Secret key</label><input v-model="f.paystack_secret_key" type="password" class="input" placeholder="sk_live_… or sk_test_…" /></div>
    </section>

    <div class="flex items-center gap-3">
      <button :disabled="saving" class="btn-green" @click="save">{{ saving ? 'Saving…' : 'Save Branding' }}</button>
      <span v-if="msg" :class="msgOk ? 'text-green-600' : 'text-red-600'" class="text-sm">{{ msg }}</span>
    </div>

    <!-- Custom pages -->
    <section class="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 class="font-display font-bold text-brand-green">Custom Pages</h3>
        <button class="btn-gold text-xs" @click="openPage()">+ New Page</button>
      </div>
      <div v-if="!pages.length" class="text-sm text-gray-400 py-4 text-center">No custom pages yet.</div>
      <div v-for="pg in pages" :key="pg.id" class="flex items-center justify-between py-2 border-b border-gray-50">
        <div>
          <p class="font-semibold text-gray-800">{{ pg.title }}</p>
          <a :href="`/${slug}/p/${pg.slug}`" target="_blank" class="text-xs text-brand-green font-mono">/{{ slug }}/p/{{ pg.slug }}</a>
        </div>
        <div class="flex gap-2">
          <button class="text-xs text-brand-green underline" @click="openPage(pg)">Edit</button>
          <button class="text-xs text-red-500 underline" @click="delPage(pg)">Delete</button>
        </div>
      </div>
    </section>

    <!-- Page editor modal -->
    <div v-if="pageModal" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" @click.self="pageModal=false">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="font-display font-bold text-xl mb-4">{{ pageForm.id ? 'Edit' : 'New' }} Page</h3>
        <div class="space-y-3">
          <div><label class="label">Title</label><input v-model="pageForm.title" class="input" /></div>
          <div><label class="label">URL slug</label><input v-model="pageForm.slug" class="input" placeholder="about" :disabled="!!pageForm.id" /></div>
          <div><label class="label">Content (HTML allowed)</label><textarea v-model="pageForm.body_html" rows="8" class="input font-mono text-sm"></textarea></div>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="pageForm.show_in_nav" /> Show in navigation</label>
          <p v-if="pageErr" class="text-sm text-red-600">{{ pageErr }}</p>
          <div class="flex gap-2 pt-2">
            <button :disabled="pageSaving" class="btn-green text-sm" @click="savePage">{{ pageSaving ? 'Saving…' : 'Save Page' }}</button>
            <button class="btn-ghost text-sm" @click="pageModal=false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/composables/useApi.js';
import { useTenantStore } from '@/stores/tenantStore.js';

const route = useRoute();
const slug = route.params.slug;
const tenantStore = useTenantStore();

const f = reactive({
  name:'', tagline:'', description:'', logo_url:'',
  color_primary:'#02462E', color_secondary:'#FEC700', color_accent:'#6BBC01', color_bg:'#FBF6E6',
  contact_email:'', contact_phone:'', website_url:'',
  social_instagram:'', social_twitter:'', social_facebook:'',
  paystack_public_key:'', paystack_secret_key:'',
});
const saving = ref(false); const msg = ref(''); const msgOk = ref(false);

const pages = ref([]);
const pageModal = ref(false); const pageSaving = ref(false); const pageErr = ref('');
const pageForm = reactive({ id:null, title:'', slug:'', body_html:'', show_in_nav:true });

const load = async () => {
  try {
    const { data } = await api.get(`/tenants/${slug}`);
    Object.assign(f, data.data.tenant);
    f.paystack_secret_key = ''; // never prefill secret
  } catch {}
  try {
    const { data } = await api.get(`/tenants/${slug}/admin/pages`);
    pages.value = data.data || [];
  } catch {}
};

const save = async () => {
  saving.value = true; msg.value = '';
  try {
    const payload = { ...f };
    if (!payload.paystack_secret_key) delete payload.paystack_secret_key; // don't overwrite with blank
    await api.put(`/tenants/${slug}/settings`, payload);
    msgOk.value = true; msg.value = 'Saved! Refresh to see branding changes.';
    tenantStore.applyTheme(f);
  } catch (e) {
    msgOk.value = false; msg.value = e.response?.data?.message || 'Save failed.';
  } finally { saving.value = false; }
};

const openPage = (pg = null) => {
  pageErr.value = '';
  if (pg) Object.assign(pageForm, pg, { show_in_nav: !!pg.show_in_nav });
  else Object.assign(pageForm, { id:null, title:'', slug:'', body_html:'', show_in_nav:true });
  pageModal.value = true;
};

const savePage = async () => {
  pageSaving.value = true; pageErr.value = '';
  try {
    if (pageForm.id) {
      await api.put(`/tenants/${slug}/admin/pages/${pageForm.id}`, pageForm);
    } else {
      await api.post(`/tenants/${slug}/admin/pages`, pageForm);
    }
    pageModal.value = false;
    load();
  } catch (e) {
    pageErr.value = e.response?.data?.message || 'Failed to save page.';
  } finally { pageSaving.value = false; }
};

const delPage = async (pg) => {
  if (!confirm(`Delete "${pg.title}"?`)) return;
  try { await api.delete(`/tenants/${slug}/admin/pages/${pg.id}`); load(); } catch {}
};

onMounted(load);
</script>
