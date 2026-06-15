/**
 * tenantStore — resolves the current tenant from the URL slug and exposes its
 * branding (colours, logo, name). Injects CSS variables so the whole app
 * re-themes per tenant.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/composables/useApi.js';

export const useTenantStore = defineStore('tenant', () => {
  const tenant = ref(null);
  const pages  = ref([]);
  const loading = ref(false);
  const error   = ref('');

  const slug = computed(() => tenant.value?.slug || null);
  const isLoaded = computed(() => !!tenant.value);

  // Load a tenant by slug (called by the router when entering /:slug/...)
  const loadTenant = async (tenantSlug) => {
    if (tenant.value?.slug === tenantSlug) return tenant.value; // cached
    loading.value = true; error.value = '';
    try {
      const { data } = await api.get(`/tenants/${tenantSlug}`);
      tenant.value = data.data.tenant;
      pages.value  = data.data.pages || [];
      applyTheme(tenant.value);
      // Tell the api layer which tenant we're in (header for all later calls)
      api.defaults.headers.common['X-Tenant-Slug'] = tenantSlug;
      return tenant.value;
    } catch (e) {
      error.value = e.response?.data?.message || 'Organisation not found.';
      tenant.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Inject the tenant's colours as CSS variables (consumed by Tailwind/CSS).
  // Stored as "R G B" channel triplets so Tailwind's /opacity modifiers work.
  const applyTheme = (t) => {
    if (!t) return;
    const root = document.documentElement;
    const toRgb = (hex) => {
      const m = (hex || '').replace('#', '');
      if (m.length !== 6) return null;
      return `${parseInt(m.slice(0,2),16)} ${parseInt(m.slice(2,4),16)} ${parseInt(m.slice(4,6),16)}`;
    };
    const set = (varName, hex) => { const rgb = toRgb(hex); if (rgb) root.style.setProperty(varName, rgb); };
    set('--brand-primary-rgb',   t.color_primary   || '#02462E');
    set('--brand-secondary-rgb', t.color_secondary || '#FEC700');
    set('--brand-accent-rgb',    t.color_accent    || '#6BBC01');
    set('--brand-bg-rgb',        t.color_bg        || '#FBF6E6');
    if (t.favicon_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = t.favicon_url;
    }
    document.title = t.name || 'Event Platform';
  };

  const clear = () => {
    tenant.value = null; pages.value = []; error.value = '';
    delete api.defaults.headers.common['X-Tenant-Slug'];
  };

  return { tenant, pages, loading, error, slug, isLoaded, loadTenant, applyTheme, clear };
});
