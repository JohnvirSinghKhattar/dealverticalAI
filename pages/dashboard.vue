<script setup lang="ts">
interface AnalysisRow {
  id: number
  address: string | null
  status: string
  createdAt: string | null
}

const { data: analyses, error } = await useFetch<AnalysisRow[]>('/api/analyses')
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-bold text-gray-900">
      My analyses
    </h1>
    <p class="mt-1 text-gray-600">
      All uploaded Exposés and their status.
    </p>

    <div v-if="error" class="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
      Error loading analyses.
    </div>

    <ul v-else-if="analyses?.length" class="mt-6 space-y-3">
      <li
        v-for="a in analyses"
        :key="a.id"
        class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div>
          <NuxtLink :to="`/report/${a.id}`" class="font-medium text-blue-600 hover:underline">
            {{ a.address || `Exposé #${a.id}` }}
          </NuxtLink>
          <p class="text-sm text-gray-500">
            {{ a.createdAt ? new Date(a.createdAt).toLocaleString('en-GB') : '' }}
          </p>
        </div>
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-medium"
          :class="{
            'bg-yellow-100 text-yellow-800': a.status === 'uploaded' || a.status === 'processing',
            'bg-green-100 text-green-800': a.status === 'completed',
            'bg-red-100 text-red-800': a.status === 'failed',
          }"
        >
          {{ a.status }}
        </span>
      </li>
    </ul>

    <p v-else class="mt-6 text-gray-500">
      No analyses yet. <NuxtLink to="/upload" class="text-blue-600 hover:underline">Upload Exposé</NuxtLink>.
    </p>
  </div>
</template>
