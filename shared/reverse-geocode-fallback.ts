import type { GeoPoint } from './live-geolocation';

function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function coordFallbackString(point: GeoPoint): string {
  return `${point.latitude.toFixed(3)}° N, ${point.longitude.toFixed(3)}° E`;
}

export type ResolvedAreaCity = {
  locality: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  formattedAddress: string;
  source: 'primary' | 'nominatim' | 'local' | 'coordinates';
};

export type PrimaryGeocodeCandidate = {
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  pincode?: string | null;
  formattedAddress?: string | null;
};

type LocalGazetteerEntry = {
  area: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  maxRadiusKm: number;
};

const CITY_CANONICAL_NAMES: Readonly<Record<string, string>> = {
  bangalore: 'Bengaluru',
  'bangalore urban': 'Bengaluru',
  'bengaluru urban': 'Bengaluru',
  'bangalore south': 'Bengaluru',
  'bangalore north': 'Bengaluru',
  'bangalore east': 'Bengaluru',
  'bengaluru south': 'Bengaluru',
  'bengaluru north': 'Bengaluru',
  'bengaluru east': 'Bengaluru',
  bbmp: 'Bengaluru',
  mysore: 'Mysuru',
  mangalore: 'Mangaluru',
  hubli: 'Hubballi',
  'hubli-dharwad': 'Hubballi',
  'hubballi-dharwad': 'Hubballi',
  belgaum: 'Belagavi',
  shimoga: 'Shivamogga',
  chikmagalur: 'Chikkamagaluru',
  tumkur: 'Tumakuru',
  bellary: 'Ballari',
  gulbarga: 'Kalaburagi',
  bijapur: 'Vijayapura',
  hospet: 'Hosapete',
  madras: 'Chennai',
  bombay: 'Mumbai',
  calcutta: 'Kolkata',
  cochin: 'Kochi',
  trivandrum: 'Thiruvananthapuram',
};

/**
 * Curated Karnataka, Bengaluru neighbourhood, and Indian city lookup so offline or
 * rate-limited reverse-geocoding still resolves clean `Area, City` labels (e.g. `Begur, Bengaluru`).
 */
const LOCAL_AREA_GAZETTEER: readonly LocalGazetteerEntry[] = [
  // South & South-East Bengaluru neighbourhoods (Begur / Bommanahalli / HSR / Electronic City / BTM / Koramangala)
  { area: 'Begur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560068', latitude: 12.8885, longitude: 77.6238, maxRadiusKm: 4.5 },
  { area: 'Hongasandra', city: 'Bengaluru', state: 'Karnataka', postalCode: '560068', latitude: 12.8975, longitude: 77.6305, maxRadiusKm: 3.5 },
  { area: 'Bommanahalli', city: 'Bengaluru', state: 'Karnataka', postalCode: '560068', latitude: 12.9025, longitude: 77.6185, maxRadiusKm: 4.0 },
  { area: 'Singasandra', city: 'Bengaluru', state: 'Karnataka', postalCode: '560068', latitude: 12.8792, longitude: 77.6412, maxRadiusKm: 4.0 },
  { area: 'Kudlu', city: 'Bengaluru', state: 'Karnataka', postalCode: '560068', latitude: 12.8895, longitude: 77.6512, maxRadiusKm: 4.0 },
  { area: 'HSR Layout', city: 'Bengaluru', state: 'Karnataka', postalCode: '560102', latitude: 12.9121, longitude: 77.6446, maxRadiusKm: 4.5 },
  { area: 'BTM Layout', city: 'Bengaluru', state: 'Karnataka', postalCode: '560076', latitude: 12.9166, longitude: 77.6101, maxRadiusKm: 4.0 },
  { area: 'Koramangala', city: 'Bengaluru', state: 'Karnataka', postalCode: '560034', latitude: 12.9352, longitude: 77.6245, maxRadiusKm: 4.5 },
  { area: 'Arekere', city: 'Bengaluru', state: 'Karnataka', postalCode: '560076', latitude: 12.8898, longitude: 77.5975, maxRadiusKm: 4.0 },
  { area: 'Hulimavu', city: 'Bengaluru', state: 'Karnataka', postalCode: '560076', latitude: 12.8772, longitude: 77.6032, maxRadiusKm: 4.0 },
  { area: 'Gottigere', city: 'Bengaluru', state: 'Karnataka', postalCode: '560083', latitude: 12.8565, longitude: 77.5892, maxRadiusKm: 5.0 },
  { area: 'Electronic City', city: 'Bengaluru', state: 'Karnataka', postalCode: '560100', latitude: 12.8452, longitude: 77.6602, maxRadiusKm: 6.5 },
  { area: 'JP Nagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560078', latitude: 12.9063, longitude: 77.5857, maxRadiusKm: 4.5 },
  { area: 'Jayanagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560041', latitude: 12.9308, longitude: 77.5838, maxRadiusKm: 4.5 },
  { area: 'Banashankari', city: 'Bengaluru', state: 'Karnataka', postalCode: '560070', latitude: 12.9255, longitude: 77.5468, maxRadiusKm: 5.0 },
  { area: 'Basavanagudi', city: 'Bengaluru', state: 'Karnataka', postalCode: '560004', latitude: 12.9422, longitude: 77.5738, maxRadiusKm: 4.0 },
  { area: 'Uttarahalli', city: 'Bengaluru', state: 'Karnataka', postalCode: '560061', latitude: 12.9055, longitude: 77.5456, maxRadiusKm: 5.0 },
  { area: 'Konanakunte', city: 'Bengaluru', state: 'Karnataka', postalCode: '560062', latitude: 12.8855, longitude: 77.5695, maxRadiusKm: 4.5 },
  { area: 'Haralur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560102', latitude: 12.9012, longitude: 77.6652, maxRadiusKm: 4.5 },
  { area: 'Bellandur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560103', latitude: 12.9261, longitude: 77.6762, maxRadiusKm: 5.0 },
  { area: 'Sarjapur Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560035', latitude: 12.9082, longitude: 77.6952, maxRadiusKm: 6.5 },
  { area: 'Jigani', city: 'Bengaluru', state: 'Karnataka', postalCode: '560105', latitude: 12.7835, longitude: 77.6405, maxRadiusKm: 7.0 },
  { area: 'Chandapura', city: 'Bengaluru', state: 'Karnataka', postalCode: '560099', latitude: 12.8015, longitude: 77.7035, maxRadiusKm: 7.0 },

  // Central, East, West & North Bengaluru neighbourhoods
  { area: 'MG Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', latitude: 12.9716, longitude: 77.5946, maxRadiusKm: 5.0 },
  { area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560038', latitude: 12.9784, longitude: 77.6408, maxRadiusKm: 4.5 },
  { area: 'Domlur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560071', latitude: 12.9610, longitude: 77.6387, maxRadiusKm: 3.5 },
  { area: 'Marathahalli', city: 'Bengaluru', state: 'Karnataka', postalCode: '560037', latitude: 12.9569, longitude: 77.7011, maxRadiusKm: 5.5 },
  { area: 'Brookefield', city: 'Bengaluru', state: 'Karnataka', postalCode: '560037', latitude: 12.9665, longitude: 77.7178, maxRadiusKm: 4.5 },
  { area: 'Whitefield', city: 'Bengaluru', state: 'Karnataka', postalCode: '560066', latitude: 12.9698, longitude: 77.7500, maxRadiusKm: 7.5 },
  { area: 'Varthur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560087', latitude: 12.9407, longitude: 77.7470, maxRadiusKm: 6.0 },
  { area: 'Mahadevapura', city: 'Bengaluru', state: 'Karnataka', postalCode: '560048', latitude: 12.9915, longitude: 77.6958, maxRadiusKm: 5.0 },
  { area: 'KR Puram', city: 'Bengaluru', state: 'Karnataka', postalCode: '560036', latitude: 13.0055, longitude: 77.6960, maxRadiusKm: 6.0 },
  { area: 'Banaswadi', city: 'Bengaluru', state: 'Karnataka', postalCode: '560043', latitude: 13.0142, longitude: 77.6515, maxRadiusKm: 4.5 },
  { area: 'Kalyan Nagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560043', latitude: 13.0240, longitude: 77.6402, maxRadiusKm: 4.5 },
  { area: 'Hennur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560043', latitude: 13.0450, longitude: 77.6465, maxRadiusKm: 5.5 },
  { area: 'RT Nagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560032', latitude: 13.0212, longitude: 77.5948, maxRadiusKm: 4.5 },
  { area: 'Hebbal', city: 'Bengaluru', state: 'Karnataka', postalCode: '560024', latitude: 13.0358, longitude: 77.5970, maxRadiusKm: 5.5 },
  { area: 'Yelahanka', city: 'Bengaluru', state: 'Karnataka', postalCode: '560064', latitude: 13.1007, longitude: 77.5963, maxRadiusKm: 8.5 },
  { area: 'Devanahalli', city: 'Bengaluru', state: 'Karnataka', postalCode: '562110', latitude: 13.2466, longitude: 77.7118, maxRadiusKm: 12.0 },
  { area: 'Malleshwaram', city: 'Bengaluru', state: 'Karnataka', postalCode: '560003', latitude: 13.0031, longitude: 77.5643, maxRadiusKm: 4.5 },
  { area: 'Rajajinagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560010', latitude: 12.9912, longitude: 77.5525, maxRadiusKm: 4.5 },
  { area: 'Yeshwanthpur', city: 'Bengaluru', state: 'Karnataka', postalCode: '560022', latitude: 13.0250, longitude: 77.5478, maxRadiusKm: 5.0 },
  { area: 'Peenya', city: 'Bengaluru', state: 'Karnataka', postalCode: '560058', latitude: 13.0325, longitude: 77.5150, maxRadiusKm: 6.5 },
  { area: 'Vijayanagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560040', latitude: 12.9719, longitude: 77.5327, maxRadiusKm: 4.5 },
  { area: 'Nagarbhavi', city: 'Bengaluru', state: 'Karnataka', postalCode: '560072', latitude: 12.9612, longitude: 77.5095, maxRadiusKm: 5.5 },
  { area: 'RR Nagar', city: 'Bengaluru', state: 'Karnataka', postalCode: '560098', latitude: 12.9275, longitude: 77.5155, maxRadiusKm: 5.5 },
  { area: 'Kengeri', city: 'Bengaluru', state: 'Karnataka', postalCode: '560060', latitude: 12.9081, longitude: 77.4852, maxRadiusKm: 7.5 },
  // Wide Bengaluru metro catch-all
  { area: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', latitude: 12.9716, longitude: 77.5946, maxRadiusKm: 32.0 },

  // Karnataka cities & towns
  { area: 'Tarikere', city: 'Chikkamagaluru', state: 'Karnataka', postalCode: '577228', latitude: 13.7072, longitude: 75.8132, maxRadiusKm: 20.0 },
  { area: 'IG Road', city: 'Chikkamagaluru', state: 'Karnataka', postalCode: '577101', latitude: 13.3161, longitude: 75.7720, maxRadiusKm: 8.0 },
  { area: 'Chikkamagaluru', city: 'Chikkamagaluru', state: 'Karnataka', postalCode: '577101', latitude: 13.3161, longitude: 75.7720, maxRadiusKm: 24.0 },
  { area: 'Devaraja Mohalla', city: 'Mysuru', state: 'Karnataka', postalCode: '570001', latitude: 12.2958, longitude: 76.6394, maxRadiusKm: 6.0 },
  { area: 'Vijayanagar', city: 'Mysuru', state: 'Karnataka', postalCode: '570017', latitude: 12.3315, longitude: 76.6150, maxRadiusKm: 7.0 },
  { area: 'Mysuru', city: 'Mysuru', state: 'Karnataka', postalCode: '570001', latitude: 12.2958, longitude: 76.6394, maxRadiusKm: 24.0 },
  { area: 'Hampankatta', city: 'Mangaluru', state: 'Karnataka', postalCode: '575001', latitude: 12.8703, longitude: 74.8426, maxRadiusKm: 7.0 },
  { area: 'Surathkal', city: 'Mangaluru', state: 'Karnataka', postalCode: '575014', latitude: 12.9896, longitude: 74.8012, maxRadiusKm: 10.0 },
  { area: 'Mangaluru', city: 'Mangaluru', state: 'Karnataka', postalCode: '575001', latitude: 12.9141, longitude: 74.8560, maxRadiusKm: 24.0 },
  { area: 'Vidyanagar', city: 'Hubballi', state: 'Karnataka', postalCode: '580021', latitude: 15.3647, longitude: 75.1240, maxRadiusKm: 8.0 },
  { area: 'Hubballi', city: 'Hubballi', state: 'Karnataka', postalCode: '580020', latitude: 15.3647, longitude: 75.1240, maxRadiusKm: 22.0 },
  { area: 'Dharwad', city: 'Dharwad', state: 'Karnataka', postalCode: '580001', latitude: 15.4589, longitude: 75.0078, maxRadiusKm: 20.0 },
  { area: 'Belagavi', city: 'Belagavi', state: 'Karnataka', postalCode: '590001', latitude: 15.8497, longitude: 74.4977, maxRadiusKm: 22.0 },
  { area: 'Shivamogga', city: 'Shivamogga', state: 'Karnataka', postalCode: '577201', latitude: 13.9299, longitude: 75.5681, maxRadiusKm: 22.0 },
  { area: 'Bhadravati', city: 'Shivamogga', state: 'Karnataka', postalCode: '577301', latitude: 13.8400, longitude: 75.7022, maxRadiusKm: 16.0 },
  { area: 'Tumakuru', city: 'Tumakuru', state: 'Karnataka', postalCode: '572101', latitude: 13.3379, longitude: 77.1173, maxRadiusKm: 22.0 },
  { area: 'Davangere', city: 'Davangere', state: 'Karnataka', postalCode: '577001', latitude: 14.4644, longitude: 75.9218, maxRadiusKm: 22.0 },
  { area: 'Manipal', city: 'Udupi', state: 'Karnataka', postalCode: '576104', latitude: 13.3525, longitude: 74.7868, maxRadiusKm: 8.0 },
  { area: 'Udupi', city: 'Udupi', state: 'Karnataka', postalCode: '576101', latitude: 13.3409, longitude: 74.7421, maxRadiusKm: 20.0 },
  { area: 'Hassan', city: 'Hassan', state: 'Karnataka', postalCode: '573201', latitude: 13.0033, longitude: 76.1004, maxRadiusKm: 20.0 },
  { area: 'Mandya', city: 'Mandya', state: 'Karnataka', postalCode: '571401', latitude: 12.5218, longitude: 76.8951, maxRadiusKm: 20.0 },
  { area: 'Ramanagara', city: 'Ramanagara', state: 'Karnataka', postalCode: '562159', latitude: 12.7209, longitude: 77.2799, maxRadiusKm: 20.0 },
  { area: 'Kolar', city: 'Kolar', state: 'Karnataka', postalCode: '563101', latitude: 13.1360, longitude: 78.1292, maxRadiusKm: 20.0 },
  { area: 'Ballari', city: 'Ballari', state: 'Karnataka', postalCode: '583101', latitude: 15.1394, longitude: 76.9214, maxRadiusKm: 22.0 },
  { area: 'Hosapete', city: 'Vijayanagara', state: 'Karnataka', postalCode: '583201', latitude: 15.2689, longitude: 76.3909, maxRadiusKm: 20.0 },
  { area: 'Kalaburagi', city: 'Kalaburagi', state: 'Karnataka', postalCode: '585101', latitude: 17.3297, longitude: 76.8343, maxRadiusKm: 22.0 },
  { area: 'Vijayapura', city: 'Vijayapura', state: 'Karnataka', postalCode: '586101', latitude: 16.8302, longitude: 75.7100, maxRadiusKm: 22.0 },
  { area: 'Bidar', city: 'Bidar', state: 'Karnataka', postalCode: '585401', latitude: 17.9104, longitude: 77.5199, maxRadiusKm: 20.0 },
  { area: 'Raichur', city: 'Raichur', state: 'Karnataka', postalCode: '584101', latitude: 16.2076, longitude: 77.3463, maxRadiusKm: 20.0 },
  { area: 'Chitradurga', city: 'Chitradurga', state: 'Karnataka', postalCode: '577501', latitude: 14.2251, longitude: 76.3980, maxRadiusKm: 20.0 },
  { area: 'Madikeri', city: 'Kodagu', state: 'Karnataka', postalCode: '571201', latitude: 12.4244, longitude: 75.7382, maxRadiusKm: 22.0 },
  { area: 'Karwar', city: 'Uttara Kannada', state: 'Karnataka', postalCode: '581301', latitude: 14.8185, longitude: 74.1295, maxRadiusKm: 20.0 },

  // Major Indian metros
  { area: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', postalCode: '600001', latitude: 13.0827, longitude: 80.2707, maxRadiusKm: 28.0 },
  { area: 'Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', postalCode: '641001', latitude: 11.0168, longitude: 76.9558, maxRadiusKm: 24.0 },
  { area: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', postalCode: '500001', latitude: 17.3850, longitude: 78.4867, maxRadiusKm: 30.0 },
  { area: 'Kochi', city: 'Kochi', state: 'Kerala', postalCode: '682001', latitude: 9.9312, longitude: 76.2673, maxRadiusKm: 24.0 },
  { area: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', latitude: 19.0760, longitude: 72.8777, maxRadiusKm: 30.0 },
  { area: 'Pune', city: 'Pune', state: 'Maharashtra', postalCode: '411001', latitude: 18.5204, longitude: 73.8567, maxRadiusKm: 28.0 },
  { area: 'Panaji', city: 'Goa', state: 'Goa', postalCode: '403001', latitude: 15.4909, longitude: 73.8278, maxRadiusKm: 28.0 },
  { area: 'New Delhi', city: 'New Delhi', state: 'Delhi', postalCode: '110001', latitude: 28.6139, longitude: 77.2090, maxRadiusKm: 32.0 },
  { area: 'Kolkata', city: 'Kolkata', state: 'West Bengal', postalCode: '700001', latitude: 22.5726, longitude: 88.3639, maxRadiusKm: 28.0 },
  { area: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', postalCode: '380001', latitude: 23.0225, longitude: 72.5714, maxRadiusKm: 26.0 },
  { area: 'Jaipur', city: 'Jaipur', state: 'Rajasthan', postalCode: '302001', latitude: 26.9124, longitude: 75.7873, maxRadiusKm: 26.0 },
];

export function isCoordinateFormattedLabel(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/[-+]?\d+(?:\.\d+)?\s*°\s*[NSns]\s*,\s*[-+]?\d+(?:\.\d+)?\s*°\s*[EWew]/.test(trimmed)) {
    return true;
  }
  if (/^[-+]?\d{1,2}\.\d{2,}\s*,\s*[-+]?\d{1,3}\.\d{2,}$/.test(trimmed)) {
    return true;
  }
  return false;
}

function cleanPlaceToken(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/\b[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}\b/gi, '') // Strip Google Plus Codes
    .replace(/\bWard\s*(?:No\.?\s*)?\d+\b/gi, '')
    .replace(/\b(?:Sub-District|Taluk|Taluka|Tehsil|Hobli|Zone)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s-]+|[,\s-]+$/g, '')
    .trim();
  if (!cleaned || /^\d+$/.test(cleaned) || isCoordinateFormattedLabel(cleaned)) {
    return '';
  }
  const canonical = CITY_CANONICAL_NAMES[cleaned.toLowerCase()];
  if (canonical) return canonical;
  if (/\bdistrict$/i.test(cleaned)) {
    const stripped = cleaned.replace(/\s+district$/i, '').trim();
    return CITY_CANONICAL_NAMES[stripped.toLowerCase()] ?? stripped;
  }
  return cleaned;
}

export function normalizeCityName(raw?: string | null): string {
  return cleanPlaceToken(raw);
}

export function formatCleanAreaCity(
  areaRaw?: string | null,
  cityRaw?: string | null,
  fallbackRaw?: string | null,
): string {
  const area = cleanPlaceToken(areaRaw);
  const city = cleanPlaceToken(cityRaw);

  if (area && city) {
    if (area.toLowerCase() === city.toLowerCase()) return city;
    if (area.toLowerCase().includes(city.toLowerCase())) return area;
    return `${area}, ${city}`;
  }
  if (area) return area;
  if (city) return city;

  if (fallbackRaw && !isCoordinateFormattedLabel(fallbackRaw)) {
    const parts = fallbackRaw
      .split(',')
      .map(part => cleanPlaceToken(part))
      .filter(Boolean);
    if (parts.length >= 2) {
      return formatCleanAreaCity(parts[0], parts[1]);
    }
    if (parts.length === 1) return parts[0];
  }
  return '';
}

export function lookupLocalAreaCity(point: GeoPoint): ResolvedAreaCity | null {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    return null;
  }

  let bestSpecific: { entry: LocalGazetteerEntry; distanceKm: number } | null = null;
  let bestBroad: { entry: LocalGazetteerEntry; distanceKm: number } | null = null;

  for (const entry of LOCAL_AREA_GAZETTEER) {
    const distanceKm = distanceMeters(point, entry) / 1000;
    if (distanceKm > entry.maxRadiusKm) continue;

    const isBroadCatchAll = entry.area === entry.city && entry.maxRadiusKm >= 18;
    if (isBroadCatchAll) {
      if (!bestBroad || distanceKm < bestBroad.distanceKm) {
        bestBroad = { entry, distanceKm };
      }
    } else if (!bestSpecific || distanceKm < bestSpecific.distanceKm) {
      bestSpecific = { entry, distanceKm };
    }
  }

  const chosen = bestSpecific ?? bestBroad;
  if (!chosen) return null;

  const { entry } = chosen;
  const locality = formatCleanAreaCity(entry.area, entry.city);
  const formattedParts = [
    entry.area !== entry.city ? entry.area : '',
    entry.city,
    entry.state,
    entry.postalCode,
  ].filter(Boolean);

  return {
    locality,
    area: entry.area,
    city: entry.city,
    state: entry.state,
    postalCode: entry.postalCode,
    formattedAddress: formattedParts.join(', '),
    source: 'local',
  };
}

type NominatimReverseResponse = {
  name?: string;
  display_name?: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    residential?: string;
    borough?: string;
    city_district?: string;
    village?: string;
    hamlet?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    road?: string;
  };
};

export async function reverseGeocodeNominatim(
  point: GeoPoint,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<ResolvedAreaCity | null> {
  const fetchFn = options?.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!fetchFn) return null;

  const timeoutMs = options?.timeoutMs ?? 3800;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: point.latitude.toFixed(6),
      lon: point.longitude.toFixed(6),
      zoom: '16',
      addressdetails: '1',
      'accept-language': 'en',
    });
    const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

    const requestPromise = fetchFn(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      ...(controller ? { signal: controller.signal } : {}),
    });

    const response = await Promise.race([
      requestPromise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller?.abort();
          reject(new Error('Nominatim timeout'));
        }, timeoutMs);
      }),
    ]);

    if (!response.ok) return null;
    const data = (await response.json()) as NominatimReverseResponse;
    const addr = data?.address;
    if (!addr && !data?.display_name) return null;

    const rawCity =
      addr?.city ||
      addr?.town ||
      addr?.municipality ||
      addr?.state_district ||
      addr?.county ||
      '';
    const localHint = lookupLocalAreaCity(point);
    const city = normalizeCityName(rawCity) || localHint?.city || '';

    const rawArea =
      addr?.suburb ||
      addr?.neighbourhood ||
      addr?.quarter ||
      addr?.residential ||
      addr?.village ||
      addr?.hamlet ||
      addr?.borough ||
      addr?.city_district ||
      addr?.road ||
      data?.name ||
      '';
    const cleanedArea = cleanPlaceToken(rawArea);
    const area =
      cleanedArea && cleanedArea.toLowerCase() !== city.toLowerCase()
        ? cleanedArea
        : localHint && localHint.area !== localHint.city
          ? localHint.area
          : cleanedArea || city;

    const locality = formatCleanAreaCity(area, city, data?.display_name);
    if (!locality) return null;

    const state = cleanPlaceToken(addr?.state) || localHint?.state || '';
    const postalCode = (addr?.postcode ?? '').trim() || localHint?.postalCode || '';
    const formattedAddress =
      [area !== city ? area : '', city, state, postalCode].filter(Boolean).join(', ') ||
      data?.display_name ||
      locality;

    return {
      locality,
      area: area || locality,
      city: city || locality,
      state,
      postalCode,
      formattedAddress,
      source: 'nominatim',
    };
  } catch {
    return null;
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export function normalizePrimaryCandidate(
  point: GeoPoint,
  candidate?: PrimaryGeocodeCandidate | null,
): ResolvedAreaCity | null {
  if (!candidate) return null;
  const localHint = lookupLocalAreaCity(point);
  const city =
    normalizeCityName(candidate.city) ||
    localHint?.city ||
    '';

  let area = cleanPlaceToken(candidate.locality);
  if (area && area.includes(',')) {
    const firstPart = cleanPlaceToken(area.split(',')[0]);
    if (firstPart) area = firstPart;
  }
  if (!area && candidate.formattedAddress && !isCoordinateFormattedLabel(candidate.formattedAddress)) {
    const parts = candidate.formattedAddress
      .split(',')
      .map(p => cleanPlaceToken(p))
      .filter(Boolean);
    area = parts.find(p => p.toLowerCase() !== city.toLowerCase()) || parts[0] || '';
  }
  if ((!area || area.toLowerCase() === city.toLowerCase()) && localHint && localHint.area !== localHint.city) {
    area = localHint.area;
  }

  const locality = formatCleanAreaCity(area, city, candidate.formattedAddress);
  if (!locality) return null;

  const state = cleanPlaceToken(candidate.state) || localHint?.state || '';
  const postalCode =
    (candidate.postalCode ?? candidate.pincode ?? '').trim() || localHint?.postalCode || '';
  const formattedAddress =
    candidate.formattedAddress && !isCoordinateFormattedLabel(candidate.formattedAddress)
      ? candidate.formattedAddress.trim()
      : [area && area !== city ? area : '', city, state, postalCode].filter(Boolean).join(', ') ||
        locality;

  return {
    locality,
    area: area || locality,
    city: city || locality,
    state,
    postalCode,
    formattedAddress,
    source: 'primary',
  };
}

/**
 * Unified graceful reverse-geocoding pipeline:
 * 1. Primary resolver (Google `/maps/reverse-geocode` if configured & healthy)
 * 2. OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org/reverse?format=jsonv2&...`)
 * 3. Curated Bengaluru/Karnataka/India local neighbourhood lookup (`Begur, Bengaluru`, etc.)
 * 4. Coordinate string ONLY when offline and completely outside all known lookups.
 */
export async function resolveAreaCityLabel(
  point: GeoPoint,
  options?: {
    primaryResolver?: () => Promise<PrimaryGeocodeCandidate | null | undefined>;
    fetchImpl?: typeof fetch;
    nominatimTimeoutMs?: number;
  },
): Promise<ResolvedAreaCity> {
  if (options?.primaryResolver) {
    try {
      const primaryRaw = await options.primaryResolver();
      const normalized = normalizePrimaryCandidate(point, primaryRaw);
      if (normalized) return normalized;
    } catch {
      // Fall through to Nominatim + local neighbourhood gazetteer
    }
  }

  const nominatim = await reverseGeocodeNominatim(point, {
    fetchImpl: options?.fetchImpl,
    timeoutMs: options?.nominatimTimeoutMs,
  });
  if (nominatim) return nominatim;

  const local = lookupLocalAreaCity(point);
  if (local) return local;

  const coord = coordFallbackString(point);
  return {
    locality: coord,
    area: coord,
    city: '',
    state: '',
    postalCode: '',
    formattedAddress: coord,
    source: 'coordinates',
  };
}
