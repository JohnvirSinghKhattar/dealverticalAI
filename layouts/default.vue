<template>
  <div class="min-h-screen bg-gray-50">
    <header class="border-b border-gray-200 bg-white">
      <div class="container mx-auto flex h-14 items-center px-4">
        <NuxtLink to="/" class="font-semibold text-gray-900">DealVertical AI</NuxtLink>
        <span class="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          Specialized for the German market
        </span>
        <nav class="ml-auto flex gap-4">
          <NuxtLink to="/dashboard" class="text-gray-600 hover:text-gray-900">My analyses</NuxtLink>
          <NuxtLink to="/upload" class="text-gray-600 hover:text-gray-900">Upload Exposé</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>
