export interface SectorOption {
  value: string;
  label: string;
}

// Sectors the app already knows well (labels + verified demo coordinates).
const KNOWN: Array<SectorOption & { lat?: number; lon?: number }> = [
  { value: 'Sector 17', label: 'Sector 17 (City Center / Plaza)', lat: 30.7398, lon: 76.7784 },
  { value: 'Sector 22', label: 'Sector 22 (Aroma / Mobile Market)', lat: 30.7328, lon: 76.7729 },
  { value: 'Sector 26', label: 'Sector 26 (Grain Market / Madhya Marg)', lat: 30.7258, lon: 76.8042 },
  { value: 'Sector 35', label: 'Sector 35 (Kisan Bhawan / Commercial)', lat: 30.7226, lon: 76.7642 },
  { value: 'Sector 43', label: 'Sector 43 (ISBT / District Court)', lat: 30.718, lon: 76.752 },
  { value: 'Sector 45', label: 'Sector 45 (Residential / Burail)' },
  { value: 'Manimajra', label: 'Manimajra (Housing Complex)', lat: 30.723, lon: 76.839 },
  { value: 'Industrial Area Phase 1', label: 'Industrial Area Phase 1 (Tribune Chowk)', lat: 30.7071, lon: 76.7925 },
];

const knownValues = new Set(KNOWN.map((k) => k.value));

export const SECTOR_OPTIONS: SectorOption[] = [
  ...KNOWN.map(({ value, label }) => ({ value, label })),
  ...Array.from({ length: 56 }, (_, i) => `Sector ${i + 1}`)
    .filter((v) => !knownValues.has(v))
    .map((v) => ({ value: v, label: v })),
  { value: 'Industrial Area Phase 2', label: 'Industrial Area Phase 2' },
];

export interface Coords {
  lat: number;
  lon: number;
}

const CHANDIGARH_VIEWBOX = '76.65,30.82,76.90,30.65'; // left,top,right,bottom

const geocode = async (query: string): Promise<Coords | null> => {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 6000);
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1' +
      `&viewbox=${CHANDIGARH_VIEWBOX}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return { lat: Number(Number(rows[0].lat).toFixed(5)), lon: Number(Number(rows[0].lon).toFixed(5)) };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
};

// Finds map coordinates for a sector (and landmark when given): landmark inside the
// sector first, then the sector itself via OpenStreetMap, then the built-in table.
export const resolveLocation = async (sector: string, landmark?: string | null): Promise<Coords | null> => {
  if (landmark) {
    const hit = await geocode(`${landmark}, ${sector}, Chandigarh`);
    if (hit) return hit;
  }
  const known = KNOWN.find((k) => k.value === sector);
  if (known?.lat !== undefined && known.lon !== undefined && !landmark) return { lat: known.lat, lon: known.lon };
  const sectorHit = await geocode(`${sector}, Chandigarh`);
  if (sectorHit) return sectorHit;
  return known?.lat !== undefined && known.lon !== undefined ? { lat: known.lat, lon: known.lon } : null;
};
