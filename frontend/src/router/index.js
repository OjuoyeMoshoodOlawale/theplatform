import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore.js';
import { useTenantStore } from '@/stores/tenantStore.js';

/* ─── Lazy views ─────────────────────────────────────────── */
const Landing             = () => import('@/views/Landing.vue');
const RegisterTicket      = () => import('@/views/RegisterTicket.vue');
const TicketView          = () => import('@/views/TicketView.vue');
const CertificateView     = () => import('@/views/CertificateView.vue');
const TagView             = () => import('@/views/TagView.vue');
const CheckIn             = () => import('@/views/CheckIn.vue');
const PastEvents          = () => import('@/views/PastEvents.vue');
const Souvenirs           = () => import('@/views/SouvenirShop.vue');
const TenantPage          = () => import('@/views/TenantPage.vue');

const AdminLogin          = () => import('@/views/admin/AdminLogin.vue');
const AdminLayout         = () => import('@/views/admin/AdminLayout.vue');
const AdminDashboard      = () => import('@/views/admin/AdminDashboard.vue');
const AdminEventDashboard = () => import('@/views/admin/AdminEventDashboard.vue');
const AdminEvents         = () => import('@/views/admin/AdminEvents.vue');
const CreateEvent         = () => import('@/views/admin/CreateEvent.vue');
const EventDetail         = () => import('@/views/admin/EventDetail.vue');
const AdminSchedule       = () => import('@/views/admin/AdminSchedule.vue');
const AdminTicketTypes    = () => import('@/views/admin/AdminTicketTypes.vue');
const AdminCategories     = () => import('@/views/admin/AdminCategories.vue');
const AdminAttendance     = () => import('@/views/admin/AdminAttendance.vue');
const AdminGallery        = () => import('@/views/admin/AdminGallery.vue');
const AdminParticipants   = () => import('@/views/admin/AdminParticipants.vue');
const AdminEmail          = () => import('@/views/admin/AdminEmail.vue');
const AdminTags           = () => import('@/views/admin/AdminTags.vue');
const AdminReports        = () => import('@/views/admin/AdminReports.vue');
const AdminAdmins         = () => import('@/views/admin/AdminAdmins.vue');
const AdminManualRegister = () => import('@/views/admin/AdminManualRegister.vue');
const AdminHostels        = () => import('@/views/admin/AdminHostels.vue');
const AdminDepartments    = () => import('@/views/admin/AdminDepartments.vue');
const AdminExpenses       = () => import('@/views/admin/AdminExpenses.vue');
const AdminSettings       = () => import('@/views/admin/AdminSettings.vue');
const AdminSouvenirs      = () => import('@/views/admin/AdminSouvenirs.vue');
const AdminSponsors       = () => import('@/views/admin/AdminSponsors.vue');
const AdminMediaUpload    = () => import('@/views/admin/AdminMediaUpload.vue');
const AdminTenantBranding = () => import('@/views/admin/AdminTenantBranding.vue');

const PlatformLogin       = () => import('@/views/platform/PlatformLogin.vue');
const PlatformDashboard   = () => import('@/views/platform/PlatformDashboard.vue');
const PlatformHome        = () => import('@/views/platform/PlatformHome.vue');

/* ─── Roles shorthand ────────────────────────────────────── */
const ALL_ADMIN  = ['super_admin','admin','attendant','department'];
const ADMIN_ONLY = ['super_admin','admin'];
const SUPER_ONLY = ['super_admin'];
const DEPT_PLUS  = ['super_admin','admin','department'];

/* ─── Tenant-scoped admin children ───────────────────────── */
const adminChildren = [
  { path: '',                    redirect: to => `/${to.params.slug}/admin/dashboard` },
  { path: 'dashboard',           name: 'admin-dashboard',       component: AdminDashboard,       meta: { roles: ALL_ADMIN } },
  { path: 'event-dashboard',     name: 'admin-event-dashboard', component: AdminEventDashboard,  meta: { roles: ADMIN_ONLY } },
  { path: 'reports',             name: 'admin-reports',         component: AdminReports,         meta: { roles: ADMIN_ONLY } },
  { path: 'events',              name: 'admin-events',          component: AdminEvents,          meta: { roles: ADMIN_ONLY } },
  { path: 'events/new',          name: 'admin-event-create',    component: CreateEvent,          meta: { roles: ADMIN_ONLY } },
  { path: 'events/:id',          name: 'admin-event-detail',    component: EventDetail,          meta: { roles: ADMIN_ONLY } },
  { path: 'events/:id/schedule', name: 'admin-schedule',        component: AdminSchedule,        meta: { roles: ADMIN_ONLY } },
  { path: 'events/:id/ticket-types', name: 'admin-ticket-types', component: AdminTicketTypes,    meta: { roles: ADMIN_ONLY } },
  { path: 'categories',          name: 'admin-categories',      component: AdminCategories,      meta: { roles: ADMIN_ONLY } },
  { path: 'attendance',          name: 'admin-attendance',      component: AdminAttendance,      meta: { roles: ALL_ADMIN } },
  { path: 'tags',                name: 'admin-tags',            component: AdminTags,            meta: { roles: ADMIN_ONLY } },
  { path: 'hostels',             name: 'admin-hostels',         component: AdminHostels,         meta: { roles: ADMIN_ONLY } },
  { path: 'gallery',             name: 'admin-gallery',         component: AdminGallery,         meta: { roles: ADMIN_ONLY } },
  { path: 'participants',        name: 'admin-participants',    component: AdminParticipants,    meta: { roles: ADMIN_ONLY } },
  { path: 'register',            name: 'admin-manual-register', component: AdminManualRegister,  meta: { roles: ADMIN_ONLY } },
  { path: 'email',               name: 'admin-email',           component: AdminEmail,           meta: { roles: ADMIN_ONLY } },
  { path: 'departments',         name: 'admin-departments',     component: AdminDepartments,     meta: { roles: ADMIN_ONLY } },
  { path: 'expenses',            name: 'admin-expenses',        component: AdminExpenses,        meta: { roles: DEPT_PLUS } },
  { path: 'admins',              name: 'admin-admins',          component: AdminAdmins,          meta: { roles: SUPER_ONLY } },
  { path: 'settings',            name: 'admin-settings',        component: AdminSettings,        meta: { roles: ALL_ADMIN } },
  { path: 'branding',            name: 'admin-branding',        component: AdminTenantBranding,  meta: { roles: SUPER_ONLY } },
  { path: 'souvenirs',           name: 'admin-souvenirs',       component: AdminSouvenirs,       meta: { roles: ADMIN_ONLY } },
  { path: 'sponsors',            name: 'admin-sponsors',        component: AdminSponsors,        meta: { roles: ADMIN_ONLY } },
  { path: 'media',               name: 'admin-media',           component: AdminMediaUpload,     meta: { roles: ALL_ADMIN } },
];

const routes = [
  /* Platform-level (no tenant) */
  { path: '/platform/login',     name: 'platform-login',     component: PlatformLogin,     meta: { guestOnly: true } },
  { path: '/platform',           name: 'platform-dashboard', component: PlatformDashboard, meta: { requiresPlatform: true } },

  /* Tenant landing & public pages */
  { path: '/:slug',              name: 'home',          component: Landing,         meta: { tenant: true } },
  { path: '/:slug/register',     name: 'register',      component: RegisterTicket,  meta: { tenant: true } },
  { path: '/:slug/ticket/verify', name: 'ticket-verify', component: TicketView,     meta: { tenant: true } },
  { path: '/:slug/ticket/:ref',  name: 'ticket',        component: TicketView,      meta: { tenant: true } },
  { path: '/:slug/certificate',  name: 'certificate',   component: CertificateView, meta: { tenant: true } },
  { path: '/:slug/certificate/:ref', name: 'certificate-ref', component: CertificateView, meta: { tenant: true } },
  { path: '/:slug/tag/:tagNumber', name: 'tag-view',    component: TagView,         meta: { tenant: true } },
  { path: '/:slug/check-in',     name: 'checkin',       component: CheckIn,         meta: { tenant: true, requiresAuth: true, roles: ALL_ADMIN } },
  { path: '/:slug/past-events',  name: 'past',          component: PastEvents,      meta: { tenant: true } },
  { path: '/:slug/shop',         name: 'shop',          component: Souvenirs,       meta: { tenant: true } },
  { path: '/:slug/shop/verify',  name: 'shop-verify',   component: Souvenirs,       meta: { tenant: true } },
  { path: '/:slug/p/:pageSlug',  name: 'tenant-page',   component: TenantPage,      meta: { tenant: true } },

  /* Tenant admin */
  { path: '/:slug/admin/login',  name: 'admin-login',   component: AdminLogin,      meta: { tenant: true, guestOnly: true } },
  {
    path: '/:slug/admin',
    component: AdminLayout,
    meta: { tenant: true, requiresAuth: true, roles: ALL_ADMIN },
    children: adminChildren,
  },

  /* Root: platform splash / tenant picker */
  { path: '/', name: 'root', component: PlatformHome },

  /* Catch-all */
  { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 80 };
    return { top: 0, behavior: 'smooth' };
  },
});

/* ─── Navigation guard ───────────────────────────────────── */
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  // ── Legacy link rescue: a hardcoded link like /admin/dashboard or /register
  //    (no slug) was followed while we're inside a tenant. Re-inject the slug
  //    from the current route so old links keep working.
  const SLUGLESS = /^\/(admin|register|shop|check-in|ticket|certificate|tag|past-events)(\/|$)/;
  if (SLUGLESS.test(to.path) && !to.path.startsWith('/platform')) {
    const currentSlug = from.params?.slug
      || useTenantStore().slug
      || null;
    if (currentSlug) {
      return next(`/${currentSlug}${to.path}${to.hash || ''}`);
    }
    // No tenant context → send to picker
    return next({ name: 'root' });
  }

  // Platform-admin pages
  if (to.meta.requiresPlatform) {
    if (!localStorage.getItem('mys_platform_token')) return next({ name: 'platform-login' });
    return next();
  }

  // Load the tenant for any tenant-scoped route
  if (to.meta.tenant && to.params.slug) {
    const tenantStore = useTenantStore();
    const t = await tenantStore.loadTenant(to.params.slug);
    if (!t) return next({ name: 'root' });
  }

  // Guest-only (login): redirect authenticated users away
  if (to.meta.guestOnly && auth.isAuthenticated && to.params.slug) {
    const slug = to.params.slug;
    return next(auth.admin?.role === 'department'
      ? `/${slug}/admin/expenses` : `/${slug}/admin/dashboard`);
  }

  // requiresAuth
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth);
  if (requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'admin-login', params: { slug: to.params.slug }, query: { redirect: to.fullPath } });
  }

  // Role check
  const roleMeta = [...to.matched].reverse().find(r => r.meta.roles);
  if (roleMeta && auth.isAuthenticated) {
    if (!roleMeta.meta.roles.includes(auth.admin?.role)) {
      const slug = to.params.slug;
      return next(auth.admin?.role === 'department'
        ? `/${slug}/admin/expenses` : `/${slug}/admin/dashboard`);
    }
  }

  next();
});

export default router;
