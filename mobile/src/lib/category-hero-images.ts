import type {ImageSourcePropType} from 'react-native';

// Bundled category artwork shared by native and phone-web service heroes (10 Final Main Categories).
export const categoryHeroImages: Record<string, ImageSourcePropType> = {
  'restaurants-and-dining': require('../../assets/category-heroes/restaurants-and-dining.webp'),
  'hotels-and-stay': require('../../assets/category-heroes/hotels-and-stay.webp'),
  'vehicle-rentals': require('../../assets/category-heroes/vehicle-rentals.webp'),
  'event-management': require('../../assets/category-heroes/event-management.webp'),
  'hospitals-and-labs': require('../../assets/category-heroes/hospitals-and-labs.webp'),
  'education-and-skills': require('../../assets/category-heroes/education-and-skills.webp'),
  'salons-and-beauty-parlour': require('../../assets/category-heroes/salons-and-beauty-parlour.webp'),
  'civil-and-construction': require('../../assets/category-heroes/civil-and-construction.webp'),
  'fuel-and-charging-stations': require('../../assets/category-heroes/fuel-and-charging-stations.webp'),
  'vibe-finder': require('../../assets/category-heroes/vibe-finder.webp'),
};
