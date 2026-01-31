<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: analysis, error, refresh } = await useFetch(() => `/api/analyses/${id.value}`, {
  default: () => null,
})

const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)
onMounted(() => {
  if (analysis.value?.status === 'processing') {
    pollInterval.value = setInterval(async () => {
      await refresh()
      if (analysis.value?.status === 'completed') {
        if (pollInterval.value) clearInterval(pollInterval.value)
      }
    }, 4000)
  }
})
onUnmounted(() => {
  if (pollInterval.value) clearInterval(pollInterval.value)
})

const result = computed(() => {
  const a = analysis.value
  if (!a?.resultJson) return null
  return typeof a.resultJson === 'object' ? a.resultJson : (a.resultJson as unknown)
})
const neighborhood = computed(() => {
  const a = analysis.value
  if (!a?.neighborhoodJson) return null
  return typeof a.neighborhoodJson === 'object' ? a.neighborhoodJson : (a.neighborhoodJson as unknown)
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <NuxtLink to="/dashboard" class="text-sm text-blue-600 hover:underline">
      ← Back to My analyses
    </NuxtLink>

    <div v-if="error" class="mt-4 rounded-md bg-red-50 p-4 text-red-700">
      Analysis not found.
    </div>

    <template v-else-if="analysis">
      <h1 class="mt-4 text-2xl font-bold text-gray-900">
        {{ analysis.address || `Exposé #${analysis.id}` }}
      </h1>
      <p class="text-sm text-gray-500">
        {{ analysis.createdAt ? new Date(analysis.createdAt).toLocaleString('en-GB') : '' }}
        · Status: {{ analysis.status }}
      </p>

      <div v-if="analysis.status === 'processing'" class="mt-8 rounded-lg border border-gray-200 bg-amber-50 p-6 text-center">
        <p class="font-medium text-amber-800">
          Analysis in progress… (processing your PDF)
        </p>
        <p class="mt-1 text-sm text-amber-700">
          This page will refresh automatically, or reload in a few seconds.
        </p>
      </div>

      <template v-else-if="analysis.status === 'completed'">
        <section v-if="result?.summary" class="mt-8">
          <h2 class="text-lg font-semibold text-gray-900">
            Financials, pros & cons, risks
          </h2>
          <div class="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-gray-700">
            {{ result.summary }}
          </div>
        </section>

        <section v-else-if="result" class="mt-8">
          <h2 class="text-lg font-semibold text-gray-900">
            Analysis
          </h2>
          <div class="mt-2 rounded-lg border border-gray-200 bg-white p-4 text-gray-700">
            <pre class="whitespace-pre-wrap text-sm">{{ JSON.stringify(result, null, 2) }}</pre>
          </div>
        </section>

        <section v-if="neighborhood?.news?.length" class="mt-8">
          <h2 class="text-lg font-semibold text-gray-900">
            Local news (neighborhood)
          </h2>
          <p v-if="neighborhood.address" class="text-sm text-gray-500">
            Address: {{ neighborhood.address }}
          </p>
          <ul class="mt-2 space-y-2">
            <li
              v-for="(n, i) in neighborhood.news"
              :key="i"
              class="rounded-md border border-gray-200 bg-white p-3"
            >
              <a :href="n.url" target="_blank" rel="noopener" class="font-medium text-blue-600 hover:underline">
                {{ n.title }}
              </a>
              <span
                v-if="n.sentiment"
                class="ml-2 rounded px-1.5 py-0.5 text-xs"
                :class="{
                  'bg-green-100 text-green-800': n.sentiment === 'positive',
                  'bg-red-100 text-red-800': n.sentiment === 'negative',
                  'bg-gray-100 text-gray-700': n.sentiment === 'neutral',
                }"
              >
                {{ n.sentiment }}
              </span>
              <p class="text-xs text-gray-500">
                {{ n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('en-GB') : '' }}
              </p>
            </li>
          </ul>
        </section>

        <p v-if="!result && !neighborhood?.news?.length" class="mt-8 text-gray-500">
          No result data available.
        </p>
      </template>

      <div v-else-if="analysis.status === 'failed'" class="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        Analysis failed. Please try again or upload a different PDF.
      </div>
    </template>
  </div>
</template>
