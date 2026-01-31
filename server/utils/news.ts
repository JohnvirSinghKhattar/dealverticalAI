export interface NewsItem {
  title: string
  description?: string
  url: string
  publishedAt: string
  source?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export async function fetchLocalNews(
  apiKey: string,
  cityOrRegion: string,
  limit: number = 10
): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    q: cityOrRegion,
    language: 'de',
    sortBy: 'publishedAt',
    pageSize: String(limit),
    apiKey,
  })
  const url = `https://newsapi.org/v2/everything?${params}`
  console.log('[NEWS] Fetching from NewsAPI:', url.replace(apiKey, 'API_KEY_HIDDEN'))
  const res = await fetch(url)
  if (!res.ok) {
    const errorText = await res.text()
    console.error('[NEWS] NewsAPI request failed:', res.status, errorText)
    return []
  }
  const data = (await res.json()) as {
    articles?: Array<{
      title: string
      description?: string
      url: string
      publishedAt: string
      source?: { name?: string }
    }>
  }
  const articles = data.articles ?? []
  return articles.map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    publishedAt: a.publishedAt,
    source: a.source?.name,
    sentiment: classifyHeadline(a.title),
  }))
}

function classifyHeadline(title: string): NewsItem['sentiment'] {
  const t = title.toLowerCase()
  const negative = ['vermisst', 'kriminalität', 'verbrechen', 'brand', 'unfall', 'tote', 'tötung']
  const positive = ['schule', 'neubau', 'eröffnung', 'investition', 'sanierung', 'park', 'infrastruktur']
  if (negative.some((w) => t.includes(w))) return 'negative'
  if (positive.some((w) => t.includes(w))) return 'positive'
  return 'neutral'
}
