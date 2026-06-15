/**
 * useTenantLink — builds slug-prefixed paths so components don't hardcode the
 * tenant. In a tenant context (/:slug/...), tlink('/admin/dashboard') →
 * '/mys/admin/dashboard'. Outside a tenant it returns the path unchanged.
 *
 * Usage in a component:
 *   import { useTenantLink } from '@/composables/useTenantLink.js';
 *   const { tlink, slug } = useTenantLink();
 *   <RouterLink :to="tlink('/admin/events')">…
 *   router.push(tlink('/admin/dashboard'))
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export function useTenantLink() {
  const route = useRoute();
  const slug = computed(() => route.params.slug || null);

  const tlink = (path = '') => {
    const s = route.params.slug;
    if (!s) return path || '/';
    // Normalise: ensure leading slash, strip any existing slug duplication
    let p = path.startsWith('/') ? path : `/${path}`;
    // If already prefixed with this slug, leave it
    if (p === `/${s}` || p.startsWith(`/${s}/`)) return p;
    if (p === '/') return `/${s}`;
    return `/${s}${p}`;
  };

  return { tlink, slug };
}
