<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <h2 class="font-display font-bold text-xl text-brand-green">My Settings</h2>

    <!-- Profile -->
    <div class="bg-white border border-gray-100 p-6 space-y-5">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3 flex items-center gap-2">
        <User :size="16" /> Profile
      </h3>
      <form @submit.prevent="saveProfile" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="label">Display Name</label>
            <input v-model="profile.name" class="input" placeholder="Your name" />
          </div>
          <div class="md:col-span-2">
            <label class="label">Email</label>
            <input :value="auth.admin?.email" class="input bg-gray-50" disabled />
            <p class="text-xs text-gray-400 mt-1">Contact super admin to change email.</p>
          </div>
          <div>
            <label class="label">Role</label>
            <input :value="auth.admin?.role?.replace('_',' ')" class="input bg-gray-50 capitalize" disabled />
          </div>
          <div v-if="auth.admin?.department_name">
            <label class="label">Department</label>
            <input :value="auth.admin?.department_name" class="input bg-gray-50" disabled />
          </div>
        </div>
        <button type="submit" :disabled="savingProfile" class="btn-green text-xs flex items-center gap-2">
          <component :is="savingProfile ? Loader : Save" :size="14" :class="savingProfile?'animate-spin':''" />
          {{ savingProfile ? 'Saving…' : 'Save Profile' }}
        </button>
      </form>
    </div>

    <!-- Change Password -->
    <div class="bg-white border border-gray-100 p-6 space-y-5">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3 flex items-center gap-2">
        <Lock :size="16" /> Change Password
      </h3>
      <form @submit.prevent="changePassword" class="space-y-4">
        <div>
          <label class="label">Current Password</label>
          <input v-model="pwForm.current" type="password" class="input" :class="{'input-error':pwErrs.current}" />
          <p v-if="pwErrs.current" class="text-red-500 text-xs mt-1">{{ pwErrs.current }}</p>
        </div>
        <div>
          <label class="label">New Password</label>
          <input v-model="pwForm.new_pass" type="password" class="input" :class="{'input-error':pwErrs.new_pass}"
            placeholder="Minimum 8 characters" />
          <p v-if="pwErrs.new_pass" class="text-red-500 text-xs mt-1">{{ pwErrs.new_pass }}</p>
        </div>
        <div>
          <label class="label">Confirm New Password</label>
          <input v-model="pwForm.confirm" type="password" class="input" :class="{'input-error':pwErrs.confirm}" />
          <p v-if="pwErrs.confirm" class="text-red-500 text-xs mt-1">{{ pwErrs.confirm }}</p>
        </div>

        <!-- Password strength -->
        <div v-if="pwForm.new_pass" class="space-y-1.5">
          <div class="flex gap-1">
            <div v-for="(s, i) in 4" :key="i" class="flex-1 h-1.5 rounded-full transition-all"
              :class="i < pwStrength ? strengthColor : 'bg-gray-100'"></div>
          </div>
          <p class="text-xs" :class="['text-red-500','text-red-500','text-yellow-500','text-green-600'][pwStrength-1] || 'text-gray-400'">
            {{ ['','Weak','Fair','Good','Strong'][pwStrength] }}
          </p>
        </div>

        <button type="submit" :disabled="savingPw" class="btn-green text-xs flex items-center gap-2">
          <component :is="savingPw ? Loader : Lock" :size="14" :class="savingPw?'animate-spin':''" />
          {{ savingPw ? 'Changing…' : 'Change Password' }}
        </button>
      </form>
    </div>

    <!-- Preferences -->
    <div class="bg-white border border-gray-100 p-6 space-y-5">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3 flex items-center gap-2">
        <Settings2 :size="16" /> Preferences
      </h3>
      <div class="space-y-4">
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="font-semibold text-sm">Email notifications</p>
            <p class="text-xs text-gray-400">Receive email alerts for new expense requests and check-ins</p>
          </div>
          <button class="relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
            :class="prefs.email_notifications ? 'bg-brand-green' : 'bg-gray-200'"
            @click="prefs.email_notifications = !prefs.email_notifications">
            <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
              :class="prefs.email_notifications ? 'left-6' : 'left-0.5'"></span>
          </button>
        </div>
        <div class="flex items-center justify-between py-2 border-t border-gray-50">
          <div>
            <p class="font-semibold text-sm">Compact sidebar</p>
            <p class="text-xs text-gray-400">Show sidebar collapsed by default</p>
          </div>
          <button class="relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
            :class="prefs.compact_sidebar ? 'bg-brand-green' : 'bg-gray-200'"
            @click="prefs.compact_sidebar = !prefs.compact_sidebar">
            <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
              :class="prefs.compact_sidebar ? 'left-6' : 'left-0.5'"></span>
          </button>
        </div>
      </div>
      <button class="btn-green text-xs flex items-center gap-2" @click="savePrefs">
        <Save :size="14" /> Save Preferences
      </button>
    </div>

    <!-- Email Configuration -->
    <div class="bg-white border border-gray-100 p-6 space-y-4">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3 flex items-center gap-2">
        <Mail :size="16" /> Email (SMTP)
      </h3>
      <div v-if="!emailConfigured" class="bg-yellow-50 border border-yellow-100 p-4">
        <p class="font-semibold text-yellow-800 text-sm flex items-center gap-2">
          <AlertTriangle :size="14" /> Email not configured
        </p>
        <p class="text-xs text-yellow-700 mt-1">
          Add <code class="bg-yellow-100 px-1">SMTP_HOST</code>, <code class="bg-yellow-100 px-1">SMTP_USER</code>,
          <code class="bg-yellow-100 px-1">SMTP_PASS</code> to <code class="bg-yellow-100 px-1">backend/.env</code>
        </p>
      </div>
      <div v-else class="space-y-3">
        <div class="flex items-center gap-3 bg-green-50 border border-green-100 p-3">
          <CheckCircle2 :size="16" class="text-green-600 flex-shrink-0" />
          <div>
            <p class="font-semibold text-green-800 text-sm">SMTP configured</p>
            <p class="text-xs text-green-700">Host: {{ smtpHost }} · User: {{ smtpUser }}</p>
          </div>
        </div>
        <div class="flex gap-3 items-end">
          <div class="flex-1">
            <label class="label">Send test email to</label>
            <input v-model="testEmailTo" type="email" class="input text-sm" :placeholder="auth.admin?.email || 'you@gmail.com'" />
          </div>
          <button class="btn-green text-xs px-4 py-2.5 flex-shrink-0 flex items-center gap-1.5"
            :disabled="testEmailBusy" @click="sendTestEmail">
            <component :is="testEmailBusy ? Loader : Send" :size="13" :class="testEmailBusy?'animate-spin':''" />
            {{ testEmailBusy ? 'Sending…' : 'Send Test' }}
          </button>
        </div>
        <div v-if="testEmailResult" class="text-sm px-3 py-2 flex items-center gap-2"
          :class="testEmailResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'">
          <component :is="testEmailResult.ok ? CheckCircle2 : XCircle" :size="14" class="flex-shrink-0" />
          {{ testEmailResult.message }}
        </div>
      </div>
    </div>

    <!-- SMS Configuration -->
    <div class="bg-white border border-gray-100 p-6 space-y-4">
      <h3 class="font-display font-bold text-brand-green border-b border-gray-100 pb-3 flex items-center gap-2">
        <MessageSquare :size="16" /> SMS Notifications (Termii)
      </h3>
      <div v-if="smsStatus === null" class="flex items-center gap-2 text-gray-400 text-sm">
        <Loader :size="14" class="animate-spin" /> Checking SMS configuration…
      </div>
      <div v-else-if="smsStatus.configured" class="flex items-center gap-3 bg-green-50 border border-green-100 p-4">
        <CheckCircle2 :size="20" class="text-green-600 flex-shrink-0" />
        <div>
          <p class="font-semibold text-green-800 text-sm">Termii SMS is configured</p>
          <p class="text-xs text-green-700">Balance: {{ smsStatus.currency }} {{ smsStatus.balance }} · Provider: {{ smsStatus.provider }}</p>
        </div>
      </div>
      <div v-else class="bg-yellow-50 border border-yellow-100 p-4">
        <p class="font-semibold text-yellow-800 text-sm flex items-center gap-2"><AlertTriangle :size="14" /> SMS not configured</p>
        <p class="text-xs text-yellow-700 mt-1">Add your Termii API key to <code class="bg-yellow-100 px-1">.env</code>:</p>
        <pre class="text-xs bg-yellow-100 p-2 mt-2 overflow-x-auto">TERMII_API_KEY=your_termii_api_key
TERMII_SENDER_ID=MYSummit
TERMII_CHANNEL=generic</pre>
        <a href="https://app.termii.com" target="_blank" class="text-xs text-brand-green hover:underline mt-2 flex items-center gap-1">
          Get API key at termii.com →
        </a>
      </div>
    </div>

    <!-- Danger zone -->
    <div class="bg-red-50 border border-red-100 p-6">
      <h3 class="font-display font-bold text-red-600 border-b border-red-100 pb-3 flex items-center gap-2 mb-4">
        <AlertTriangle :size="16" /> Session
      </h3>
      <p class="text-sm text-gray-600 mb-4">Logged in as <strong>{{ auth.admin?.name }}</strong> ({{ auth.admin?.role }})</p>
      <button class="btn-green text-xs bg-red-500 border-red-500 hover:bg-red-600 flex items-center gap-2"
        @click="logout">
        <LogOut :size="14" /> Sign Out
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Save, Loader, Settings2, AlertTriangle, LogOut, MessageSquare, CheckCircle2, Mail, Send, XCircle } from 'lucide-vue-next';
import { useAuthStore }  from '@/stores/authStore.js';
import { useAlertStore } from '@/stores/alertStore.js';
import api from '@/composables/useApi.js';

const auth   = useAuthStore();
const alert  = useAlertStore();
const router = useRouter();

const profile = reactive({ name: auth.admin?.name || '' });
const savingProfile = ref(false);

const pwForm  = reactive({ current:'', new_pass:'', confirm:'' });
const pwErrs  = reactive({ current:'', new_pass:'', confirm:'' });
const savingPw = ref(false);
const smsStatus      = ref(null);
const testEmailTo    = ref('');
const testEmailBusy  = ref(false);
const testEmailResult= ref(null);

// Read SMTP config from server env hint (safe — no passwords)
const emailConfigured = computed(() => !!import.meta.env.VITE_EMAIL_CONFIGURED || false);
const smtpHost = computed(() => import.meta.env.VITE_SMTP_HOST || '');
const smtpUser = computed(() => import.meta.env.VITE_SMTP_USER || '');

const prefs = reactive({
  email_notifications: true,
  compact_sidebar: false,
  ...JSON.parse(localStorage.getItem('mys_prefs') || '{}'),
});

const pwStrength = computed(() => {
  const p = pwForm.new_pass;
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)  s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s;
});

const strengthColor = computed(() =>
  ['bg-red-400','bg-red-400','bg-yellow-400','bg-green-500'][pwStrength.value - 1] || 'bg-gray-100'
);

const saveProfile = async () => {
  savingProfile.value = true;
  try {
    await api.put(`/auth/admins/${auth.admin?.id}`, {
      name: profile.name, email: auth.admin?.email,
      role: auth.admin?.role, is_active: 1,
    });
    auth.admin.name = profile.name;
    localStorage.setItem('mys_admin', JSON.stringify(auth.admin));
    alert.success('Profile updated.');
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { savingProfile.value = false; }
};

const changePassword = async () => {
  pwErrs.current  = pwForm.current   ? '' : 'Current password required.';
  pwErrs.new_pass = pwForm.new_pass.length >= 8 ? '' : 'Minimum 8 characters.';
  pwErrs.confirm  = pwForm.new_pass === pwForm.confirm ? '' : 'Passwords do not match.';
  if (Object.values(pwErrs).some(Boolean)) return;

  savingPw.value = true;
  try {
    await api.post('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.new_pass });
    alert.success('Password changed successfully.');
    Object.assign(pwForm, { current:'', new_pass:'', confirm:'' });
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { savingPw.value = false; }
};

const savePrefs = () => {
  localStorage.setItem('mys_prefs', JSON.stringify(prefs));
  alert.success('Preferences saved.');
};

const sendTestEmail = async () => {
  const to = testEmailTo.value.trim() || auth.admin?.email;
  if (!to) { testEmailResult.value = { ok: false, message: 'Enter an email address.' }; return; }
  testEmailBusy.value   = true;
  testEmailResult.value = null;
  try {
    const { data } = await api.post('/email/test', { email: to });
    testEmailResult.value = { ok: true, message: data.message || `Test email sent to ${to}. Check your inbox (and spam).` };
  } catch (err) {
    testEmailResult.value = { ok: false, message: err.response?.data?.message || 'Email failed. Check your SMTP settings.' };
  } finally { testEmailBusy.value = false; }
};

const logout = () => { auth.logout(); router.push('/admin/login'); };

// Load SMS status
api.get('/sms/status').then(({ data }) => { smsStatus.value = data.data; }).catch(() => { smsStatus.value = { configured: false, error: 'Unable to check' }; });
</script>
