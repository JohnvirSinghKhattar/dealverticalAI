<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
    <header class="sticky top-0 z-50 border-b border-white/20 bg-blue-600/90 backdrop-blur-md">
      <div class="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="flex items-center gap-2 group">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span class="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">DealVertical AI</span>
          </NuxtLink>
          <span class="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 border border-white/20">
            <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            German Market
          </span>
        </div>
        <nav class="flex items-center gap-2">
          <NuxtLink 
            to="/dashboard" 
            class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="hidden sm:inline">My Analyses</span>
          </NuxtLink>
          <NuxtLink 
            to="/upload" 
            class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-md hover:bg-blue-50 hover:shadow-lg transition-all"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span class="hidden sm:inline">Upload</span>
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main class="container mx-auto px-4 py-12 lg:px-8">
      <slot />
    </main>
    <footer class="border-t border-white/20 bg-blue-600/50 backdrop-blur-sm mt-20">
      <div class="container mx-auto px-4 py-8 lg:px-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm text-white/70">
            <svg class="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="font-semibold text-white">DealVertical AI</span>
            <span class="text-white/40">·</span>
            <span>AI-Powered Property Analysis</span>
          </div>
          <p class="text-sm text-white/60">
            Specialized for the German real estate market
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
