<script setup lang="ts">
const file = ref<File | null>(null)
const uploading = ref(false)
const error = ref('')
const address = ref('')

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const f = target.files?.[0]
  if (!f) return
  if (f.type !== 'application/pdf') {
    error.value = 'Only PDF files are allowed.'
    return
  }
  if (f.size > 10 * 1024 * 1024) {
    error.value = 'File size must be 10 MB or less.'
    return
  }
  error.value = ''
  file.value = f
}

async function submit() {
  if (!file.value) {
    error.value = 'Please select a PDF file.'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('file', file.value)
    const res = await $fetch<{ id: number; filePath: string }>('/api/upload', {
      method: 'POST',
      body: form,
    })
    await $fetch(`/api/analyses/${res.id}/run`, {
      method: 'POST',
      body: address.value ? { address: address.value } : {},
    })
    await navigateTo(`/report/${res.id}`)
  } catch (e: unknown) {
    error.value = e && typeof e === 'object' && 'data' in e && typeof (e.data as { message?: string }).message === 'string'
      ? (e.data as { message: string }).message
      : 'Upload failed.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <h1 class="text-2xl font-bold text-gray-900">
      Upload Exposé
    </h1>
    <p class="mt-1 text-gray-600">
      Upload a PDF with address, text and images. Optionally enter the address for neighborhood news and context.
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium text-gray-700">Address (optional, for local news)</label>
        <input
          v-model="address"
          type="text"
          placeholder="e.g. Hamburg-Altona, Große Bergstraße 1"
          class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">PDF (Exposé)</label>
        <p class="text-xs text-slate-500">German property brochure / Exposé</p>
        <input
          type="file"
          accept="application/pdf"
          class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
          @change="onFileChange"
        />
        <p v-if="file" class="mt-1 text-sm text-gray-500">
          {{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
        </p>
      </div>

      <p v-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="uploading"
        class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {{ uploading ? 'Uploading…' : 'Upload and analyse' }}
      </button>
    </form>
  </div>
</template>
