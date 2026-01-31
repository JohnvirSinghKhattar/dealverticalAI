<script setup lang="ts">
interface AnalysisRow {
  id: number
  address: string | null
  status: string
  createdAt: string | null
}

const { data: analyses, error, refresh } = await useFetch<AnalysisRow[]>('/api/analyses')

const deletingId = ref<number | null>(null)
const showDeleteModal = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetAddress = ref<string | null>(null)

function openDeleteModal(id: number, address: string | null, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  deleteTargetId.value = id
  deleteTargetAddress.value = address
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteTargetId.value = null
  deleteTargetAddress.value = null
}

async function confirmDelete() {
  if (!deleteTargetId.value) return
  
  deletingId.value = deleteTargetId.value
  try {
    await $fetch(`/api/analyses/${deleteTargetId.value}`, { method: 'DELETE' })
    await refresh()
    closeDeleteModal()
  } catch (err) {
    console.error('Failed to delete analysis:', err)
    alert('Failed to delete analysis. Please try again.')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white">
          My Analyses
        </h1>
        <p class="mt-2 text-blue-100">
          View all your property analyses and their current status
        </p>
      </div>
      <NuxtLink
        to="/upload"
        class="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Analysis
      </NuxtLink>
    </div>

    <div v-if="error" class="mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
      <div class="flex items-start gap-3">
        <svg class="h-5 w-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-semibold text-red-800">Unable to load analyses</p>
          <p class="text-sm text-red-700 mt-1">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    </div>

    <div v-else-if="analyses?.length" class="mt-6 grid gap-4">
      <NuxtLink
        v-for="a in analyses"
        :key="a.id"
        :to="`/report/${a.id}`"
        class="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
      >
        <div class="flex items-start gap-4 flex-1">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {{ a.address || `Property Analysis #${a.id}` }}
            </h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date unavailable' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            :class="{
              'bg-amber-100 text-amber-800': a.status === 'uploaded' || a.status === 'processing',
              'bg-green-100 text-green-800': a.status === 'completed',
              'bg-red-100 text-red-800': a.status === 'failed',
            }"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="{
                'bg-amber-600 animate-pulse': a.status === 'uploaded' || a.status === 'processing',
                'bg-green-600': a.status === 'completed',
                'bg-red-600': a.status === 'failed',
              }"
            ></span>
            {{ a.status === 'uploaded' ? 'Uploaded' : a.status === 'processing' ? 'Processing' : a.status === 'completed' ? 'Completed' : 'Failed' }}
          </span>
          <button
            @click="openDeleteModal(a.id, a.address, $event)"
            :disabled="deletingId === a.id"
            class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete analysis"
          >
            <svg v-if="deletingId === a.id" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="mt-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-white mb-2">No analyses yet</h3>
      <p class="text-blue-100 mb-6">Get started by uploading your first property exposé</p>
      <NuxtLink
        to="/upload"
        class="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Your First Exposé
      </NuxtLink>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          @click="closeDeleteModal"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showDeleteModal"
              class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              @click.stop
            >
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2">
                    Delete Analysis
                  </h3>
                  <p class="text-sm text-gray-600 mb-1">
                    Are you sure you want to delete this analysis?
                  </p>
                  <p v-if="deleteTargetAddress" class="text-sm font-medium text-gray-900 mb-3">
                    {{ deleteTargetAddress }}
                  </p>
                  <p class="text-sm text-gray-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3 mt-6">
                <button
                  @click="closeDeleteModal"
                  class="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="confirmDelete"
                  :disabled="deletingId !== null"
                  class="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="deletingId === deleteTargetId" class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                  <span v-else>Delete</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
