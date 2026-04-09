// Free business finder using OpenStreetMap Overpass API + Nominatim
// No API keys needed, no rate limits issues

interface Place {
  name: string
  website: string
  phone: string
  address: string
  category: string
  lat: number
  lng: number
}

// Step 1: Geocode query to lat/lng using Nominatim
async function geocode(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'CustomationLeadMachine/1.0' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display: data[0].display_name,
      }
    }
  } catch (err) {
    console.error('Geocode error:', err)
  }
  return null
}

// Step 2: Find businesses via Overpass API
async function findBusinessesOverpass(
  lat: number,
  lng: number,
  category: string,
  radiusMeters: number = 5000
): Promise<Place[]> {
  const places: Place[] = []

  // Map common search terms to OSM tags
  const categoryTags = getCategoryTags(category)

  const query = `
    [out:json][timeout:25];
    (
      ${categoryTags.map(tag => `node${tag}(around:${radiusMeters},${lat},${lng});`).join('\n      ')}
      ${categoryTags.map(tag => `way${tag}(around:${radiusMeters},${lat},${lng});`).join('\n      ')}
    );
    out body 50;
  `

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })
    const data = await res.json()

    if (data.elements) {
      for (const el of data.elements) {
        const tags = el.tags || {}
        const name = tags.name || tags['name:en'] || ''
        if (!name) continue

        let website = tags.website || tags['contact:website'] || tags.url || ''
        if (website && !website.startsWith('http')) website = 'https://' + website

        const phone = tags.phone || tags['contact:phone'] || ''
        const street = tags['addr:street'] || ''
        const city = tags['addr:city'] || ''
        const address = [street, city].filter(Boolean).join(', ')

        places.push({
          name,
          website,
          phone,
          address,
          category,
          lat: el.lat || el.center?.lat || lat,
          lng: el.lon || el.center?.lon || lng,
        })
      }
    }
  } catch (err) {
    console.error('Overpass error:', err)
  }

  return places
}

function getCategoryTags(category: string): string[] {
  const lower = category.toLowerCase()

  const mapping: Record<string, string[]> = {
    restaurant: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
    restaurants: ['["amenity"="restaurant"]', '["amenity"="fast_food"]', '["amenity"="cafe"]'],
    salon: ['["shop"="hairdresser"]', '["shop"="beauty"]', '["amenity"="beauty"]'],
    salons: ['["shop"="hairdresser"]', '["shop"="beauty"]', '["amenity"="beauty"]'],
    dentist: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
    dentists: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
    gym: ['["leisure"="fitness_centre"]', '["amenity"="gym"]', '["leisure"="sports_centre"]'],
    gyms: ['["leisure"="fitness_centre"]', '["amenity"="gym"]', '["leisure"="sports_centre"]'],
    hotel: ['["tourism"="hotel"]', '["tourism"="motel"]', '["tourism"="guest_house"]'],
    hotels: ['["tourism"="hotel"]', '["tourism"="motel"]', '["tourism"="guest_house"]'],
    clinic: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["healthcare"="clinic"]'],
    clinics: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["healthcare"="clinic"]'],
    school: ['["amenity"="school"]', '["amenity"="college"]', '["amenity"="university"]'],
    schools: ['["amenity"="school"]', '["amenity"="college"]', '["amenity"="university"]'],
    shop: ['["shop"~"."]'],
    shops: ['["shop"~"."]'],
    hospital: ['["amenity"="hospital"]', '["healthcare"="hospital"]'],
    hospitals: ['["amenity"="hospital"]', '["healthcare"="hospital"]'],
    pharmacy: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]'],
    pharmacies: ['["amenity"="pharmacy"]', '["healthcare"="pharmacy"]'],
    bank: ['["amenity"="bank"]'],
    banks: ['["amenity"="bank"]'],
    startup: ['["office"~"."]', '["amenity"="coworking_space"]'],
    startups: ['["office"~"."]', '["amenity"="coworking_space"]'],
    agency: ['["office"~"."]', '["shop"="computer"]'],
    agencies: ['["office"~"."]', '["shop"="computer"]'],
    store: ['["shop"~"."]'],
    stores: ['["shop"~"."]'],
    bakery: ['["shop"="bakery"]', '["amenity"="bakery"]'],
    bakeries: ['["shop"="bakery"]', '["amenity"="bakery"]'],
    car: ['["shop"="car"]', '["shop"="car_repair"]', '["amenity"="car_rental"]'],
  }

  // Try exact match first
  if (mapping[lower]) return mapping[lower]

  // Try partial match
  for (const [key, tags] of Object.entries(mapping)) {
    if (lower.includes(key) || key.includes(lower)) return tags
  }

  // Default: search all commercial/business
  return ['["shop"~"."]', '["amenity"="restaurant"]', '["office"~"."]', '["tourism"~"."]']
}

// Main function: search for businesses
export async function findPlaces(query: string, userLat?: number, userLng?: number): Promise<{
  places: Place[]
  location: { lat: number; lng: number; display: string } | null
}> {
  // Parse query: "restaurants karachi" → category="restaurants", location="karachi"
  const parts = query.trim().split(/\s+/)
  let category = parts[0] || 'business'
  let locationQuery = parts.slice(1).join(' ')

  // If query is just a location, search all businesses
  if (!locationQuery && !getCategoryTags(category).length) {
    locationQuery = query
    category = 'business'
  }

  let lat: number
  let lng: number
  let display = ''

  if (locationQuery) {
    const geo = await geocode(locationQuery)
    if (geo) {
      lat = geo.lat
      lng = geo.lng
      display = geo.display
    } else if (userLat && userLng) {
      lat = userLat
      lng = userLng
      display = 'Near you'
    } else {
      return { places: [], location: null }
    }
  } else if (userLat && userLng) {
    lat = userLat
    lng = userLng
    display = 'Near you'
  } else {
    // Default to a known city if no location
    const geo = await geocode(query)
    if (geo) {
      lat = geo.lat
      lng = geo.lng
      display = geo.display
    } else {
      return { places: [], location: null }
    }
  }

  const places = await findBusinessesOverpass(lat, lng, category, 5000)

  // Sort: businesses with websites first
  places.sort((a, b) => {
    if (a.website && !b.website) return -1
    if (!a.website && b.website) return 1
    return 0
  })

  return {
    places: places.slice(0, 30),
    location: { lat, lng, display },
  }
}
