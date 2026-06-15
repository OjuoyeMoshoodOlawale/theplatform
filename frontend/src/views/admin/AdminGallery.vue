<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h2 class="font-display font-bold text-xl text-brand-green">Gallery</h2>
      <div class="flex gap-3 items-center">
        <select v-model="selectedEvent" class="input text-sm w-48" @change="load">
          <option value="">Select event…</option>
          <option v-for="e in events" :key="e.id" :value="e.id">{{ e.edition ? `[${e.edition}] ${e.title}` : e.title }}</option>
        </select>
        <button :disabled="!selectedEvent" class="btn-green text-xs" @click="uploadModal = true">+ Upload Photos</button>
      </div>
    </div>

    <div v-if="images.length" class="columns-2 md:columns-4 gap-3 space-y-3">
      <div v-for="img in images" :key="img.id" class="group relative break-inside-avoid overflow-hidden">
        <img :src="img.image_url" :alt="img.caption || ''" class="w-full object-cover" />
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button class="bg-red-500 text-white text-xs px-3 py-1.5 font-semibold"
            @click="deleteImage(img.id)">Delete</button>
        </div>
        <p v-if="img.caption" class="text-xs text-gray-500 px-1 py-1.5">{{ img.caption }}</p>
      </div>
    </div>
    <div v-else-if="selectedEvent && !loading" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">🖼</p>
      <p class="text-sm">No images for this event yet. Upload some!</p>
    </div>
    <div v-else-if="!selectedEvent" class="text-center py-16 text-gray-300">
      <p class="text-sm">Select an event above to manage its gallery.</p>
    </div>
  </div>

  <!-- Upload modal -->
  <AppModal v-model="uploadModal" title="Upload Photos" size="lg">
    <div class="space-y-4">
      <!-- Upload tabs -->
      <div class="flex gap-4 border-b border-gray-200 mb-2">
        <button v-for="t in ['file','url','drive']" :key="t"
          class="pb-2.5 text-sm font-semibold border-b-2 transition-colors capitalize"
          :class="uploadTab===t ? 'border-brand-green text-brand-green' : 'border-transparent text-gray-400'"
          @click="uploadTab=t">
          {{ {file:'Upload Files', url:'Image URL', drive:'Google Drive URL'}[t] }}
        </button>
      </div>

      <!-- File upload -->
      <div v-if="uploadTab==='file'" class="border-2 border-dashed border-gray-200 p-8 text-center"
        @dragover.prevent @drop.prevent="handleDrop">
        <input type="file" id="img-input" multiple accept="image/*" class="hidden" @change="handleFiles" />
        <label for="img-input" class="cursor-pointer">
          <Image :size="40" class="mx-auto mb-2 text-gray-300" />
          <p class="text-sm text-gray-500">Click to select or drag & drop images</p>
          <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · Max 5MB each</p>
        </label>
      </div>

      <!-- Image URL -->
      <div v-if="uploadTab==='url'" class="space-y-3">
        <p class="text-xs text-gray-500">Paste a publicly accessible image URL (e.g. from a CDN, hosting service, or Imgur)</p>
        <input v-model="urlInput" class="input text-sm" placeholder="https://example.com/image.jpg" />
        <input v-model="urlCaption" class="input text-sm" placeholder="Caption (optional)" />
        <div v-if="urlInput" class="h-32 border border-gray-100 overflow-hidden">
          <img :src="urlInput" class="w-full h-full object-cover" @error="urlError=true" />
        </div>
      </div>

      <!-- Google Drive URL -->
      <div v-if="uploadTab==='drive'" class="space-y-3">
        <div class="bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 leading-relaxed">
          <strong>Google Drive:</strong> Share your image → Copy link → Change permissions to "Anyone with link can view" →
          Paste the link below. We store the Drive link directly (no file upload needed).
        </div>
        <input v-model="driveInput" class="input text-sm" placeholder="https://drive.google.com/file/d/XXXX/view?usp=sharing" />
        <input v-model="driveCaption" class="input text-sm" placeholder="Caption (optional)" />
        <p v-if="driveInput" class="text-xs text-gray-500 break-all">
          Stored as: <code class="bg-gray-100 px-1">{{ driveInput }}</code>
        </p>
      </div>

      <div v-if="filePreviews.length" class="grid grid-cols-3 gap-3">
        <div v-for="(fp, i) in filePreviews" :key="i" class="relative">
          <img :src="fp.preview" class="w-full h-24 object-cover" />
          <input v-model="fp.caption" class="input text-xs mt-1" placeholder="Caption (optional)" />
          <button class="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center"
            @click="filePreviews.splice(i,1)">✕</button>
        </div>
      </div>

      <div class="flex gap-2">
        <button v-if="uploadTab==='file'" :disabled="!filePreviews.length || uploading"
          class="btn-green text-xs" @click="doUpload">
          {{ uploading ? 'Uploading…' : `Upload ${filePreviews.length} photo(s)` }}
        </button>
        <button v-if="uploadTab==='url'" :disabled="!urlInput || uploading"
          class="btn-green text-xs" @click="doUploadUrl">
          {{ uploading ? 'Adding…' : 'Add Image' }}
        </button>
        <button v-if="uploadTab==='drive'" :disabled="!driveInput || uploading"
          class="btn-green text-xs" @click="doUploadDrive">
          {{ uploading ? 'Saving…' : 'Save Drive Link' }}
        </button>
        <button class="btn-ghost text-xs" @click="uploadModal = false">Cancel</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAlertStore } from '@/stores/alertStore.js';
import AppModal from '@/components/common/AppModal.vue';
import api from '@/composables/useApi.js';

const alert        = useAlertStore();
const events       = ref([]);
const images       = ref([]);
const selectedEvent = ref('');
const uploadTab    = ref('file');
const urlInput     = ref('');
const urlCaption   = ref('');
const driveInput   = ref('');
const driveCaption = ref('');
const urlError     = ref(false);
const loading      = ref(false);
const uploadModal  = ref(false);
const uploading    = ref(false);
const filePreviews = ref([]);

onMounted(async () => {
  const { data } = await api.get('/events');
  events.value = data.data || [];
});

const load = async () => {
  if (!selectedEvent.value) { images.value = []; return; }
  loading.value = true;
  try {
    const { data } = await api.get(`/gallery/${selectedEvent.value}`);
    images.value = data.data || [];
  } finally { loading.value = false; }
};

const handleFiles = (e) => {
  [...e.target.files].forEach(f => {
    const reader = new FileReader();
    reader.onload = (ev) => filePreviews.value.push({ file: f, preview: ev.target.result, caption: '' });
    reader.readAsDataURL(f);
  });
};
const handleDrop = (e) => {
  const dt = e.dataTransfer;
  const event = { target: { files: dt.files } };
  handleFiles(event);
};

const doUploadUrl = async () => {
  if (!urlInput.value || !selectedEvent.value) return;
  uploading.value = true;
  try {
    await api.post(`/gallery/${selectedEvent.value}`, {
      image_url: urlInput.value,
      caption: urlCaption.value || null,
    });
    alert.success('Image added.'); uploadModal.value=false;
    urlInput.value=''; urlCaption.value=''; load();
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { uploading.value = false; }
};

const doUploadDrive = async () => {
  if (!driveInput.value || !selectedEvent.value) return;
  uploading.value = true;
  try {
    // Convert Google Drive share link to direct view URL if possible
    let imageUrl = driveInput.value;
    const match = driveInput.value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      imageUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    await api.post(`/gallery/${selectedEvent.value}`, {
      image_url: imageUrl,
      google_drive_id: match?.[1] || null,
      caption: driveCaption.value || null,
    });
    alert.success('Drive image linked.'); uploadModal.value=false;
    driveInput.value=''; driveCaption.value=''; load();
  } catch (e) { alert.error(e.response?.data?.message || 'Failed.'); }
  finally { uploading.value = false; }
};

const doUpload = async () => {
  uploading.value = true;
  try {
    const fd = new FormData();
    filePreviews.value.forEach(fp => {
      fd.append('images', fp.file);
      fd.append('captions', fp.caption);
    });
    await api.post(`/gallery/${selectedEvent.value}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    alert.success('Photos uploaded!'); filePreviews.value = []; uploadModal.value = false; load();
  } catch { alert.error('Upload failed.'); }
  finally { uploading.value = false; }
};

const deleteImage = async (id) => {
  if (!confirm('Delete this image?')) return;
  try { await api.delete(`/gallery/${id}`); alert.success('Deleted.'); load(); }
  catch { alert.error('Delete failed.'); }
};
</script>
