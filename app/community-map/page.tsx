'use client'

import { useEffect, useRef, useState } from 'react'

const LOCATIONS = [
  // --- Gyms ---
  { name: 'Planet Fitness – Downtown Brooklyn', lat: 40.68951, lng: -73.99075, cat: 'gym', note: 'High foot traffic anchor. Survey gym-goers as GAWA Loop users.' },
  { name: 'Planet Fitness – Bay Ridge', lat: 40.62237, lng: -74.02715, cat: 'gym', note: 'Dense residential population. Strong demand potential.' },
  { name: 'Planet Fitness – Sunset Park', lat: 40.64629, lng: -74.00954, cat: 'gym', note: 'Working-class neighborhood — strong free food demand.' },
  { name: 'Planet Fitness – Flatbush Ave', lat: 40.66230, lng: -73.96127, cat: 'gym', note: 'Highly trafficked. Large diverse community nearby.' },
  { name: 'Planet Fitness – East New York', lat: 40.66977, lng: -73.85878, cat: 'gym', note: 'Underserved area — priority zone for GAWA Loop.' },
  // --- Religious ---
  { name: 'Brooklyn Islamic Center', lat: 40.64550, lng: -73.97244, cat: 'religious', note: 'Community hub. Great partner for Ramadan outreach.' },
  { name: 'Masjid At-Taqwa – Bed-Stuy', lat: 40.68046, lng: -73.95353, cat: 'religious', note: 'Large congregation 5am–10pm daily. Strong community network.' },
  { name: 'Al-Farooq Mosque', lat: 40.68464, lng: -73.97951, cat: 'religious', note: 'Central Brooklyn, walkable to Atlantic Ave restaurants.' },
  { name: 'MCC Muslim Community Center', lat: 40.64602, lng: -74.01691, cat: 'religious', note: 'Rated 4.9 stars. Very active programs — ideal GAWA Loop partner.' },
  { name: 'Brooklyn Tabernacle', lat: 40.69079, lng: -73.98741, cat: 'religious', note: 'Massive congregation. Multiple Sunday services.' },
  { name: 'Basilica of Our Lady', lat: 40.63959, lng: -74.01554, cat: 'religious', note: 'Large Catholic community in Sunset Park / Bay Ridge.' },
  { name: 'Saint Augustine Church – Park Slope', lat: 40.67845, lng: -73.97649, cat: 'religious', note: 'Active parish with well-attended Sunday masses.' },
  // --- Schools ---
  { name: 'PS 146 – Carroll Gardens', lat: 40.67913, lng: -74.00192, cat: 'school', note: 'Families with kids — strong household demand.' },
  { name: 'PS 282 – Park Slope', lat: 40.67656, lng: -73.97762, cat: 'school', note: 'Survey parents at afternoon pickup time.' },
  { name: 'PS 8 – Brooklyn Heights', lat: 40.70072, lng: -73.99297, cat: 'school', note: 'Near Downtown Brooklyn cluster.' },
  { name: 'Brooklyn Gardens Elementary – East NY', lat: 40.66557, lng: -73.89771, cat: 'school', note: 'Low-income area — priority zone for GAWA Loop.' },
  // --- Food Donors (50 owner-operated) ---
  // Original 12
  { name: 'Green Valley Market – Bushwick', lat: 40.70215, lng: -73.92466, cat: 'food', note: '4.9 stars. Owner on-site daily. Gave free grapes at checkout. Will say yes. Best time: morning (8–10am).' },
  { name: 'Lindenwood Diner – East New York', lat: 40.66985, lng: -73.85746, cat: 'food', note: 'Family-run. Manager present daily. Right next to Planet Fitness. Best time: late morning (10–11am).' },
  { name: 'al Badawi – Atlantic Ave', lat: 40.69064, lng: -73.99500, cat: 'food', note: 'Owner-operated Palestinian restaurant. High values alignment with GAWA Loop. Best time: afternoon (2–4pm).' },
  { name: "gertrude's – Prospect Heights", lat: 40.67904, lng: -73.97154, cat: 'food', note: 'Independent bistro. Owner-chef model. Seasonal menu = regular surplus. Best time: before dinner (3–4pm).' },
  { name: 'Peaches Prime – Fort Greene', lat: 40.68786, lng: -73.97887, cat: 'food', note: 'Local owner reachable. Closed Mondays. Best time: Tue/Wed morning before service.' },
  { name: 'SUKH Thai – Fort Greene', lat: 40.68725, lng: -73.97637, cat: 'food', note: 'Owner-chef model. 4.8 stars. Best time: lunch gap (3:30–5pm).' },
  { name: 'Baked In Brooklyn – Sunset Park', lat: 40.65887, lng: -73.99631, cat: 'food', note: 'Local bakery. Owner present. Predictable end-of-day surplus. Best time: late afternoon (5–6pm).' },
  { name: 'Brooklyn Bread Cafe – Park Slope', lat: 40.66630, lng: -73.98184, cat: 'food', note: 'Closes 5:45pm. Daily surplus of bagels and pastries. Best time: closing time (~5pm).' },
  { name: 'Bakeri – Williamsburg', lat: 40.72002, lng: -73.96012, cat: 'food', note: 'Eco-conscious owner. Uses real mugs/plates to cut waste. Best time: mid-morning (9–11am).' },
  { name: 'Fine Fare – Crown Heights', lat: 40.67075, lng: -73.94191, cat: 'food', note: 'Community supermarket, recently reopened. Local owner. Best time: morning (9–11am).' },
  { name: 'Aksaray Turkish – Midwood', lat: 40.60993, lng: -73.95777, cat: 'food', note: 'Open 24hrs, family-run. Enormous menu = daily surplus. Best time: mid-afternoon (2–4pm).' },
  { name: 'City Fresh Market – Bushwick', lat: 40.70297, lng: -73.92551, cat: 'food', note: 'Independent 24-hr grocery. Owner usually in store mornings. Best time: morning (8–10am).' },
  // New additions 13–20 (previous batch)
  { name: 'BKB Brooklyn Brasserie – Bed-Stuy', lat: 40.68325, lng: -73.93187, cat: 'food', note: '4.9 stars. Owner Luis known to be present. Belgian-inspired, daily prep surplus. Best time: before opening (3:30–4pm).' },
  { name: 'BKLYN BLEND – Bed-Stuy', lat: 40.69235, lng: -73.94589, cat: 'food', note: '4.7 stars. Owner Pablo visibly on-site. Closes 6pm — predictable daily surplus. Best time: mid-morning (9–10am).' },
  { name: 'Brooklyn Artisan Bakehouse – Crown Heights', lat: 40.66408, lng: -73.94022, cat: 'food', note: '4.4 stars. Independent kosher bakery/cafe. Open 8am–9pm. Lots of baked goods daily. Best time: late afternoon (4–5pm).' },
  { name: 'Bottega Social Club – Crown Heights', lat: 40.66897, lng: -73.95325, cat: 'food', note: '4.8 stars. Owner-chef model. Closes 4pm daily = predictable sandwich and pastry surplus. Best time: just before closing (3:30pm).' },
  { name: 'Risbo – Flatbush', lat: 40.65606, lng: -73.95979, cat: 'food', note: '4.5 stars. Independent Franco-Caribbean cafe and rotisserie. Best time: lunch gap (3–5pm).' },
  { name: 'MangoSeed – Flatbush', lat: 40.65452, lng: -73.95941, cat: 'food', note: '4.4 stars. Independent Caribbean restaurant. Closed Mondays. Best time: Tue morning before service.' },
  { name: 'Hole In The Wall – Williamsburg', lat: 40.71442, lng: -73.96155, cat: 'food', note: '4.8 stars. Independent Australian-style brunch cafe. High volume. Best time: mid-morning (9–10am).' },
  { name: 'Habib1deli – Flatbush', lat: 40.65798, lng: -73.96003, cat: 'food', note: '4.8 stars. Owner Ali is the face of this family deli. Lives in the neighborhood. Best time: morning (7–9am).' },
  // New additions 21–50
  { name: 'Zona Sur – Sunset Park', lat: 40.65024, lng: -74.00905, cat: 'food', note: '4.6 stars. Owner Luis present at tables. Latin bistro. Best time: before dinner service (12:30–1pm).' },
  { name: 'Yafa Cafe – Sunset Park', lat: 40.64935, lng: -74.00920, cat: 'food', note: '4.7 stars. Yemeni coffee and breakfast cafe. Staff and owner are community pillars. Best time: morning (7–9am).' },
  { name: 'SLIMAK CAFE – Sunset Park', lat: 40.65145, lng: -74.00781, cat: 'food', note: '4.6 stars. 9 years of consistent quality. Closes 4pm — reliable end-of-day surplus. Best time: just before closing (3:30pm).' },
  { name: 'Cafe Nube – Sunset Park', lat: 40.65476, lng: -74.00425, cat: 'food', note: '4.9 stars. Korean-Mexican owner. Closes 3:30pm. Strong surplus of breakfast items. Best time: morning (8–9am).' },
  { name: 'Jey Diner – Park Slope', lat: 40.66118, lng: -73.99700, cat: 'food', note: '4.7 stars. Independent neighborhood diner. Excellent plating = owner takes pride. Best time: mid-morning (10–11am).' },
  { name: 'Mexique Cafe – Park Slope', lat: 40.66168, lng: -73.98922, cat: 'food', note: '4.9 stars. French-American spot. Husband-wife owner team on-site. Best time: before dinner (3:30–4pm).' },
  { name: 'Bay Ridge Diner', lat: 40.62521, lng: -74.02410, cat: 'food', note: '4.2 stars. Bilingual family-run diner. Server Ana is a community connector. Best time: mid-morning (9–10am).' },
  { name: 'Offshore Diner – Bay Ridge', lat: 40.62882, lng: -74.02911, cat: 'food', note: '4.2 stars. Old school mom-and-pop. Owner Billy described as a community figure. Best time: morning (7–9am).' },
  { name: 'Pegasus Brooklyn – Bay Ridge', lat: 40.62322, lng: -74.03143, cat: 'food', note: '4.6 stars. Small, owner-run brunch spot. Closes 5pm. Consistent surplus of egg dishes and pastries. Best time: morning (8–9am).' },
  { name: 'The Common – Bay Ridge', lat: 40.61784, lng: -74.03357, cat: 'food', note: '4.8 stars. Multicultural brunch cafe. Closes 3:30pm. Coffee ground on-site. Best time: mid-morning (9–10am).' },
  { name: 'BAKERIE – Crown Heights', lat: 40.67206, lng: -73.93935, cat: 'food', note: '4.4 stars. Independent artisan bakery. Closes 4pm (Fri 2pm). Predictable surplus daily. Best time: before closing (3–3:30pm).' },
  { name: 'Imael Cafe – Crown Heights', lat: 40.67105, lng: -73.94237, cat: 'food', note: '4.3 stars. Independent cafe/bakery. Gorgeous pastries. Closes 5pm. Best time: mid-morning (9–10am).' },
  { name: 'Daphne\'s – Bed-Stuy', lat: 40.68303, lng: -73.94115, cat: 'food', note: '4.7 stars. Independent Italian bistro. Dinner-only so end-of-night surplus is predictable. Best time: weekday afternoon (3–4pm).' },
  { name: 'Trad Room – Bed-Stuy', lat: 40.68389, lng: -73.92943, cat: 'food', note: '4.5 stars. Japanese izakaya, independently run. Lunch daily. Best time: after lunch service (3–4pm).' },
  { name: 'Radio Bakery – Greenpoint', lat: 40.73239, lng: -73.95507, cat: 'food', note: '4.5 stars. Beloved independent artisan bakery. Closes 3:30pm. High volume of baked goods. Best time: closing (3pm).' },
  { name: 'Nick + Sons Bakery – Williamsburg', lat: 40.72324, lng: -73.95125, cat: 'food', note: '4.7 stars. Family name in the brand. Closes 2pm daily. Best time: just before closing (1:30pm).' },
  { name: 'Martha\'s Country Bakery – Williamsburg', lat: 40.71492, lng: -73.96054, cat: 'food', note: '4.5 stars. Freshly delivered daily. Supplies other locations. Open until midnight. Best time: evening (8–9pm).' },
  { name: 'Paloma Coffee – Greenpoint', lat: 40.72724, lng: -73.95260, cat: 'food', note: '4.5 stars. Owner-run. Closes 6pm. Pastry and coffee surplus daily. Best time: late afternoon (4–5pm).' },
  { name: 'BunNan – Flatbush', lat: 40.63981, lng: -73.95526, cat: 'food', note: '4.9 stars. Haitian restaurant with owner-feel service. Jimmy the server = direct line to owner. Best time: Tue–Thu afternoon.' },
  { name: 'DJONDJON – Flatbush', lat: 40.65794, lng: -73.95058, cat: 'food', note: '4.5 stars. Haitian restaurant open 11am–11pm. Chef/owner mentioned in reviews. Best time: early afternoon (noon–2pm).' },
  { name: 'Lakou Cafe – Crown Heights', lat: 40.67201, lng: -73.93065, cat: 'food', note: '4.5 stars. Haitian-Caribbean cafe with vegan options. Community-first vibe. Best time: morning (9–11am).' },
  { name: 'La Cachette du Coin – Flatbush', lat: 40.65633, lng: -73.95284, cat: 'food', note: '4.8 stars. Chef Eva runs and cooks. Creole and Black-owned. Deeply community-rooted. Best time: afternoon (2–3pm).' },
  { name: 'LILLI Restaurant – East Flatbush', lat: 40.63964, lng: -73.92935, cat: 'food', note: '4.7 stars. Owner Jonnelle hands-on per multiple reviews. Caribbean fusion. Best time: early afternoon (noon–2pm).' },
  { name: "JJ's Fritaille – East Flatbush", lat: 40.63476, lng: -73.93754, cat: 'food', note: '4.6 stars. Family-run Haitian fritaille spot. Owner described as amazing cook and conversationalist. Best time: early afternoon (2–3pm).' },
  { name: 'Bird Pepper – Fort Greene', lat: 40.68012, lng: -73.97430, cat: 'food', note: '4.3 stars. Caribbean soul food. Independent and community-focused. Best time: afternoon before dinner (3–4pm).' },
  { name: 'Flatbush Food Co-op – Flatbush', lat: 40.64130, lng: -73.96472, cat: 'food', note: '4.3 stars. Community-owned co-op. Board-run but store manager has authority. Best time: morning (8–10am).' },
  { name: 'Cobble Hill Coffee Shop', lat: 40.68345, lng: -73.99556, cat: 'food', note: '4.2 stars. Classic neighborhood diner. Managers kind and welcoming per reviews. Best time: mid-morning (9–11am).' },
  { name: 'Nili – Cobble Hill', lat: 40.67933, lng: -73.99581, cat: 'food', note: '4.6 stars. Israeli cafe by the Miss Ada team. Eco-conscious (biodegradable straws). Best time: morning (7–9am).' },
  { name: 'Le Petit Cafe – Carroll Gardens', lat: 40.67674, lng: -73.99884, cat: 'food', note: '4.3 stars. Fairy-tale garden decor. Owner-run, closes 4pm weekdays. Best time: just before closing (3:30pm).' },
  { name: 'Levant on Smith – Cobble Hill', lat: 40.68426, lng: -73.99202, cat: 'food', note: '4.6 stars. French bistro on Smith St. Warm and community-focused. Best time: before lunch service (11am).' },
]

const CATEGORIES = [
  { key: 'all',       label: 'All locations',       color: '#374151' },
  { key: 'gym',       label: 'Planet Fitness',       color: '#0891b2' },
  { key: 'food',      label: 'Food donors (50)',     color: '#16a34a' },
  { key: 'religious', label: 'Religious',            color: '#7c3aed' },
  { key: 'school',    label: 'Schools',              color: '#ea580c' },
]

const CAT_COLORS: Record<string, string> = {
  gym: '#0891b2', food: '#16a34a', religious: '#7c3aed', school: '#ea580c',
}
const CAT_EMOJIS: Record<string, string> = {
  gym: '🏋️', food: '🍽️', religious: '🕌', school: '🏫',
}

export default function CommunityMapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [tooltip, setTooltip] = useState<{ name: string; note: string; cat: string } | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      if (!mapRef.current) return
      const L = (window as any).L
      const map = L.map(mapRef.current, { zoomControl: true }).setView([40.668, -73.96], 12)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 18,
      }).addTo(map)
      mapInstanceRef.current = map

      LOCATIONS.forEach((loc) => {
        const color = CAT_COLORS[loc.cat]
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.25)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
        marker._catKey = loc.cat
        marker._locData = loc
        marker.on('mouseover', () => setTooltip({ name: loc.name, note: loc.note, cat: loc.cat }))
        marker.on('mouseout', () => setTooltip(null))
        markersRef.current.push(marker)
      })
      setMapLoaded(true)
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapLoaded) return
    const map = mapInstanceRef.current
    markersRef.current.forEach((m) => {
      const locData = m._locData
      const matchesFilter = activeFilter === 'all' || m._catKey === activeFilter
      const matchesSearch = !search || locData.name.toLowerCase().includes(search.toLowerCase())
      if (matchesFilter && matchesSearch) {
        if (!map.hasLayer(m)) map.addLayer(m)
      } else {
        if (map.hasLayer(m)) map.removeLayer(m)
      }
    })
  }, [activeFilter, mapLoaded, search])

  const counts = LOCATIONS.reduce(
    (acc, loc) => { acc[loc.cat] = (acc[loc.cat] || 0) + 1; return acc },
    {} as Record<string, number>
  )

  const foodDonors = LOCATIONS.filter(l => l.cat === 'food')
  const filteredDonors = foodDonors.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 ring-2 ring-green-100">
              <img src="/gawa-logo-green.png" alt="GAWA Loop" width={28} height={28} style={{ objectFit: 'contain' }} />
            </div>
            <span className="text-lg font-bold text-slate-900">GAWA Loop</span>
          </a>
          <div className="flex items-center gap-3">
            <a className="hidden text-sm font-medium text-slate-600 hover:text-green-600 sm:block transition" href="/browse">Browse Food</a>
            <a className="hidden text-sm font-medium text-slate-600 hover:text-green-600 sm:block transition" href="/business/login">Business Login</a>
            <a className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition" href="/business/signup">Register Your Business</a>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="bg-gradient-to-br from-green-50 via-white to-emerald-50 px-6 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            📍 Brooklyn, NY
          </div>
          <h1 className="mb-4 text-4xl font-extrabold text-slate-900 md:text-5xl">
            Community <span className="text-green-500">partner map</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-600">
            50 owner-operated food donors across Brooklyn — plus gyms, schools, and religious centers where free food reaches people fastest.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-100 bg-white px-6 py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
            <div key={cat.key} className="rounded-xl border border-slate-100 p-4 text-center">
              <div className="text-2xl mb-1">{CAT_EMOJIS[cat.key]}</div>
              <div className="text-2xl font-extrabold" style={{ color: cat.color }}>{counts[cat.key] || 0}</div>
              <div className="text-xs text-slate-500 mt-1">{cat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(cat.key)}
                  className="rounded-full border px-4 py-1.5 text-sm font-semibold transition"
                  style={{
                    background: activeFilter === cat.key ? cat.color : 'white',
                    color: activeFilter === cat.key ? 'white' : '#374151',
                    borderColor: activeFilter === cat.key ? cat.color : '#e5e7eb',
                  }}
                >
                  {cat.key !== 'all' && <span className="mr-1">{CAT_EMOJIS[cat.key]}</span>}
                  {cat.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search locations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ml-auto rounded-full border border-slate-200 px-4 py-1.5 text-sm focus:border-green-400 focus:outline-none"
            />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-100" style={{ height: 540 }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            <div className="absolute bottom-4 right-4 z-[999] rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                <div key={cat.key} className="mb-1.5 flex items-center gap-2 last:mb-0">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs text-slate-600">{cat.label}</span>
                </div>
              ))}
            </div>

            {tooltip && (
              <div className="absolute left-4 top-4 z-[999] max-w-xs rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{CAT_EMOJIS[tooltip.cat]}</span>
                  <span className="text-sm font-semibold text-slate-900">{tooltip.name}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{tooltip.note}</p>
              </div>
            )}

            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="text-slate-400 text-sm">Loading map…</div>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400 text-right">Hover a pin for details. Filter and search above.</p>
        </div>
      </section>

      {/* Food donor list */}
      <section className="bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Owner-operated only
          </div>
          <h2 className="mb-1 text-2xl font-extrabold text-slate-900">Food donor outreach list</h2>
          <p className="mb-8 text-sm text-slate-500">
            All {foodDonors.length} independent businesses where you can walk in and speak directly to the owner or manager.
            {filteredDonors.length !== foodDonors.length && ` Showing ${filteredDonors.length} results.`}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDonors.map((loc, i) => (
              <div key={loc.name} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-400 mr-1">#{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-slate-900 leading-snug">{loc.name}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{loc.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-16 text-center">
        <h2 className="mb-3 text-3xl font-extrabold text-white">Is your business on this map?</h2>
        <p className="mb-8 text-green-100">Register for free and start donating surplus food to your community today.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="/business/signup" className="rounded-xl bg-white px-8 py-4 font-bold text-green-600 hover:bg-green-50 transition">
            Register your business
          </a>
          <a href="/browse" className="rounded-xl border-2 border-white/40 px-8 py-4 font-bold text-white hover:bg-white/10 transition">
            Browse free food
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <a href="/" className="flex items-center gap-3">
            <img src="/gawa-logo-green.png" alt="GAWA Loop" width={32} height={32} style={{ objectFit: 'contain' }} />
            <span className="font-bold text-slate-900">GAWA Loop</span>
          </a>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <a className="hover:text-green-600 transition" href="/browse">Browse Food</a>
            <a className="hover:text-green-600 transition" href="/business/signup">For Businesses</a>
            <a className="hover:text-green-600 transition" href="/business/login">Business Login</a>
            <a className="hover:text-green-600 transition" href="/support">Contact Us</a>
          </div>
          <div className="text-sm text-slate-400">© 2026 GAWA Loop · Free food. Less waste. Real impact.</div>
        </div>
      </footer>
    </main>
  )
}
