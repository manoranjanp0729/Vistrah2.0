// Shared presentation copy and theme values; category names come from the canonical taxonomy.
export const connectSections=[
 {key:'agri',heading:'VISTRAH AgriConnect',categorySlug:'agriculture-and-farming',description:'Find farming services, equipment, and practical support for your farm.',background:'#E5F2DF',ink:'#24452F'},
 {key:'health',heading:'VISTRAH HealthConnect',categorySlug:'health-fitness-and-wellness',description:'Explore healthcare, fitness, and wellbeing options in one place.',background:'#E3F1FC',ink:'#173C58'},
] as const;
export const connectCategorySlugs=connectSections.map(section=>section.categorySlug);
