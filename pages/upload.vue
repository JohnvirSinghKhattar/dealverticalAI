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
  if (f.size > 80 * 1024 * 1024) {
    error.value = 'File size must be 80 MB or less.'
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
    const res = await $fetch<{ id: number; fileName: string }>('/api/upload', {
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
  <div class="mx-auto max-w-2xl">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white">
        Upload Property Exposé
      </h1>
      <p class="mt-3 text-blue-100">
        Upload your German property exposé (PDF) to receive a comprehensive AI-powered analysis. Optionally provide the property address for enhanced neighborhood insights.
      </p>
    </div>

    <!-- Sample Data Section -->
    <div class="mb-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-5">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-white mb-1">First time? Try with sample data</h3>
          <p class="text-xs text-blue-100 mb-3">Download our sample exposé PDF and use the sample address to see how the analysis works.</p>
          <div class="flex flex-wrap gap-2">
            <a 
              href="/SAMPLE-EXPOSE.pdf" 
              download="SAMPLE-EXPOSE.pdf"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-white/50 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample PDF
            </a>
            <button 
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-white/50 rounded-lg hover:bg-indigo-50 transition-colors"
              @click="address = 'Finkenschlag 13-15, 21109 Hamburg'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use Sample Address
            </button>
          </div>
        </div>
      </div>
    </div>

    <form class="mt-8 space-y-6 bg-white rounded-xl border border-gray-200 shadow-sm p-8" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-semibold text-gray-900 mb-2">
          Property Address
          <span class="text-gray-500 font-normal">(Optional)</span>
        </label>
        <p class="text-xs text-gray-500 mb-2">Provide the address to include local news and neighborhood insights in your analysis</p>
        <input
          v-model="address"
          type="text"
          placeholder="e.g. Große Bergstraße 1, 22767 Hamburg"
          class="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-900 mb-2">
          Property Exposé (PDF)
          <span class="text-red-500">*</span>
        </label>
        <p class="text-xs text-gray-500 mb-3">Upload your German property brochure or exposé document (max 50 MB)</p>
        <div class="relative">
          <input
            type="file"
            accept="application/pdf"
            class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-6 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 file:transition-colors cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors"
            @change="onFileChange"
          />
        </div>
        <div v-if="file" class="mt-3 flex items-center gap-2 text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
          <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="font-medium">{{ file.name }}</span>
          <span class="text-gray-500">({{ (file.size / 1024).toFixed(1) }} KB)</span>
        </div>
      </div>

      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4">
        <div class="flex items-start gap-3">
          <svg class="h-5 w-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-red-800 font-medium">{{ error }}</p>
        </div>
      </div>

      <button
        type="submit"
        :disabled="uploading || !file"
        class="w-full rounded-lg bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl flex items-center justify-center gap-2"
      >
        <svg v-if="uploading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {{ uploading ? 'Analyzing Your Property...' : 'Start Analysis' }}
      </button>
      
      <p class="text-xs text-center text-gray-500">
        Your document will be analyzed using AI to extract financial data, investment insights, and neighborhood information
      </p>
    </form>
  </div>
</template>
