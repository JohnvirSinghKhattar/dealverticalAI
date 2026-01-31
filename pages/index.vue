<template>
  <div class="mx-auto max-w-2xl text-center">
    <h1 class="text-3xl font-bold tracking-tight">
      DealVertical AI
    </h1>
    <p class="mt-2 text-gray-600">
      Upload a German real estate Exposé (PDF) and get institutional-style analysis: financials, pros & cons, and neighborhood intel.
    </p>
    <p class="mt-1 text-sm text-slate-500">
      Specialized for the German market — German Exposés, local news and data.
    </p>
    <div class="mt-8 flex justify-center gap-4">
      <NuxtLink
        to="/upload"
        class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Upload Exposé
      </NuxtLink>
      <NuxtLink
        to="/dashboard"
        class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        My analyses
      </NuxtLink>
    </div>
  </div>
</template>
