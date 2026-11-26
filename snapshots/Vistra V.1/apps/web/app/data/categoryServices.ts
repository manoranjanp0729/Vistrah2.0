import { serviceImages } from "./serviceImages";

export type ServiceCard = {
  title: string;
  description: string;
  image: string;
  slug: string;
};

export type CategoryData = {
  title: string;
  eyebrow: string;
  description: string;
  heroImage: string;
  carousel?: "jobs" | "realEstate" | "taxCompliance" | "digital" | "business" | "other";
  services: ServiceCard[];
};

export const defaultServiceImage = serviceImages.placeholders.default;

export const resolveServiceImage = (image?: string, fallback: string = defaultServiceImage): string => {
  return image || fallback;
};

export const categories: Record<string, CategoryData> = {
  "jobs-careers": {
    title: "Jobs & Careers",
    eyebrow: "CAREER SUPPORT",
    carousel: "jobs",
    description:
      "Get professional support for resumes, job applications, interviews and career growth.",
    heroImage: serviceImages.categories.jobsCareers,
    services: [
      {
        title: "Resume Building",
        slug: "resume-building",
        description:
          "Create a professional resume designed for better opportunities.",
        image: serviceImages.services.jobs.resumeBuilding,
      },
      {
        title: "Job Application Assistance",
        slug: "job-application-assistance",
        description:
          "Get help finding and applying for suitable job opportunities.",
        image: serviceImages.services.jobs.jobApplicationAssistance,
      },
      {
        title: "LinkedIn Profile",
        slug: "linkedin-profile",
        description:
          "Build a professional LinkedIn profile that attracts recruiters.",
        image: serviceImages.services.jobs.linkedinProfile,
      },
      {
        title: "Interview Preparation",
        slug: "interview-preparation",
        description:
          "Prepare for interviews with structured guidance and practice.",
        image: serviceImages.services.jobs.interviewPreparation,
      },
      {
        title: "Career Consultation",
        slug: "career-consultation",
        description:
          "Get guidance on career direction, skills and opportunities.",
        image: serviceImages.services.jobs.careerConsultation,
      },
      {
        title: "Job Search Assistance",
        slug: "job-search-assistance",
        description:
          "Get assistance identifying relevant job opportunities.",
        image: serviceImages.services.jobs.jobSearchAssistance,
      },
    ],
  },

  "real-estate": {
    title: "Real Estate",
    eyebrow: "PROPERTY SERVICES",
    carousel: "realEstate",
    description:
      "Get assistance with property search, verification, valuation, buying, selling and rentals.",
    heroImage: serviceImages.categories.realEstate,
    services: [
      {
        title: "Property Search",
        slug: "property-search",
        description:
          "Find properties matching your location, budget and requirements.",
        image: serviceImages.services.realEstate.propertySearch,
      },
      {
        title: "Property Verification",
        slug: "property-verification",
        description:
          "Get property documents and details reviewed before proceeding.",
        image: serviceImages.services.realEstate.propertyVerification,
      },
      {
        title: "Property Valuation",
        slug: "property-valuation",
        description:
          "Understand the estimated market value of a property.",
        image: serviceImages.services.realEstate.propertyValuation,
      },
      {
        title: "Buy Property",
        slug: "buy-property",
        description:
          "Get assistance throughout the property buying process.",
        image: serviceImages.services.realEstate.buyProperty,
      },
      {
        title: "Sell Property",
        slug: "sell-property",
        description:
          "Get assistance preparing and marketing your property for sale.",
        image: serviceImages.services.realEstate.sellProperty,
      },
      {
        title: "Rental Assistance",
        slug: "rental-assistance",
        description:
          "Find or manage suitable residential and commercial rentals.",
        image: serviceImages.services.realEstate.rentalAssistance,
      },
    ],
  },

  "civil-construction": {
    title: "Civil & Construction",
    eyebrow: "CONSTRUCTION SERVICES",
    description:
      "From planning and estimation to construction, tenders, contractors and inspections.",
    heroImage: serviceImages.services.civil.civilConstruction,
    services: [
      {
        title: "Residential Construction",
        slug: "residential-construction",
        description:
          "Plan and execute residential construction projects.",
        image: serviceImages.services.civil.residentialConstruction,
      },
      {
        title: "Commercial Construction",
        slug: "commercial-construction",
        description:
          "Construction support for commercial and business properties.",
        image: serviceImages.services.civil.commercialConstruction,
      },
      {
        title: "Architecture & Design",
        slug: "architecture-design",
        description:
          "Get architectural planning and design support.",
        image: serviceImages.services.civil.architectureDesign,
      },
      {
        title: "Civil Engineering",
        slug: "civil-engineering",
        description:
          "Professional civil engineering and project support.",
        image: serviceImages.services.civil.civilEngineering,
      },
      {
        title: "Estimation & BOQ",
        slug: "estimation-boq",
        description:
          "Prepare construction estimates, quantities and BOQs.",
        image: serviceImages.services.civil.boqEstimationCosting,
      },
      {
        title: "Tenders",
        slug: "tenders",
        description:
          "Find, analyze and prepare documentation for construction tenders.",
        image: serviceImages.services.civil.tendersProcurement,
      },
      {
        title: "Contracts & Documentation",
        slug: "contracts-documentation",
        description:
          "Construction contracts and project documentation support.",
        image: serviceImages.services.civil.contractsDocumentation,
      },
      {
        title: "Contractors & Subcontractors",
        slug: "contractors-subcontractors",
        description:
          "Connect with suitable construction professionals.",
        image: serviceImages.services.civil.contractorsExecution,
      },
      {
        title: "Inspection & Verification",
        slug: "inspection-verification",
        description:
          "Inspection and verification support for construction projects.",
        image: serviceImages.services.civil.inspectionTesting,
      },
      {
        title: "Equipment & Materials",
        slug: "equipment-materials",
        description:
          "Find construction equipment and material suppliers.",
        image: serviceImages.services.civil.constructionMaterialsEquipment,
      },
    ],
  },

  "marketing": {
    title: "Marketing",
    eyebrow: "BUSINESS GROWTH",
    description:
      "Promote your business through digital marketing, outdoor advertising, LED displays, signage, print, media and campaigns.",
    heroImage: serviceImages.categories.marketing,
    services: [
      {
        title: "Digital Marketing",
        slug: "digital-marketing",
        description:
          "Social media, Google Ads, SEO, content and online customer growth.",
        image: serviceImages.services.marketing.digitalMarketing,
      },
      {
        title: "Outdoor Advertising",
        slug: "outdoor-advertising",
        description:
          "Hoardings, billboards, bus shelters, poles and transit advertising.",
        image: serviceImages.services.marketing.outdoorAdvertising,
      },
      {
        title: "LED & Digital Displays",
        slug: "led-digital-displays",
        description:
          "LED signage boards, video walls, digital displays and menu boards.",
        image: serviceImages.services.marketing.ledDigitalDisplays,
      },
      {
        title: "Signage & Branding",
        slug: "signage-branding",
        description:
          "Shop signs, ACP signage, 3D lettering, glow signs and corporate branding.",
        image: serviceImages.services.marketing.signageBranding,
      },
      {
        title: "Print Advertising",
        slug: "print-advertising",
        description:
          "Brochures, flyers, posters, banners, business cards and promotional materials.",
        image: serviceImages.services.marketing.printAdvertising,
      },
      {
        title: "Events & Promotions",
        slug: "events-promotions",
        description:
          "Event branding, exhibitions, stalls, product promotions and campaigns.",
        image: serviceImages.services.marketing.eventsPromotions,
      },
      {
        title: "Media Advertising",
        slug: "media-advertising",
        description:
          "Newspaper, magazine, radio, TV and cinema advertising campaigns.",
        image: serviceImages.services.marketing.mediaAdvertising,
      },
      {
        title: "Marketing Consultation",
        slug: "marketing-consultation",
        description:
          "Marketing strategy, brand strategy, campaign planning and market research.",
        image: serviceImages.services.marketing.marketingConsultation,
      },
    ],
  },

  "tax-compliance": {
    title: "Tax & Compliance",
    eyebrow: "FINANCE & COMPLIANCE",
    carousel: "taxCompliance",
    description:
      "Get assistance with income tax, GST, registrations, TDS and business compliance.",
    heroImage: serviceImages.categories.taxCompliance,
    services: [
      {
        title: "Income Tax Return Filing",
        slug: "income-tax-return-filing",
        description:
          "Get assistance preparing and filing your income tax return.",
        image: serviceImages.services.taxCompliance.incomeTaxReturnFiling,
      },
      {
        title: "GST Registration",
        slug: "gst-registration",
        description:
          "Get assistance with GST registration for your business.",
        image: serviceImages.services.taxCompliance.gstRegistration,
      },
      {
        title: "GST Filing",
        slug: "gst-filing",
        description:
          "Stay compliant with regular GST filing support.",
        image: serviceImages.services.taxCompliance.gstFiling,
      },
      {
        title: "Business Registration",
        slug: "business-registration",
        description:
          "Get help registering and structuring your business.",
        image: serviceImages.services.taxCompliance.businessRegistration,
      },
      {
        title: "TDS Compliance",
        slug: "tds-compliance",
        description:
          "Get assistance with TDS-related compliance requirements.",
        image: serviceImages.services.taxCompliance.tdsCompliance,
      },
      {
        title: "Tax Consultation",
        slug: "tax-consultation",
        description:
          "Get professional guidance for tax-related requirements.",
        image: serviceImages.services.taxCompliance.taxConsultation,
      },
    ],
  },

  "it-technology": {
    title: "IT & Technology",
    eyebrow: "TECHNOLOGY SERVICES",
    carousel: "digital",
    description:
      "Build, deploy and maintain digital products, cloud infrastructure and technology systems.",
    heroImage: serviceImages.categories.digitalTechnology,
    services: [
      {
        title: "Website Development",
        slug: "website-development",
        description:
          "Professional websites for businesses and organizations.",
        image: serviceImages.services.digital.websiteDevelopment,
      },
      {
        title: "Mobile App Development",
        slug: "mobile-app-development",
        description:
          "Build mobile applications for Android and iOS.",
        image: serviceImages.services.digital.mobileAppDevelopment,
      },
      {
        title: "Cloud Services",
        slug: "cloud-services",
        description:
          "Cloud infrastructure and deployment assistance.",
        image: serviceImages.services.digital.cloudServices,
      },
      {
        title: "DevOps Services",
        slug: "devops-services",
        description:
          "CI/CD, cloud automation, containers and DevOps support.",
        image: serviceImages.services.digital.devopsServices,
      },
      {
        title: "IT Support",
        slug: "it-support",
        description:
          "Technology troubleshooting and IT support services.",
        image: serviceImages.services.digital.itSupport,
      },
      {
        title: "Software Consultation",
        slug: "software-consultation",
        description:
          "Get guidance on technology and software decisions.",
        image: serviceImages.services.digital.softwareConsultation,
      },
    ],
  },

  "business-services": {
    title: "Business Services",
    eyebrow: "BUSINESS SUPPORT",
    carousel: "business",
    description:
      "Get practical assistance with business setup, consulting, research, documentation and operations.",
    heroImage: serviceImages.categories.businessServices,
    services: [
      {
        title: "Business Setup",
        slug: "business-setup",
        description:
          "Get assistance setting up and organizing your business.",
        image: serviceImages.services.business.businessSetup,
      },
      {
        title: "Business Consultation",
        slug: "business-consultation",
        description:
          "Get practical guidance for business decisions and growth.",
        image: serviceImages.services.business.businessConsultation,
      },
      {
        title: "Market Research",
        slug: "market-research",
        description:
          "Research markets, customers and competitors.",
        image: serviceImages.services.business.marketResearch,
      },
      {
        title: "Documentation Services",
        slug: "documentation-services",
        description:
          "Professional business documentation assistance.",
        image: serviceImages.services.business.documentationServices,
      },
      {
        title: "Vendor Assistance",
        slug: "vendor-assistance",
        description:
          "Find and coordinate with suitable vendors and suppliers.",
        image: serviceImages.services.business.vendorAssistance,
      },
      {
        title: "Business Process Support",
        slug: "business-process-support",
        description:
          "Improve and organize day-to-day business processes.",
        image: serviceImages.services.business.businessProcessSupport,
      },
    ],
  },

  "local-professional-services": {
    title: "Local & Professional Services",
    eyebrow: "EVERYDAY SERVICES",
    carousel: "other",
    description:
      "Find practical local services and professional assistance for your home and business.",
    heroImage: serviceImages.categories.localProfessionalServices,
    services: [
      {
        title: "Home Services",
        slug: "home-services",
        description:
          "Find trusted professionals for everyday home requirements.",
        image: serviceImages.services.other.homeServices,
      },
      {
        title: "AC Service & Repair",
        slug: "ac-service-repair",
        description:
          "Professional AC maintenance and repair assistance.",
        image: serviceImages.services.other.acServiceRepair,
      },
      {
        title: "Electrical Services",
        slug: "electrical-services",
        description:
          "Get assistance with electrical installation and repairs.",
        image: serviceImages.services.other.electricalServices,
      },
      {
        title: "Plumbing Services",
        slug: "plumbing-services",
        description:
          "Professional plumbing repair and maintenance.",
        image: serviceImages.services.other.plumbingServices,
      },
      {
        title: "Pest Control",
        slug: "pest-control",
        description:
          "Safe and effective pest control solutions.",
        image: serviceImages.services.other.pestControl,
      },
      {
        title: "Professional Consultation",
        slug: "professional-consultation",
        description:
          "Connect with professionals for specific requirements.",
        image: serviceImages.services.other.professionalConsultation,
      },
      {
        title: "Interior Design",
        slug: "interior-design",
        description: "Modern and functional designs for your space.",
        image: serviceImages.services.other.interiorDesign,
      },
    ],
  },
};

export function getCategoryServiceData(categorySlug: string, serviceSlug: string) {
  const category = categories[categorySlug];
  const service = category?.services.find((item) => item.slug === serviceSlug);

  if (!category || !service) {
    return null;
  }

  return {
    categoryTitle: category.title,
    categoryEyebrow: category.eyebrow,
    service,
  };
}
