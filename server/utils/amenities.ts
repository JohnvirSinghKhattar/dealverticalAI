const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

export interface Amenity {
  type: string
  name: string
  lat: number
  lon: number
  distance: number // in meters
  category: AmenityCategory
}

export type AmenityCategory = 
  | 'school'
  | 'grocery'
  | 'doctor'
  | 'pharmacy'
  | 'public_transport'
  | 'restaurant'
  | 'park'
  | 'bank'

export interface AmenitiesResult {
  schools: Amenity[]
  groceryStores: Amenity[]
  doctors: Amenity[]
  pharmacies: Amenity[]
  publicTransport: Amenity[]
  restaurants: Amenity[]
  parks: Amenity[]
  banks: Amenity[]
  fetchedAt: string
}

// Haversine formula to calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)
}

// Build Overpass QL query for nearby amenities
function buildOverpassQuery(lat: number, lon: number, radiusMeters: number = 2000): string {
  return `
[out:json][timeout:25];
(
  // Schools
  node["amenity"="school"](around:${radiusMeters},${lat},${lon});
  way["amenity"="school"](around:${radiusMeters},${lat},${lon});
  node["amenity"="kindergarten"](around:${radiusMeters},${lat},${lon});
  way["amenity"="kindergarten"](around:${radiusMeters},${lat},${lon});
  
  // Grocery stores / Supermarkets
  node["shop"="supermarket"](around:${radiusMeters},${lat},${lon});
  way["shop"="supermarket"](around:${radiusMeters},${lat},${lon});
  node["shop"="grocery"](around:${radiusMeters},${lat},${lon});
  node["shop"="convenience"](around:${radiusMeters},${lat},${lon});
  
  // Doctors / Clinics
  node["amenity"="doctors"](around:${radiusMeters},${lat},${lon});
  node["amenity"="clinic"](around:${radiusMeters},${lat},${lon});
  way["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
  
  // Pharmacies
  node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lon});
  
  // Public transport
  node["public_transport"="stop_position"](around:${radiusMeters},${lat},${lon});
  node["highway"="bus_stop"](around:${radiusMeters},${lat},${lon});
  node["railway"="station"](around:${radiusMeters},${lat},${lon});
  node["railway"="tram_stop"](around:${radiusMeters},${lat},${lon});
  node["station"="subway"](around:${radiusMeters},${lat},${lon});
  
  // Restaurants / Cafes
  node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
  node["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
  
  // Parks
  node["leisure"="park"](around:${radiusMeters},${lat},${lon});
  way["leisure"="park"](around:${radiusMeters},${lat},${lon});
  node["leisure"="playground"](around:${radiusMeters},${lat},${lon});
  
  // Banks / ATMs
  node["amenity"="bank"](around:${radiusMeters},${lat},${lon});
  node["amenity"="atm"](around:${radiusMeters},${lat},${lon});
);
out center;
`.trim()
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function categorizeElement(element: OverpassElement): AmenityCategory | null {
  const tags = element.tags || {}
  
  if (tags.amenity === 'school' || tags.amenity === 'kindergarten') return 'school'
  if (tags.shop === 'supermarket' || tags.shop === 'grocery' || tags.shop === 'convenience') return 'grocery'
  if (tags.amenity === 'doctors' || tags.amenity === 'clinic' || tags.amenity === 'hospital') return 'doctor'
  if (tags.amenity === 'pharmacy') return 'pharmacy'
  if (tags.public_transport || tags.highway === 'bus_stop' || tags.railway || tags.station) return 'public_transport'
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return 'restaurant'
  if (tags.leisure === 'park' || tags.leisure === 'playground') return 'park'
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return 'bank'
  
  return null
}

function getAmenityName(element: OverpassElement): string {
  const tags = element.tags || {}
  return tags.name || tags.operator || tags.brand || getDefaultName(element)
}

function getDefaultName(element: OverpassElement): string {
  const tags = element.tags || {}
  
  if (tags.amenity === 'school') return 'School'
  if (tags.amenity === 'kindergarten') return 'Kindergarten'
  if (tags.shop === 'supermarket') return 'Supermarket'
  if (tags.shop === 'grocery' || tags.shop === 'convenience') return 'Grocery Store'
  if (tags.amenity === 'doctors') return 'Doctor'
  if (tags.amenity === 'clinic') return 'Clinic'
  if (tags.amenity === 'hospital') return 'Hospital'
  if (tags.amenity === 'pharmacy') return 'Pharmacy'
  if (tags.highway === 'bus_stop') return 'Bus Stop'
  if (tags.railway === 'station') return 'Train Station'
  if (tags.railway === 'tram_stop') return 'Tram Stop'
  if (tags.station === 'subway') return 'Subway Station'
  if (tags.public_transport) return 'Public Transport Stop'
  if (tags.amenity === 'restaurant') return 'Restaurant'
  if (tags.amenity === 'cafe') return 'Café'
  if (tags.leisure === 'park') return 'Park'
  if (tags.leisure === 'playground') return 'Playground'
  if (tags.amenity === 'bank') return 'Bank'
  if (tags.amenity === 'atm') return 'ATM'
  
  return 'Unknown'
}

function getAmenityType(element: OverpassElement): string {
  const tags = element.tags || {}
  
  if (tags.amenity) return tags.amenity
  if (tags.shop) return tags.shop
  if (tags.leisure) return tags.leisure
  if (tags.railway) return tags.railway
  if (tags.highway) return tags.highway
  if (tags.public_transport) return tags.public_transport
  
  return 'unknown'
}

export async function fetchNearbyAmenities(
  lat: number,
  lon: number,
  radiusMeters: number = 2000
): Promise<AmenitiesResult> {
  const query = buildOverpassQuery(lat, lon, radiusMeters)
  
  console.log('[AMENITIES] Fetching amenities for coordinates:', lat, lon, 'radius:', radiusMeters)
  
  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[AMENITIES] Overpass API error:', response.status, errorText)
    throw new Error(`Overpass API request failed: ${response.status}`)
  }
  
  const data = await response.json() as { elements: OverpassElement[] }
  const elements = data.elements || []
  
  console.log('[AMENITIES] Received', elements.length, 'elements from Overpass API')
  
  const result: AmenitiesResult = {
    schools: [],
    groceryStores: [],
    doctors: [],
    pharmacies: [],
    publicTransport: [],
    restaurants: [],
    parks: [],
    banks: [],
    fetchedAt: new Date().toISOString(),
  }
  
  for (const element of elements) {
    const category = categorizeElement(element)
    if (!category) continue
    
    // Get coordinates (ways have center, nodes have lat/lon directly)
    const elementLat = element.lat ?? element.center?.lat
    const elementLon = element.lon ?? element.center?.lon
    
    if (elementLat === undefined || elementLon === undefined) continue
    
    const amenity: Amenity = {
      type: getAmenityType(element),
      name: getAmenityName(element),
      lat: elementLat,
      lon: elementLon,
      distance: calculateDistance(lat, lon, elementLat, elementLon),
      category,
    }
    
    // Add to appropriate category array
    switch (category) {
      case 'school':
        result.schools.push(amenity)
        break
      case 'grocery':
        result.groceryStores.push(amenity)
        break
      case 'doctor':
        result.doctors.push(amenity)
        break
      case 'pharmacy':
        result.pharmacies.push(amenity)
        break
      case 'public_transport':
        result.publicTransport.push(amenity)
        break
      case 'restaurant':
        result.restaurants.push(amenity)
        break
      case 'park':
        result.parks.push(amenity)
        break
      case 'bank':
        result.banks.push(amenity)
        break
    }
  }
  
  // Sort each category by distance and limit results
  const sortAndLimit = (arr: Amenity[], limit: number = 5) => 
    arr.sort((a, b) => a.distance - b.distance).slice(0, limit)
  
  result.schools = sortAndLimit(result.schools)
  result.groceryStores = sortAndLimit(result.groceryStores)
  result.doctors = sortAndLimit(result.doctors)
  result.pharmacies = sortAndLimit(result.pharmacies)
  result.publicTransport = sortAndLimit(result.publicTransport, 10) // More transport options
  result.restaurants = sortAndLimit(result.restaurants, 10)
  result.parks = sortAndLimit(result.parks)
  result.banks = sortAndLimit(result.banks)
  
  console.log('[AMENITIES] Processed amenities:', {
    schools: result.schools.length,
    groceryStores: result.groceryStores.length,
    doctors: result.doctors.length,
    pharmacies: result.pharmacies.length,
    publicTransport: result.publicTransport.length,
    restaurants: result.restaurants.length,
    parks: result.parks.length,
    banks: result.banks.length,
  })
  
  return result
}

// Helper to get a summary of nearest amenities for display
export function getAmenitiesSummary(amenities: AmenitiesResult): {
  nearestSchool: number | null
  nearestGrocery: number | null
  nearestDoctor: number | null
  nearestPharmacy: number | null
  nearestTransport: number | null
  nearestPark: number | null
} {
  return {
    nearestSchool: amenities.schools[0]?.distance ?? null,
    nearestGrocery: amenities.groceryStores[0]?.distance ?? null,
    nearestDoctor: amenities.doctors[0]?.distance ?? null,
    nearestPharmacy: amenities.pharmacies[0]?.distance ?? null,
    nearestTransport: amenities.publicTransport[0]?.distance ?? null,
    nearestPark: amenities.parks[0]?.distance ?? null,
  }
}
