export type SelectedLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  radiusKm: number;
  source?: 'google' | 'gps' | 'preset' | 'manual';
};

export type QuickCityPreset = {
  id: string;
  label: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export const KARNATAKA_QUICK_CITIES: readonly QuickCityPreset[] = [
  {
    id: 'bengaluru',
    label: 'Bengaluru',
    locality: 'MG Road, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    formattedAddress: 'MG Road, Bengaluru, Karnataka 560001',
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    id: 'tarikere',
    label: 'Tarikere',
    locality: 'Tarikere, Chikkamagaluru',
    city: 'Tarikere',
    state: 'Karnataka',
    pincode: '577228',
    formattedAddress: 'Tarikere, Chikkamagaluru District, Karnataka 577228',
    latitude: 13.7072,
    longitude: 75.8132,
  },
  {
    id: 'chikkamagaluru',
    label: 'Chikkamagaluru',
    locality: 'IG Road, Chikkamagaluru',
    city: 'Chikkamagaluru',
    state: 'Karnataka',
    pincode: '577101',
    formattedAddress: 'Chikkamagaluru, Karnataka 577101',
    latitude: 13.3161,
    longitude: 75.772,
  },
  {
    id: 'mysuru',
    label: 'Mysuru',
    locality: 'Devaraja Mohalla, Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
    pincode: '570001',
    formattedAddress: 'Mysuru, Karnataka 570001',
    latitude: 12.2958,
    longitude: 76.6394,
  },
  {
    id: 'mangaluru',
    label: 'Mangaluru',
    locality: 'Hampankatta, Mangaluru',
    city: 'Mangaluru',
    state: 'Karnataka',
    pincode: '575001',
    formattedAddress: 'Mangaluru, Karnataka 575001',
    latitude: 12.9141,
    longitude: 74.856,
  },
  {
    id: 'hubballi',
    label: 'Hubballi',
    locality: 'Vidyanagar, Hubballi',
    city: 'Hubballi',
    state: 'Karnataka',
    pincode: '580020',
    formattedAddress: 'Hubballi, Karnataka 580020',
    latitude: 15.3647,
    longitude: 75.124,
  },
] as const;

export const SELLER_COVERAGE_RADII = [5, 10, 25, 50] as const;
export const CUSTOMER_SEARCH_RADII = [2, 5, 10, 25] as const;

export const DEFAULT_SELECTED_LOCATION: SelectedLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
  formattedAddress: 'Bengaluru, Karnataka',
  locality: 'Bengaluru',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '',
  landmark: '',
  radiusKm: 5,
  source: 'preset',
};

export function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

export function presetToSelectedLocation(
  preset: QuickCityPreset,
  radiusKm: number,
  landmark = '',
): SelectedLocation {
  return {
    latitude: preset.latitude,
    longitude: preset.longitude,
    formattedAddress: preset.formattedAddress,
    locality: preset.locality,
    city: preset.city,
    state: preset.state,
    pincode: preset.pincode,
    landmark,
    radiusKm,
    source: 'preset',
  };
}
