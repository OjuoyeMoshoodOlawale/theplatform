import { defineStore } from 'pinia';
import { ref } from 'vue';

let _id = 0;

export const useAlertStore = defineStore('alert', () => {
  const alerts = ref([]);

  const push = (type, message, duration = 4500) => {
    const id = ++_id;
    alerts.value.push({ id, type, message });
    setTimeout(() => dismiss(id), duration);
    return id;
  };

  const dismiss = (id) => {
    alerts.value = alerts.value.filter((a) => a.id !== id);
  };

  const success = (msg, duration) => push('success', msg, duration);
  const error   = (msg, duration) => push('error',   msg, duration ?? 6000);
  const warning = (msg, duration) => push('warning', msg, duration);
  const info    = (msg, duration) => push('info',    msg, duration);

  return { alerts, dismiss, success, error, warning, info };
});
