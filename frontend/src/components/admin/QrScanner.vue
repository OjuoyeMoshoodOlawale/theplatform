<template>
  <div>
    <div id="qr-reader" class="w-full rounded overflow-hidden"></div>
    <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
    <p class="text-center text-xs text-gray-400 mt-2">Point camera at a QR code or enter manually below</p>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const emit = defineEmits(['scan']);
const error = ref('');
let html5QrCode = null;

onMounted(async () => {
  try {
    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');
    html5QrCode = new Html5Qrcode('qr-reader');

    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        emit('scan', decodedText);
      },
      () => {} // suppress frame errors
    );
  } catch (err) {
    error.value = 'Could not access camera. Please allow camera permission or enter the number manually.';
    console.warn('QR Scanner error:', err);
  }
});

onUnmounted(async () => {
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch {}
  }
});
</script>
