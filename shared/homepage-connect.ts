// Shared presentation copy and theme values; category names come from the canonical 10-Sector taxonomy.
export type ConnectSection = {
  readonly key: 'agri' | 'health';
  readonly heading: string;
  readonly categorySlug: string;
  readonly description: string;
  readonly background: string;
  readonly ink: string;
};
export const connectSections: readonly ConnectSection[] = [
  {
    key: 'health',
    heading: 'VISTRAH HealthConnect',
    categorySlug: 'hospitals-and-labs',
    description: 'Explore healthcare, fitness, and wellbeing options in one place.',
    background: '#E3F1FC',
    ink: '#173C58',
  },
];
export const connectCategorySlugs: readonly string[] = [];
