<template>
  <aside class="fixed inset-y-0 left-0 z-50 flex flex-col bg-brand-green text-white transition-all duration-300"
    :class="[
      collapsed ? 'w-16' : 'w-64',
      open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]">

    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0"
      :class="collapsed ? 'justify-center' : ''">
      <img src="/logos/logo-white.png" alt="MYS" class="h-8 w-auto flex-shrink-0" />
      <div v-if="!collapsed" class="overflow-hidden">
        <p class="font-display font-bold text-white text-sm leading-tight">Muslim Youth</p>
        <p class="font-display text-brand-gold text-xs uppercase tracking-wider">Summit Admin</p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      <template v-for="section in visibleSections" :key="section.label">
        <p v-if="!collapsed && section.label"
          class="text-white/25 text-[10px] font-bold uppercase tracking-[0.25em] px-3 pt-4 pb-1">
          {{ section.label }}
        </p>
        <RouterLink v-for="link in section.links" :key="link.to" :to="link.to"
          class="flex items-center gap-3 px-3 py-2.5 transition-all duration-150 text-sm group rounded-lg"
          :class="[
            isActive(link.to) ? 'bg-brand-gold text-brand-green font-bold' : 'text-white/65 hover:text-white hover:bg-white/10',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? link.label : ''"
          @click="$emit('navigate')">
          <component :is="link.icon" :size="18" class="flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ link.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <!-- Bottom controls -->
    <div class="flex-shrink-0 border-t border-white/10 p-2 space-y-0.5">
      <button class="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 text-white/40 hover:text-white hover:bg-white/10 text-sm transition-colors rounded-lg"
        :class="collapsed ? 'justify-center' : ''" @click="$emit('toggle')">
        <component :is="collapsed ? ChevronRight : ChevronLeft" :size="17" />
        <span v-if="!collapsed" class="text-xs">Collapse</span>
      </button>
      <button class="w-full flex items-center gap-3 px-3 py-2.5 text-white/40 hover:text-red-300 hover:bg-white/10 text-sm transition-colors rounded-lg"
        :class="collapsed ? 'justify-center' : ''" @click="handleLogout">
        <LogOut :size="17" />
        <span v-if="!collapsed" class="text-xs">Logout</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore.js';
import {
  LayoutDashboard, TrendingUp, FileBarChart2, CalendarDays, Tag, ShieldCheck,
  Ticket, Image, Users, Mail, Key, ChevronLeft, ChevronRight, LogOut, Tags,
  UserPlus, BedDouble, Building2, ReceiptText, Settings, ShoppingBag, Handshake, Youtube, Star, Palette,
} from 'lucide-vue-next';

const ALL_ADMIN  = ['super_admin','admin','attendant','department'];
const ADMIN_ONLY = ['super_admin','admin'];
const SUPER_ONLY = ['super_admin'];
const DEPT_PLUS  = ['super_admin','admin','department'];

defineProps({
  collapsed: { type: Boolean, default: false },
  open:      { type: Boolean, default: false },
});
defineEmits(['toggle', 'navigate']);

const auth   = useAuthStore();
const router = useRouter();
const route  = useRoute();

const isActive = (to) => route.path === to || route.path.startsWith(to + '/');

const allSections = [
  {
    label: 'Overview',
    links: [
      { to:'/admin/dashboard',       label:'Dashboard',      icon:LayoutDashboard, roles:['super_admin','admin','attendant'] },
      { to:'/admin/event-dashboard', label:'Event Progress', icon:TrendingUp,      roles:['super_admin','admin'] },
      { to:'/admin/reports',         label:'R&P Reports',    icon:FileBarChart2,   roles:['super_admin','admin'] },
    ],
  },
  {
    label: 'Events',
    links: [
      { to:'/admin/events',     label:'All Events',  icon:CalendarDays, roles:['super_admin','admin'] },
      { to:'/admin/categories', label:'Categories',  icon:Tag,          roles:['super_admin','admin'] },
    ],
  },
  {
    label: 'Operations',
    links: [
      { to:'/admin/attendance', label:'Attendance',  icon:ShieldCheck, roles:['super_admin','admin','attendant'] },
      { to:'/admin/tags',       label:'Event Tags',  icon:Tags,        roles:['super_admin','admin'] },
      { to:'/admin/hostels',    label:'Hostels',     icon:BedDouble,   roles:['super_admin','admin'] },
      { to:'/admin/gallery',    label:'Gallery',     icon:Image,       roles:['super_admin','admin'] },
      { to:'/admin/media',      label:'Upload Recordings', icon:Youtube, roles:['super_admin','admin','attendant'] },
      { to:'/admin/souvenirs',  label:'Souvenirs',   icon:ShoppingBag, roles:['super_admin','admin'] },
      { to:'/admin/sponsors',   label:'Sponsors',    icon:Handshake,   roles:['super_admin','admin'] },
    ],
  },
  {
    label: 'Participants',
    links: [
      { to:'/admin/participants', label:'Participants',     icon:Users, roles:['super_admin','admin'] },
      { to:'/admin/register',     label:'Manual Register',  icon:UserPlus, roles:['super_admin','admin'] },
      { to:'/admin/email',        label:'Email Campaigns',  icon:Mail,  roles:['super_admin','admin'] },
    ],
  },
  {
    label: 'System',
    links: [
      { to:'/admin/departments', label:'Departments',      icon:Building2,   roles:ADMIN_ONLY },
      { to:'/admin/expenses',    label:'Expense Requests', icon:ReceiptText,  roles:DEPT_PLUS  },
      { to:'/admin/admins',      label:'Admin Users',      icon:Key,          roles:SUPER_ONLY },
      { to:'/admin/branding',    label:'Branding',         icon:Palette,      roles:SUPER_ONLY },
      { to:'/admin/settings',    label:'My Settings',      icon:Settings,     roles:ALL_ADMIN  },
    ],
  },
];

const visibleSections = computed(() =>
  allSections
    .map(s => ({ ...s, links: s.links.filter(l => l.roles.includes(auth.admin?.role)) }))
    .filter(s => s.links.length)
);

const handleLogout = () => { auth.logout(); router.push('/admin/login'); };
</script>
