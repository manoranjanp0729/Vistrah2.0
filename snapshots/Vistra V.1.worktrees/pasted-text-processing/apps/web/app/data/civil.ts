const civilDefaultImage = "/images/photos/civil/residential-construction.jpg";

const civilCategoryImages: Record<string, string> = {
  "residential-construction": "/images/photos/civil/residential-construction.jpg",
  "commercial-construction": "/images/photos/civil/commercial-construction.jpg",
  "government-pwd": "/images/photos/civil/government-pwd.jpg",
  "architecture-design": "/images/photos/civil/architecture-design.jpg",
  "civil-engineering": "/images/photos/civil/civil-engineering.jpg",
  "contractors-execution": "/images/photos/civil/contractors-execution.jpg",
  "tenders-procurement": "/images/photos/civil/tenders-procurement.jpg",
  "construction-materials-equipment": "/images/photos/civil/construction-materials-equipment.jpg",
  "inspection-testing": "/images/photos/civil/inspection-testing.jpg",
  "boq-estimation-costing": "/images/photos/civil/boq-estimation-costing.jpg",
  "outdoor-lifestyle-design": "/images/photos/civil/outdoor-lifestyle-design.jpg",
};

export const civilCategories = [
  {
    slug: "residential-construction",
    title: "Residential Construction",
    image: civilCategoryImages["residential-construction"] || civilDefaultImage,
    description: "House construction, renovation, extensions and related residential services.",
    status: "Coming soon",
  },
  {
    slug: "commercial-construction",
    title: "Commercial Construction",
    image: civilCategoryImages["commercial-construction"] || civilDefaultImage,
    description: "Commercial buildings, interiors, execution and construction services.",
    status: "Coming soon",
  },
  {
    slug: "government-pwd",
    title: "Government & PWD",
    image: civilCategoryImages["government-pwd"] || civilDefaultImage,
    description: "Government construction, PWD works and public infrastructure services.",
    status: "Coming soon",
  },
  {
    slug: "architecture-design",
    title: "Architecture & Design",
    image: civilCategoryImages["architecture-design"] || civilDefaultImage,
    description: "Architectural planning, drawings, 3D design and design consultation.",
    status: "Coming soon",
  },
  {
    slug: "civil-engineering",
    title: "Civil Engineering",
    image: civilCategoryImages["civil-engineering"] || civilDefaultImage,
    description: "Structural, civil engineering and technical consultancy services.",
    status: "Coming soon",
  },
  {
    slug: "contractors-execution",
    title: "Contractors & Execution",
    image: civilCategoryImages["contractors-execution"] || civilDefaultImage,
    description: "Contractor discovery, project execution and site management.",
    status: "Coming soon",
  },
  {
    slug: "tenders-procurement",
    title: "Tenders & Procurement",
    image: civilCategoryImages["tenders-procurement"] || civilDefaultImage,
    description: "Tender discovery, documentation, estimation and procurement support.",
    status: "Coming soon",
  },
  {
    slug: "construction-materials-equipment",
    title: "Construction Materials & Equipment",
    image: civilCategoryImages["construction-materials-equipment"] || civilDefaultImage,
    description: "Construction materials, machinery and equipment sourcing.",
    status: "Coming soon",
  },
  {
    slug: "inspection-testing",
    title: "Inspection & Testing",
    image: civilCategoryImages["inspection-testing"] || civilDefaultImage,
    description: "Site inspection, material testing and technical verification.",
    status: "Coming soon",
  },
  {
    slug: "boq-estimation-costing",
    title: "BOQ, Estimation & Costing",
    image: civilCategoryImages["boq-estimation-costing"] || civilDefaultImage,
    description: "BOQ preparation, quantity estimation and project costing.",
    status: "Coming soon",
  },
  {
    slug: "outdoor-lifestyle-design",
    title: "Outdoor & Lifestyle Design",
    image: civilCategoryImages["outdoor-lifestyle-design"] || civilDefaultImage,
    description: "Outdoor structures and premium lifestyle spaces for homes and commercial properties.",
    status: "Available",
  },
];

export const outdoorLifestyleServices = [
  {
    slug: "retractable-roofing",
    title: "Retractable Roofing",
    image: "/images/photos/outdoor/retractable-roofing.jpg",
    description: "Retractable roofing solutions for outdoor and lifestyle spaces.",
  },
  {
    slug: "bioclimatic-pergolas",
    title: "Bioclimatic Pergolas",
    image: "/images/photos/outdoor/bioclimatic-pergolas.jpg",
    description: "Adjustable outdoor shading and lifestyle structures.",
  },
  {
    slug: "guillotine-glass-systems",
    title: "Guillotine Glass Systems",
    image: "/images/photos/outdoor/guillotine-glass-systems.jpg",
    description: "Motorized vertical glass systems for outdoor spaces.",
  },
];

export const retractableRoofingCompanies = [
  {
    slug: "rayshade-technologies",
    name: "RayShade Technologies",
    description: "Retractable roofing and outdoor lifestyle solutions.",
  },
];

export const rayshadeServices = [
  {
    slug: "pvdf-fabric-retractable-roof",
    title: "PVDF Fabric Retractable Roof",
    description: "Retractable roofing solution using PVDF fabric.",
  },
  {
    slug: "bioclimatic-pergola",
    title: "Bioclimatic Pergola",
    description: "Adjustable outdoor pergola solution.",
  },
  {
    slug: "guillotine-glass-system",
    title: "Guillotine Glass System",
    description: "Motorized vertical glass enclosure system.",
  },
];
