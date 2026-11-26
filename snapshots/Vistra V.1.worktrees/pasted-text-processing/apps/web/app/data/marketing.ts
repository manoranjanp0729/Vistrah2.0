export type MarketingService = {
  slug: string
  name: string
  description: string
  image?: string
  fields: {
    name: string
    label: string
    type: "text" | "textarea" | "select" | "number" | "file"
    required?: boolean
    options?: string[]
    placeholder?: string
  }[]
}

export type MarketingSubcategory = {
  slug: string
  name: string
  description: string
  icon: string
  image?: string
  services: MarketingService[]
}

const marketingDefaultImage = "/images/photos/marketing/digital-marketing.jpg"

const marketingCategoryImages: Record<string, string> = {
  "digital-marketing": "/images/photos/marketing/digital-marketing.jpg",
  "outdoor-advertising": "/images/photos/marketing/outdoor-advertising.jpg",
  "led-digital-displays": "/images/photos/marketing/led-digital-displays.jpg",
  "signage-branding": "/images/photos/marketing/signage-branding.jpg",
  "print-advertising": "/images/photos/marketing/print-advertising.jpg",
  "events-promotions": "/images/photos/marketing/events-promotions.jpg",
  "media-advertising": "/images/photos/marketing/media-advertising.jpg",
  "marketing-consultation": "/images/photos/marketing/marketing-consultation.jpg",
}

export const marketingSubcategories: MarketingSubcategory[] = [
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    description: "Grow your business online with targeted digital marketing services.",
    image: marketingCategoryImages["digital-marketing"] || marketingDefaultImage,
    icon: "📱",
    services: [
      {
        slug: "social-media-marketing",
        name: "Social Media Marketing",
        description: "Build your brand and reach customers across social media platforms.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "industry", label: "Industry / Business Type", type: "text", required: true },
          { name: "platforms", label: "Preferred Platforms", type: "select", required: true, options: ["Instagram", "Facebook", "Instagram + Facebook", "LinkedIn", "YouTube", "All Major Platforms"] },
          { name: "followers", label: "Current Followers", type: "number" },
          { name: "audience", label: "Target Audience", type: "textarea", placeholder: "Tell us about your target customers" },
          { name: "budget", label: "Monthly Marketing Budget", type: "number" },
          { name: "goals", label: "Marketing Goals", type: "textarea", required: true }
        ]
      },
      {
        slug: "google-ads",
        name: "Google Ads",
        description: "Reach customers actively searching for your products and services.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "website", label: "Website", type: "text" },
          { name: "location", label: "Target Location", type: "text", required: true },
          { name: "budget", label: "Monthly Ad Budget", type: "number", required: true },
          { name: "goals", label: "Campaign Goal", type: "textarea", required: true }
        ]
      },
      {
        slug: "seo",
        name: "SEO",
        description: "Improve your website visibility and organic search rankings.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "website", label: "Website", type: "text", required: true },
          { name: "location", label: "Target Location", type: "text" },
          { name: "keywords", label: "Important Keywords", type: "textarea" },
          { name: "goals", label: "SEO Goals", type: "textarea", required: true }
        ]
      },
      {
        slug: "content-marketing",
        name: "Content Marketing",
        description: "Create useful content that attracts and converts your target audience.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "contentType", label: "Content Required", type: "select", options: ["Blogs", "Social Media", "Videos", "Articles", "All"] },
          { name: "audience", label: "Target Audience", type: "textarea", required: true },
          { name: "goals", label: "Content Goals", type: "textarea" }
        ]
      },
      {
        slug: "website-marketing",
        name: "Website Marketing",
        description: "Promote your website and convert more visitors into customers.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "website", label: "Website", type: "text", required: true },
          { name: "traffic", label: "Current Monthly Traffic", type: "number" },
          { name: "goals", label: "Marketing Goals", type: "textarea", required: true }
        ]
      },
      {
        slug: "influencer-marketing",
        name: "Influencer Marketing",
        description: "Connect your brand with relevant creators and influencers.",
        fields: [
          { name: "businessName", label: "Brand / Business Name", type: "text", required: true },
          { name: "industry", label: "Industry", type: "text", required: true },
          { name: "location", label: "Target Location", type: "text" },
          { name: "budget", label: "Campaign Budget", type: "number" },
          { name: "requirements", label: "Campaign Requirements", type: "textarea" }
        ]
      },
      {
        slug: "whatsapp-marketing",
        name: "WhatsApp Marketing",
        description: "Reach customers directly through WhatsApp campaigns.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "audienceSize", label: "Approximate Customer List Size", type: "number" },
          { name: "campaignType", label: "Campaign Type", type: "select", options: ["Promotional", "Offers", "Product Launch", "Customer Updates", "Other"] },
          { name: "details", label: "Campaign Details", type: "textarea" }
        ]
      },
      {
        slug: "email-marketing",
        name: "Email Marketing",
        description: "Build customer relationships through targeted email campaigns.",
        fields: [
          { name: "businessName", label: "Business Name", type: "text", required: true },
          { name: "audienceSize", label: "Email List Size", type: "number" },
          { name: "campaignType", label: "Campaign Type", type: "select", options: ["Promotional", "Newsletter", "Product Launch", "Lead Nurturing", "Other"] },
          { name: "goals", label: "Campaign Goals", type: "textarea" }
        ]
      }
    ]
  },
  {
    slug: "outdoor-advertising",
    name: "Outdoor Advertising",
    description: "Promote your business through high-visibility outdoor advertising.",
    image: marketingCategoryImages["outdoor-advertising"] || marketingDefaultImage,
    icon: "🏙️",
    services: [
      { slug: "hoardings", name: "Hoardings", description: "Large-format outdoor advertising spaces.", fields: [
        { name: "location", label: "Preferred Location", type: "text", required: true },
        { name: "size", label: "Required Size", type: "text" },
        { name: "duration", label: "Campaign Duration", type: "text" },
        { name: "budget", label: "Expected Budget", type: "number" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "billboard-advertising", name: "Billboard Advertising", description: "Reach large audiences with strategic billboard placements.", fields: [
        { name: "location", label: "Preferred Location", type: "text", required: true },
        { name: "size", label: "Required Size", type: "text" },
        { name: "duration", label: "Campaign Duration", type: "text" },
        { name: "budget", label: "Budget", type: "number" }
      ]},
      { slug: "bus-shelter-advertising", name: "Bus Shelter Advertising", description: "Advertise in high-footfall public locations.", fields: [
        { name: "location", label: "Preferred Location", type: "text", required: true },
        { name: "duration", label: "Campaign Duration", type: "text" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "pole-advertising", name: "Pole Advertising", description: "Create repeated local visibility using pole advertising.", fields: [
        { name: "location", label: "Location", type: "text", required: true },
        { name: "quantity", label: "Approximate Number of Poles", type: "number" },
        { name: "duration", label: "Duration", type: "text" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "transit-advertising", name: "Transit Advertising", description: "Advertise across buses and other transportation media.", fields: [
        { name: "location", label: "Target Location", type: "text", required: true },
        { name: "vehicleType", label: "Transit Type", type: "select", options: ["Bus", "Auto", "Cab", "Metro", "Other"] },
        { name: "duration", label: "Campaign Duration", type: "text" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]}
    ]
  },
  {
    slug: "led-digital-displays",
    name: "LED & Digital Displays",
    description: "LED signage, video walls and digital displays for indoor and outdoor use.",
    image: marketingCategoryImages["led-digital-displays"] || marketingDefaultImage,
    icon: "💡",
    services: [
      {
        slug: "led-signage-boards",
        name: "LED Signage Boards",
        description: "Get LED signage designed, supplied and installed for your business.",
        fields: [
          { name: "requirement", label: "Requirement", type: "select", required: true, options: ["New Board", "Replacement", "Upgrade"] },
          { name: "usage", label: "Usage", type: "select", required: true, options: ["Indoor", "Outdoor"] },
          { name: "dimensions", label: "Required Dimensions", type: "text", required: true, placeholder: "Example: 10 ft × 4 ft" },
          { name: "colour", label: "Display Type", type: "select", required: true, options: ["Single Colour", "RGB", "Full Colour"] },
          { name: "pixelPitch", label: "Pixel Pitch", type: "select", options: ["P2", "P3", "P4", "P5", "P6", "Not Sure"] },
          { name: "content", label: "Content / Software Requirement", type: "textarea" },
          { name: "displayType", label: "Display Content", type: "select", options: ["Static", "Scrolling", "Video", "Mixed"] },
          { name: "installation", label: "Installation Required", type: "select", options: ["Yes", "No", "Not Sure"] },
          { name: "maintenance", label: "AMC / Maintenance", type: "select", options: ["Required", "Not Required", "Not Sure"] },
          { name: "budget", label: "Expected Budget", type: "number" },
          { name: "logo", label: "Upload Logo / Design", type: "file" },
          { name: "sitePhoto", label: "Upload Site Photo", type: "file" },
          { name: "location", label: "Installation Location", type: "text", required: true }
        ]
      },
      { slug: "led-video-walls", name: "LED Video Walls", description: "Large-format LED video walls for advertising, events and commercial spaces.", fields: [
        { name: "usage", label: "Usage", type: "select", options: ["Indoor", "Outdoor"], required: true },
        { name: "dimensions", label: "Required Dimensions", type: "text", required: true },
        { name: "pixelPitch", label: "Pixel Pitch", type: "select", options: ["P2", "P3", "P4", "P5", "P6", "Not Sure"] },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "budget", label: "Expected Budget", type: "number" },
        { name: "details", label: "Additional Requirements", type: "textarea" }
      ]},
      { slug: "digital-display-boards", name: "Digital Display Boards", description: "Digital display boards for retail, offices and commercial locations.", fields: [
        { name: "usage", label: "Usage", type: "select", options: ["Indoor", "Outdoor"], required: true },
        { name: "dimensions", label: "Required Dimensions", type: "text" },
        { name: "content", label: "Content Requirement", type: "textarea" },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "budget", label: "Expected Budget", type: "number" }
      ]},
      { slug: "indoor-led-displays", name: "Indoor LED Displays", description: "Premium indoor LED displays for businesses and events.", fields: [
        { name: "dimensions", label: "Required Dimensions", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "content", label: "Content Requirement", type: "textarea" },
        { name: "budget", label: "Expected Budget", type: "number" }
      ]},
      { slug: "outdoor-led-displays", name: "Outdoor LED Displays", description: "Weather-resistant outdoor LED display solutions.", fields: [
        { name: "dimensions", label: "Required Dimensions", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "brightness", label: "Brightness / Visibility Requirement", type: "text" },
        { name: "budget", label: "Expected Budget", type: "number" }
      ]},
      { slug: "digital-menu-boards", name: "Digital Menu Boards", description: "Modern digital menu displays for restaurants and food businesses.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "screenCount", label: "Number of Screens", type: "number", required: true },
        { name: "dimensions", label: "Preferred Screen Size", type: "text" },
        { name: "content", label: "Menu / Content Requirement", type: "textarea" },
        { name: "location", label: "Location", type: "text", required: true }
      ]}
    ]
  },
  {
    slug: "signage-branding",
    name: "Signage & Branding",
    description: "Professional signage and visual branding solutions for businesses.",
    image: marketingCategoryImages["signage-branding"] || marketingDefaultImage,
    icon: "🏷️",
    services: [
      { slug: "shop-sign-boards", name: "Shop Sign Boards", description: "Custom sign boards for shops and commercial establishments.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "dimensions", label: "Required Dimensions", type: "text", required: true },
        { name: "material", label: "Preferred Material", type: "text" },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "budget", label: "Budget", type: "number" }
      ]},
      { slug: "acp-signage", name: "ACP Signage", description: "Durable ACP signage for commercial exteriors and interiors.", fields: [
        { name: "dimensions", label: "Dimensions", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "design", label: "Design Details", type: "textarea" },
        { name: "budget", label: "Budget", type: "number" }
      ]},
      { slug: "3d-lettering", name: "3D Lettering", description: "Premium 3D letters for storefronts and corporate branding.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "dimensions", label: "Approximate Dimensions", type: "text" },
        { name: "material", label: "Preferred Material", type: "text" },
        { name: "location", label: "Location", type: "text", required: true }
      ]},
      { slug: "glow-sign-boards", name: "Glow Sign Boards", description: "Illuminated signage for high visibility day and night.", fields: [
        { name: "dimensions", label: "Dimensions", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "design", label: "Design Details", type: "textarea" },
        { name: "budget", label: "Budget", type: "number" }
      ]},
      { slug: "neon-signage", name: "Neon Signage", description: "Custom neon signs for businesses, interiors and events.", fields: [
        { name: "text", label: "Text / Name for Sign", type: "text", required: true },
        { name: "dimensions", label: "Approximate Dimensions", type: "text" },
        { name: "location", label: "Installation Location", type: "text", required: true },
        { name: "budget", label: "Budget", type: "number" }
      ]},
      { slug: "directional-signage", name: "Directional Signage", description: "Wayfinding and directional signage systems.", fields: [
        { name: "location", label: "Location", type: "text", required: true },
        { name: "quantity", label: "Approximate Quantity", type: "number" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "corporate-branding", name: "Corporate Branding", description: "Complete visual branding solutions for offices and businesses.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "requirements", label: "Branding Requirements", type: "textarea", required: true },
        { name: "budget", label: "Budget", type: "number" }
      ]}
    ]
  },
  {
    slug: "print-advertising",
    name: "Print Advertising",
    description: "Professional print materials for marketing and business promotion.",
    image: marketingCategoryImages["print-advertising"] || marketingDefaultImage,
    icon: "🖨️",
    services: [
      { slug: "brochures", name: "Brochures", description: "Professional brochures for products and services.", fields: [
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "size", label: "Preferred Size", type: "text" },
        { name: "pages", label: "Number of Pages", type: "number" },
        { name: "details", label: "Design / Printing Requirements", type: "textarea" }
      ]},
      { slug: "flyers", name: "Flyers", description: "Promotional flyers for businesses and campaigns.", fields: [
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "size", label: "Flyer Size", type: "text" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "posters", name: "Posters", description: "Eye-catching posters for promotions and advertising.", fields: [
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "size", label: "Poster Size", type: "text" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "business-cards", name: "Business Cards", description: "Professional business cards for individuals and companies.", fields: [
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "details", label: "Design Requirements", type: "textarea" },
        { name: "logo", label: "Upload Logo", type: "file" }
      ]},
      { slug: "banners", name: "Banners", description: "Printed banners for events, shops and promotions.", fields: [
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "dimensions", label: "Dimensions", type: "text", required: true },
        { name: "location", label: "Usage Location", type: "text" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "promotional-materials", name: "Promotional Materials", description: "Custom printed promotional materials for your business.", fields: [
        { name: "material", label: "Material Required", type: "text", required: true },
        { name: "quantity", label: "Quantity", type: "number" },
        { name: "budget", label: "Budget", type: "number" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]}
    ]
  },
  {
    slug: "events-promotions",
    name: "Events & Promotions",
    description: "Branding, promotions and marketing support for events and campaigns.",
    image: marketingCategoryImages["events-promotions"] || marketingDefaultImage,
    icon: "🎪",
    services: [
      { slug: "event-branding", name: "Event Branding", description: "Complete branding solutions for events.", fields: [
        { name: "eventName", label: "Event Name", type: "text", required: true },
        { name: "eventDate", label: "Event Date", type: "text" },
        { name: "location", label: "Event Location", type: "text", required: true },
        { name: "requirements", label: "Branding Requirements", type: "textarea", required: true }
      ]},
      { slug: "exhibition-branding", name: "Exhibition Branding", description: "Branding solutions for exhibitions and trade shows.", fields: [
        { name: "eventName", label: "Exhibition Name", type: "text", required: true },
        { name: "stallSize", label: "Stall Size", type: "text" },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "requirements", label: "Requirements", type: "textarea" }
      ]},
      { slug: "stall-branding", name: "Stall Branding", description: "Professional branding and setup for exhibition stalls.", fields: [
        { name: "stallSize", label: "Stall Size", type: "text", required: true },
        { name: "location", label: "Location", type: "text", required: true },
        { name: "requirements", label: "Requirements", type: "textarea" }
      ]},
      { slug: "product-promotions", name: "Product Promotions", description: "Promote products through targeted campaigns and activations.", fields: [
        { name: "product", label: "Product Name", type: "text", required: true },
        { name: "location", label: "Target Location", type: "text" },
        { name: "budget", label: "Campaign Budget", type: "number" },
        { name: "goals", label: "Campaign Goals", type: "textarea", required: true }
      ]},
      { slug: "promotional-campaigns", name: "Promotional Campaigns", description: "Plan and execute promotional marketing campaigns.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "campaign", label: "Campaign Details", type: "textarea", required: true },
        { name: "budget", label: "Campaign Budget", type: "number" },
        { name: "location", label: "Target Location", type: "text" }
      ]}
    ]
  },
  {
    slug: "media-advertising",
    name: "Media Advertising",
    description: "Traditional media advertising across print, radio, television and cinema.",
    image: marketingCategoryImages["media-advertising"] || marketingDefaultImage,
    icon: "📺",
    services: [
      { slug: "newspaper-advertising", name: "Newspaper Advertising", description: "Advertise your business in newspapers.", fields: [
        { name: "publication", label: "Preferred Publication", type: "text" },
        { name: "location", label: "Target Location", type: "text", required: true },
        { name: "adSize", label: "Advertisement Size", type: "text" },
        { name: "budget", label: "Budget", type: "number" },
        { name: "details", label: "Advertisement Details", type: "textarea", required: true }
      ]},
      { slug: "magazine-advertising", name: "Magazine Advertising", description: "Reach targeted audiences through magazine advertising.", fields: [
        { name: "magazine", label: "Preferred Magazine", type: "text" },
        { name: "location", label: "Target Market", type: "text" },
        { name: "budget", label: "Budget", type: "number" },
        { name: "details", label: "Requirements", type: "textarea" }
      ]},
      { slug: "radio-advertising", name: "Radio Advertising", description: "Promote your business through radio campaigns.", fields: [
        { name: "location", label: "Target Location", type: "text", required: true },
        { name: "duration", label: "Campaign Duration", type: "text" },
        { name: "budget", label: "Budget", type: "number" },
        { name: "details", label: "Campaign Details", type: "textarea" }
      ]},
      { slug: "tv-advertising", name: "TV Advertising", description: "Reach broad audiences through television advertising.", fields: [
        { name: "location", label: "Target Location", type: "text", required: true },
        { name: "channel", label: "Preferred Channel", type: "text" },
        { name: "budget", label: "Budget", type: "number" },
        { name: "details", label: "Campaign Details", type: "textarea" }
      ]},
      { slug: "cinema-advertising", name: "Cinema Advertising", description: "Reach local audiences through cinema advertising.", fields: [
        { name: "location", label: "Target Location", type: "text", required: true },
        { name: "cinema", label: "Preferred Cinema / Chain", type: "text" },
        { name: "duration", label: "Campaign Duration", type: "text" },
        { name: "budget", label: "Budget", type: "number" }
      ]}
    ]
  },
  {
    slug: "marketing-consultation",
    name: "Marketing Consultation",
    description: "Get professional guidance for strategy, branding and marketing campaigns.",
    image: marketingCategoryImages["marketing-consultation"] || marketingDefaultImage,
    icon: "📊",
    services: [
      { slug: "marketing-strategy", name: "Marketing Strategy", description: "Develop a practical marketing strategy for your business.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "industry", label: "Industry", type: "text", required: true },
        { name: "budget", label: "Marketing Budget", type: "number" },
        { name: "goals", label: "Business Goals", type: "textarea", required: true }
      ]},
      { slug: "brand-strategy", name: "Brand Strategy", description: "Build a clear and consistent brand strategy.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "industry", label: "Industry", type: "text", required: true },
        { name: "audience", label: "Target Audience", type: "textarea" },
        { name: "goals", label: "Brand Goals", type: "textarea", required: true }
      ]},
      { slug: "campaign-planning", name: "Campaign Planning", description: "Plan marketing campaigns from concept to execution.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "campaign", label: "Campaign Objective", type: "textarea", required: true },
        { name: "budget", label: "Campaign Budget", type: "number" },
        { name: "duration", label: "Expected Duration", type: "text" }
      ]},
      { slug: "market-research", name: "Market Research", description: "Understand your market, customers and competitors.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "industry", label: "Industry", type: "text", required: true },
        { name: "location", label: "Target Market", type: "text" },
        { name: "researchNeeds", label: "Research Requirements", type: "textarea", required: true }
      ]},
      { slug: "marketing-consultation", name: "Marketing Consultation", description: "Get expert guidance for your marketing decisions.", fields: [
        { name: "businessName", label: "Business Name", type: "text", required: true },
        { name: "industry", label: "Industry", type: "text" },
        { name: "challenge", label: "What do you need help with?", type: "textarea", required: true },
        { name: "budget", label: "Approximate Budget", type: "number" }
      ]}
    ]
  }
]

export function getMarketingSubcategory(slug: string) {
  return marketingSubcategories.find((item) => item.slug === slug)
}

export function getMarketingService(subslug: string, serviceSlug: string) {
  const subcategory = getMarketingSubcategory(subslug)
  return subcategory?.services.find((item) => item.slug === serviceSlug)
}
