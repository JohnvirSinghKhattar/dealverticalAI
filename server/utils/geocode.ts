const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
  address?: {
    city?: string
    town?: string
    village?: string
    postcode?: string
    state?: string
    country?: string
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
  })
  const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: { 'User-Agent': 'DealVerticalAI/1.0' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{
    lat: string
    lon: string
    display_name: string
    address?: Record<string, string>
  }>
  if (!data?.length) return null
  const first = data[0]
  return {
    lat: Number(first.lat),
    lon: Number(first.lon),
    displayName: first.display_name,
    address: first.address as GeocodeResult['address'],
  }
}

export function getCityFromGeocode(geo: GeocodeResult): string {
  const a = geo.address
  return a?.city ?? a?.town ?? a?.village ?? ''
}

export function extractPostcode(address: string, geo?: GeocodeResult | null): string {
  // Try to get postcode from geocode result first
  if (geo?.address?.postcode) {
    return geo.address.postcode
  }
  
  // Fallback: extract German postcode (5 digits) from address string
  const postcodeMatch = address.match(/\b(\d{5})\b/)
  return postcodeMatch ? postcodeMatch[1] : ''
}
