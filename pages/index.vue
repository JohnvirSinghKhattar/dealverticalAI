<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <div class="text-center max-w-4xl mx-auto">
      <div class="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white/90 mb-8 border border-white/20">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI-Powered Real Estate Analysis
      </div>
      
      <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
        Professional Property Analysis
        <span class="block text-blue-200 mt-3">in Seconds</span>
      </h1>
      
      <p class="mt-6 text-lg md:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
        Upload your German property exposé and receive institutional-grade analysis including financial metrics, investment pros & cons, and comprehensive neighborhood insights.
      </p>
      
      <p class="mt-3 text-sm text-blue-200/80">
        Specialized for the German real estate market with local data integration
      </p>
      
      <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <NuxtLink
          to="/upload"
          class="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all hover:shadow-xl hover:scale-105"
        >
          <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Start Analysis
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="inline-flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-all hover:border-white/50"
        >
          <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View My Analyses
        </NuxtLink>
      </div>
    </div>

    <!-- USPs Section -->
    <div class="mt-24 max-w-3xl mx-auto">
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 md:p-10">
        <h2 class="text-2xl font-bold text-white mb-8 text-center">What You Get</h2>
        
        <ul class="space-y-6">
          <li class="flex items-start gap-4">
            <div class="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center mt-0.5">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white mb-1">Instant Financial Analysis</h3>
              <p class="text-blue-100/90">Complete breakdown of purchase price, acquisition costs, rental yields, and key investment metrics — calculated in seconds.</p>
            </div>
          </li>
          
          <li class="flex items-start gap-4">
            <div class="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center mt-0.5">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white mb-1">Smart Investment Assessment</h3>
              <p class="text-blue-100/90">AI-powered pros and cons analysis with risk evaluation to help you make informed investment decisions.</p>
            </div>
          </li>
          
          <li class="flex items-start gap-4">
            <div class="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center mt-0.5">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white mb-1">Neighborhood Intelligence</h3>
              <p class="text-blue-100/90">Local news, market trends, and area insights to fully understand the property's location context.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 0;
}
</style>
