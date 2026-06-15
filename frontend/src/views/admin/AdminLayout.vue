<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div v-if="sidebarOpen"
        class="fixed inset-0 bg-black/60 z-40 lg:hidden"
        @click="sidebarOpen = false"></div>
    </Transition>

    <!-- Sidebar: AdminSidebar is itself position:fixed; it handles its own
         width (collapsed) and mobile slide (open). No extra wrapper. -->
    <AdminSidebar
      :collapsed="isDesktop && sidebarCollapsed"
      :open="sidebarOpen"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @navigate="sidebarOpen = false" />

    <!-- Main content -->
    <div class="flex flex-col min-h-screen transition-all duration-300"
      :class="(isDesktop && sidebarCollapsed) ? 'lg:ml-16' : 'lg:ml-64'">

      <!-- Top bar -->
      <header class="sticky top-0 z-30 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 h-14 md:h-16 flex items-center gap-2 sm:gap-4">
        <!-- Mobile hamburger -->
        <button class="lg:hidden text-gray-600 hover:text-brand-green p-2 -ml-2 active:scale-95 transition-transform"
          aria-label="Open menu"
          @click="sidebarOpen = true">
          <Menu :size="24" />
        </button>

        <!-- Desktop collapse toggle -->
        <button class="hidden lg:flex text-gray-400 hover:text-brand-green transition-colors p-1"
          aria-label="Collapse sidebar"
          @click="sidebarCollapsed = !sidebarCollapsed">
          <PanelLeft :size="18" />
        </button>

        <div class="flex-1 min-w-0">
          <h1 class="font-display font-bold text-brand-green text-base sm:text-lg truncate">{{ pageTitle }}</h1>
        </div>

        <!-- Right cluster -->
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <RouterLink v-if="isAdmin" to="/admin/expenses"
            class="relative text-gray-500 hover:text-brand-green transition-colors p-1"
            title="Expense Requests">
            <ReceiptText :size="19" />
            <span v-if="pendingExpenses > 0"
              class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {{ pendingExpenses > 9 ? '9+' : pendingExpenses }}
            </span>
          </RouterLink>

          <!-- User menu -->
          <div class="relative" ref="userMenuRef">
            <button class="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-green transition-colors"
              @click="userMenuOpen = !userMenuOpen">
              <div class="w-8 h-8 bg-brand-green flex items-center justify-center text-white font-bold text-xs rounded-full">
                {{ auth.admin?.name?.[0]?.toUpperCase() }}
              </div>
              <span class="hidden md:block font-semibold max-w-[120px] truncate">{{ auth.admin?.name }}</span>
              <ChevronDown :size="14" :class="userMenuOpen ? 'rotate-180' : ''" class="transition-transform hidden md:block" />
            </button>

            <Transition name="dropdown">
              <div v-if="userMenuOpen"
                class="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 shadow-xl rounded-lg z-50 py-1 overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-bold text-gray-800 truncate">{{ auth.admin?.name }}</p>
                  <p class="text-xs text-gray-400 capitalize">{{ auth.admin?.role?.replace('_',' ') }}</p>
                </div>
                <RouterLink to="/admin/settings" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-green transition-colors"
                  @click="userMenuOpen=false">
                  <Settings :size="15" /> Settings
                </RouterLink>
                <a href="/" target="_blank" class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  @click="userMenuOpen=false">
                  <ExternalLink :size="15" /> View Site
                </a>
                <button class="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                  @click="handleLogout">
                  <LogOut :size="15" /> Sign Out
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden w-full max-w-full">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu, PanelLeft, ChevronDown, ReceiptText, Settings, LogOut, ExternalLink } from 'lucide-vue-next';
import AdminSidebar from '@/components/admin/AdminSidebar.vue';
import { useAuthStore } from '@/stores/authStore.js';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const auth   = useAuthStore();
const alert  = useAlertStore();
const route  = useRoute();
const router = useRouter();

const sidebarOpen      = ref(false);
const sidebarCollapsed = ref(true);
const userMenuOpen     = ref(false);
const userMenuRef      = ref(null);
const pendingExpenses  = ref(0);
const isDesktop        = ref(window.innerWidth >= 1024);

// Track viewport so collapse only applies on desktop
const onResize = () => { isDesktop.value = window.innerWidth >= 1024; };

// Close mobile sidebar + user menu on navigation
watch(() => route.fullPath, () => { sidebarOpen.value = false; userMenuOpen.value = false; });

const isAdmin = computed(() => ['super_admin','admin'].includes(auth.admin?.role));

const pageTitles = {
  'admin-dashboard':'Dashboard','admin-event-dashboard':'Event Progress','admin-reports':'R&P Reports',
  'admin-events':'All Events','admin-event-create':'Create Event','admin-event-detail':'Event Detail',
  'admin-schedule':'Schedule Editor','admin-ticket-types':'Ticket Pricing','admin-categories':'Categories',
  'admin-attendance':'Attendance','admin-tags':'Event Tags','admin-hostels':'Hostels','admin-gallery':'Gallery',
  'admin-participants':'Participants','admin-manual-register':'Manual Register','admin-email':'Email Campaigns',
  'admin-departments':'Departments','admin-expenses':'Expense Requests','admin-souvenirs':'Souvenirs & Merchandise',
  'admin-sponsors':'Sponsors & Partners','admin-media':'Upload Recordings','admin-admins':'Admin Users','admin-settings':'My Settings',
};
const pageTitle = computed(() => pageTitles[route.name] || 'Admin Panel');

const handleOutsideClick = (e) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) userMenuOpen.value = false;
};

onMounted(async () => {
  document.addEventListener('click', handleOutsideClick);
  window.addEventListener('resize', onResize);
  if (isAdmin.value) {
    try {
      const { data } = await api.get('/expenses?status=pending');
      pendingExpenses.value = (data.data || []).length;
    } catch {}
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
  window.removeEventListener('resize', onResize);
});

const handleLogout = () => {
  auth.logout();
  const slug = route.params.slug;
  router.push(slug ? `/${slug}/admin/login` : '/admin/login');
};
</script>

<style scoped>
.dropdown-enter-active { transition: all 0.15s ease; }
.dropdown-leave-active { transition: all 0.1s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
