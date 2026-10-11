export type EstimateField={id:string;label:string;kind:"text"|"number"|"choice";options?:string[]};
export const estimateScopes:Record<string,EstimateField[]> = {
  "resume-building": [
    {
      "id": "scope1",
      "label": "Target role",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Career stage",
      "kind": "choice",
      "options": [
        "Fresher",
        "Experienced",
        "Career change"
      ]
    },
    {
      "id": "scope3",
      "label": "Resume length (pages)",
      "kind": "number"
    }
  ],
  "job-application-assistance": [
    {
      "id": "scope1",
      "label": "Target roles and industries",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Applications needed",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Application support",
      "kind": "choice",
      "options": [
        "Search and shortlist",
        "Application preparation",
        "End-to-end assistance"
      ]
    }
  ],
  "linkedin-profile": [
    {
      "id": "scope1",
      "label": "Target audience or role",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Profile work",
      "kind": "choice",
      "options": [
        "New profile",
        "Profile rewrite",
        "Profile review"
      ]
    },
    {
      "id": "scope3",
      "label": "Current experience and achievements",
      "kind": "text"
    }
  ],
  "interview-preparation": [
    {
      "id": "scope1",
      "label": "Role and interview stage",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Interview type",
      "kind": "choice",
      "options": [
        "Technical",
        "HR",
        "Case study",
        "Leadership"
      ]
    },
    {
      "id": "scope3",
      "label": "Practice sessions needed",
      "kind": "number"
    }
  ],
  "career-consultation": [
    {
      "id": "scope1",
      "label": "Current career situation",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Career goal",
      "kind": "choice",
      "options": [
        "First job",
        "Career change",
        "Growth",
        "Return to work"
      ]
    },
    {
      "id": "scope3",
      "label": "Questions to discuss",
      "kind": "text"
    }
  ],
  "job-search-assistance": [
    {
      "id": "scope1",
      "label": "Preferred roles",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Work arrangement",
      "kind": "choice",
      "options": [
        "On-site",
        "Remote",
        "Hybrid",
        "Any"
      ]
    },
    {
      "id": "scope3",
      "label": "Preferred industries and experience",
      "kind": "text"
    }
  ],
  "property-search": [
    {
      "id": "scope1",
      "label": "Preferred neighbourhoods",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Property use",
      "kind": "choice",
      "options": [
        "Residential",
        "Commercial",
        "Land"
      ]
    },
    {
      "id": "scope3",
      "label": "Required area (sq ft)",
      "kind": "number"
    }
  ],
  "property-verification": [
    {
      "id": "scope1",
      "label": "Property location and type",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Checks needed",
      "kind": "choice",
      "options": [
        "Title and documents",
        "Site and condition",
        "Both"
      ]
    },
    {
      "id": "scope3",
      "label": "Available property documents (names only)",
      "kind": "text"
    }
  ],
  "property-valuation": [
    {
      "id": "scope1",
      "label": "Property type and area",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Valuation purpose",
      "kind": "choice",
      "options": [
        "Sale",
        "Purchase",
        "Rental",
        "Planning"
      ]
    },
    {
      "id": "scope3",
      "label": "Property age and condition",
      "kind": "text"
    }
  ],
  "buy-property": [
    {
      "id": "scope1",
      "label": "Preferred locality",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Property type",
      "kind": "choice",
      "options": [
        "Apartment",
        "Independent house",
        "Land",
        "Commercial"
      ]
    },
    {
      "id": "scope3",
      "label": "Purchase budget range",
      "kind": "text"
    }
  ],
  "sell-property": [
    {
      "id": "scope1",
      "label": "Property locality and size",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Property type",
      "kind": "choice",
      "options": [
        "Apartment",
        "Independent house",
        "Land",
        "Commercial"
      ]
    },
    {
      "id": "scope3",
      "label": "Expected selling price range",
      "kind": "text"
    }
  ],
  "rental-assistance": [
    {
      "id": "scope1",
      "label": "Preferred locality",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Rental use",
      "kind": "choice",
      "options": [
        "Home",
        "Office",
        "Shop",
        "Warehouse"
      ]
    },
    {
      "id": "scope3",
      "label": "Monthly rent budget range",
      "kind": "text"
    }
  ],
  "residential-construction": [
    {
      "id": "scope1",
      "label": "Built-up area (sq ft)",
      "kind": "number"
    },
    {
      "id": "scope2",
      "label": "Floors planned",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Scope",
      "kind": "choice",
      "options": [
        "New construction",
        "Extension",
        "Renovation"
      ]
    }
  ],
  "commercial-construction": [
    {
      "id": "scope1",
      "label": "Building use",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Built-up area (sq ft)",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Scope",
      "kind": "choice",
      "options": [
        "Shell construction",
        "Turnkey",
        "Renovation"
      ]
    }
  ],
  "architecture-design": [
    {
      "id": "scope1",
      "label": "Plot dimensions and location",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Design scope",
      "kind": "choice",
      "options": [
        "Concept",
        "Plans and approvals",
        "Full design"
      ]
    },
    {
      "id": "scope3",
      "label": "Floors and rooms required",
      "kind": "text"
    }
  ],
  "civil-engineering": [
    {
      "id": "scope1",
      "label": "Project type and current stage",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Engineering scope",
      "kind": "choice",
      "options": [
        "Structural design",
        "Site supervision",
        "Technical review"
      ]
    },
    {
      "id": "scope3",
      "label": "Project area and constraints",
      "kind": "text"
    }
  ],
  "estimation-boq": [
    {
      "id": "scope1",
      "label": "Project type and area",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Estimate scope",
      "kind": "choice",
      "options": [
        "Preliminary estimate",
        "Detailed BOQ",
        "Quantity take-off"
      ]
    },
    {
      "id": "scope3",
      "label": "Drawings available",
      "kind": "choice",
      "options": [
        "Yes",
        "Partial",
        "No"
      ]
    }
  ],
  "tenders": [
    {
      "id": "scope1",
      "label": "Tender sector and project",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Assistance",
      "kind": "choice",
      "options": [
        "Bid preparation",
        "Eligibility review",
        "Costing",
        "Documentation"
      ]
    },
    {
      "id": "scope3",
      "label": "Submission deadline",
      "kind": "text"
    }
  ],
  "contracts-documentation": [
    {
      "id": "scope1",
      "label": "Project and parties involved",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Document type",
      "kind": "choice",
      "options": [
        "Work contract",
        "Subcontract",
        "Agreement review",
        "Project records"
      ]
    },
    {
      "id": "scope3",
      "label": "Documents required",
      "kind": "number"
    }
  ],
  "contractors-subcontractors": [
    {
      "id": "scope1",
      "label": "Trade or work package",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Work quantity and units",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Engagement",
      "kind": "choice",
      "options": [
        "Labour only",
        "Labour and materials",
        "Specialist subcontract"
      ]
    }
  ],
  "inspection-verification": [
    {
      "id": "scope1",
      "label": "Asset or site to inspect",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Inspection purpose",
      "kind": "choice",
      "options": [
        "Quality",
        "Progress",
        "Handover",
        "Condition"
      ]
    },
    {
      "id": "scope3",
      "label": "Site area and inspection points",
      "kind": "text"
    }
  ],
  "equipment-materials": [
    {
      "id": "scope1",
      "label": "Equipment or material needed",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Quantity and units",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Requirement",
      "kind": "choice",
      "options": [
        "Purchase",
        "Rental",
        "Supply comparison"
      ]
    }
  ],
  "retractable-roofing": [
    {
      "id": "scope1",
      "label": "Roof width (metres)",
      "kind": "number"
    },
    {
      "id": "scope2",
      "label": "Roof length (metres)",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Operation",
      "kind": "choice",
      "options": [
        "Manual",
        "Motorised",
        "Need advice"
      ]
    }
  ],
  "bioclimatic-pergolas": [
    {
      "id": "scope1",
      "label": "Pergola width (metres)",
      "kind": "number"
    },
    {
      "id": "scope2",
      "label": "Pergola length (metres)",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Installation",
      "kind": "choice",
      "options": [
        "Freestanding",
        "Wall-mounted",
        "Need advice"
      ]
    }
  ],
  "glass-systems": [
    {
      "id": "scope1",
      "label": "Installation",
      "kind": "choice",
      "options": [
        "Sliding glass",
        "Fixed glazing",
        "Folding glass",
        "Need advice"
      ]
    },
    {
      "id": "scope2",
      "label": "Opening width and height (metres)",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Glass and frame preferences",
      "kind": "text"
    }
  ],
  "outdoor-structures": [
    {
      "id": "scope1",
      "label": "Structure",
      "kind": "choice",
      "options": [
        "Canopy",
        "Gazebo",
        "Carport",
        "Other"
      ]
    },
    {
      "id": "scope2",
      "label": "Covered area (sq ft)",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Site conditions and material preferences",
      "kind": "text"
    }
  ],
  "digital-marketing": [
    {
      "id": "scope1",
      "label": "Business and target audience",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Primary goal",
      "kind": "choice",
      "options": [
        "Leads",
        "Sales",
        "Brand awareness",
        "Website traffic"
      ]
    },
    {
      "id": "scope3",
      "label": "Channels and monthly advertising budget",
      "kind": "text"
    }
  ],
  "outdoor-advertising": [
    {
      "id": "scope1",
      "label": "Campaign city and areas",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Format",
      "kind": "choice",
      "options": [
        "Billboard",
        "Transit",
        "Street furniture",
        "Mixed"
      ]
    },
    {
      "id": "scope3",
      "label": "Campaign duration and placements",
      "kind": "text"
    }
  ],
  "led-digital-displays": [
    {
      "id": "scope1",
      "label": "Display use",
      "kind": "choice",
      "options": [
        "Indoor",
        "Outdoor",
        "Event"
      ]
    },
    {
      "id": "scope2",
      "label": "Screen width and height (metres)",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Supply scope",
      "kind": "choice",
      "options": [
        "Purchase",
        "Installation",
        "Rental"
      ]
    }
  ],
  "signage-branding": [
    {
      "id": "scope1",
      "label": "Signage type",
      "kind": "choice",
      "options": [
        "Shopfront",
        "Office",
        "Wayfinding",
        "Vehicle branding"
      ]
    },
    {
      "id": "scope2",
      "label": "Sign dimensions and quantity",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Material and lighting preferences",
      "kind": "text"
    }
  ],
  "print-advertising": [
    {
      "id": "scope1",
      "label": "Print format",
      "kind": "choice",
      "options": [
        "Brochure",
        "Flyer",
        "Poster",
        "Newspaper"
      ]
    },
    {
      "id": "scope2",
      "label": "Copies or placements needed",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Design readiness",
      "kind": "choice",
      "options": [
        "Print-ready",
        "Design required",
        "Needs revision"
      ]
    }
  ],
  "events-promotions": [
    {
      "id": "scope1",
      "label": "Event type and location",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Expected attendees",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Support",
      "kind": "choice",
      "options": [
        "Planning",
        "Promotion",
        "On-ground execution",
        "Full event"
      ]
    }
  ],
  "media-advertising": [
    {
      "id": "scope1",
      "label": "Media",
      "kind": "choice",
      "options": [
        "Radio",
        "Television",
        "Digital publication",
        "Mixed"
      ]
    },
    {
      "id": "scope2",
      "label": "Audience and campaign regions",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Campaign duration and spot count",
      "kind": "text"
    }
  ],
  "marketing-consultation": [
    {
      "id": "scope1",
      "label": "Business and market",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Focus",
      "kind": "choice",
      "options": [
        "Strategy",
        "Brand positioning",
        "Campaign review",
        "Go-to-market"
      ]
    },
    {
      "id": "scope3",
      "label": "Current challenge and goals",
      "kind": "text"
    }
  ],
  "income-tax-return-filing": [
    {
      "id": "scope1",
      "label": "Financial year",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Income sources",
      "kind": "choice",
      "options": [
        "Salary",
        "Business",
        "Capital gains",
        "Multiple sources"
      ]
    },
    {
      "id": "scope3",
      "label": "Returns needed",
      "kind": "number"
    }
  ],
  "gst-registration": [
    {
      "id": "scope1",
      "label": "Business activity and entity type",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Registration",
      "kind": "choice",
      "options": [
        "New registration",
        "Additional state",
        "Amendment"
      ]
    },
    {
      "id": "scope3",
      "label": "States requiring registration",
      "kind": "number"
    }
  ],
  "gst-filing": [
    {
      "id": "scope1",
      "label": "Return period",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Filing frequency",
      "kind": "choice",
      "options": [
        "Monthly",
        "Quarterly",
        "Backlog"
      ]
    },
    {
      "id": "scope3",
      "label": "Approximate invoices per period",
      "kind": "number"
    }
  ],
  "business-registration": [
    {
      "id": "scope1",
      "label": "Entity",
      "kind": "choice",
      "options": [
        "Proprietorship",
        "Partnership",
        "LLP",
        "Private limited",
        "Need advice"
      ]
    },
    {
      "id": "scope2",
      "label": "Business activity",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Founders or partners",
      "kind": "number"
    }
  ],
  "tds-compliance": [
    {
      "id": "scope1",
      "label": "Compliance period",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Work",
      "kind": "choice",
      "options": [
        "Returns",
        "Calculation",
        "Corrections",
        "Full compliance"
      ]
    },
    {
      "id": "scope3",
      "label": "Approximate deductee count",
      "kind": "number"
    }
  ],
  "tax-consultation": [
    {
      "id": "scope1",
      "label": "Tax area",
      "kind": "choice",
      "options": [
        "Income tax",
        "GST",
        "TDS",
        "Other"
      ]
    },
    {
      "id": "scope2",
      "label": "Question or situation",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Consultation",
      "kind": "choice",
      "options": [
        "One-time",
        "Ongoing"
      ]
    }
  ],
  "website-development": [
    {
      "id": "scope1",
      "label": "Website type",
      "kind": "choice",
      "options": [
        "Business",
        "E-commerce",
        "Portal",
        "Landing page"
      ]
    },
    {
      "id": "scope2",
      "label": "Approximate pages",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Features and integrations",
      "kind": "text"
    }
  ],
  "mobile-app-development": [
    {
      "id": "scope1",
      "label": "Platforms",
      "kind": "choice",
      "options": [
        "Android",
        "iOS",
        "Both"
      ]
    },
    {
      "id": "scope2",
      "label": "App purpose and user roles",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Features and integrations",
      "kind": "text"
    }
  ],
  "cloud-services": [
    {
      "id": "scope1",
      "label": "Cloud requirement",
      "kind": "choice",
      "options": [
        "Migration",
        "New setup",
        "Optimisation",
        "Backup"
      ]
    },
    {
      "id": "scope2",
      "label": "Current provider and workloads",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Storage and traffic requirements",
      "kind": "text"
    }
  ],
  "devops-services": [
    {
      "id": "scope1",
      "label": "Project stack and hosting",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Support",
      "kind": "choice",
      "options": [
        "CI/CD",
        "Infrastructure",
        "Monitoring",
        "Full DevOps"
      ]
    },
    {
      "id": "scope3",
      "label": "Environments and deployment frequency",
      "kind": "text"
    }
  ],
  "it-support": [
    {
      "id": "scope1",
      "label": "Devices or users to support",
      "kind": "number"
    },
    {
      "id": "scope2",
      "label": "Support type",
      "kind": "choice",
      "options": [
        "One-time repair",
        "Setup",
        "Ongoing support"
      ]
    },
    {
      "id": "scope3",
      "label": "Systems and issues",
      "kind": "text"
    }
  ],
  "software-consultation": [
    {
      "id": "scope1",
      "label": "Software or business problem",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Stage",
      "kind": "choice",
      "options": [
        "Idea",
        "Existing system",
        "Migration",
        "Technical review"
      ]
    },
    {
      "id": "scope3",
      "label": "Desired outcome",
      "kind": "text"
    }
  ],
  "business-setup": [
    {
      "id": "scope1",
      "label": "Business activity and location",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Setup stage",
      "kind": "choice",
      "options": [
        "Idea",
        "Registration",
        "Operational launch"
      ]
    },
    {
      "id": "scope3",
      "label": "Setup support needed",
      "kind": "text"
    }
  ],
  "business-consultation": [
    {
      "id": "scope1",
      "label": "Business stage",
      "kind": "choice",
      "options": [
        "Pre-launch",
        "Early stage",
        "Established"
      ]
    },
    {
      "id": "scope2",
      "label": "Main business challenge",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Consultation goal",
      "kind": "text"
    }
  ],
  "market-research": [
    {
      "id": "scope1",
      "label": "Market and geography",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Research",
      "kind": "choice",
      "options": [
        "Desk research",
        "Customer interviews",
        "Survey",
        "Competitor analysis"
      ]
    },
    {
      "id": "scope3",
      "label": "Sample size or research depth",
      "kind": "text"
    }
  ],
  "documentation-services": [
    {
      "id": "scope1",
      "label": "Document purpose",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Documents needed",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Work",
      "kind": "choice",
      "options": [
        "Drafting",
        "Formatting",
        "Review",
        "Translation"
      ]
    }
  ],
  "vendor-assistance": [
    {
      "id": "scope1",
      "label": "Product or service to source",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Assistance",
      "kind": "choice",
      "options": [
        "Shortlisting",
        "Comparison",
        "Coordination"
      ]
    },
    {
      "id": "scope3",
      "label": "Quantity and supplier requirements",
      "kind": "text"
    }
  ],
  "business-process-support": [
    {
      "id": "scope1",
      "label": "Process to improve or support",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Support",
      "kind": "choice",
      "options": [
        "Design",
        "Documentation",
        "Execution",
        "Review"
      ]
    },
    {
      "id": "scope3",
      "label": "Monthly workload and team size",
      "kind": "text"
    }
  ],
  "home-services": [
    {
      "id": "scope1",
      "label": "Work type",
      "kind": "choice",
      "options": [
        "Cleaning",
        "Maintenance",
        "Handyman",
        "Multiple tasks"
      ]
    },
    {
      "id": "scope2",
      "label": "Property size and room count",
      "kind": "text"
    },
    {
      "id": "scope3",
      "label": "Tasks and frequency",
      "kind": "text"
    }
  ],
  "ac-service-repair": [
    {
      "id": "scope1",
      "label": "AC units",
      "kind": "number"
    },
    {
      "id": "scope2",
      "label": "AC type",
      "kind": "choice",
      "options": [
        "Split",
        "Window",
        "Cassette",
        "Central"
      ]
    },
    {
      "id": "scope3",
      "label": "Work",
      "kind": "choice",
      "options": [
        "Routine service",
        "Repair",
        "Installation",
        "Uninstallation"
      ]
    }
  ],
  "electrical-services": [
    {
      "id": "scope1",
      "label": "Work",
      "kind": "choice",
      "options": [
        "Repair",
        "Wiring",
        "Installation",
        "Inspection"
      ]
    },
    {
      "id": "scope2",
      "label": "Points or fixtures",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Property type and symptoms",
      "kind": "text"
    }
  ],
  "plumbing-services": [
    {
      "id": "scope1",
      "label": "Work",
      "kind": "choice",
      "options": [
        "Leak repair",
        "Fixture installation",
        "Pipe work",
        "Inspection"
      ]
    },
    {
      "id": "scope2",
      "label": "Fixtures or affected areas",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Problem and access conditions",
      "kind": "text"
    }
  ],
  "pest-control": [
    {
      "id": "scope1",
      "label": "Pest",
      "kind": "choice",
      "options": [
        "Termites",
        "Cockroaches",
        "Rodents",
        "Mosquitoes",
        "Multiple pests"
      ]
    },
    {
      "id": "scope2",
      "label": "Treatment area (sq ft)",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Property type and infestation severity",
      "kind": "text"
    }
  ],
  "professional-consultation": [
    {
      "id": "scope1",
      "label": "Professional field and topic",
      "kind": "text"
    },
    {
      "id": "scope2",
      "label": "Consultation",
      "kind": "choice",
      "options": [
        "One-time",
        "Follow-up",
        "Ongoing"
      ]
    },
    {
      "id": "scope3",
      "label": "Questions and desired outcome",
      "kind": "text"
    }
  ],
  "interior-design": [
    {
      "id": "scope1",
      "label": "Space",
      "kind": "choice",
      "options": [
        "Home",
        "Office",
        "Retail",
        "Hospitality"
      ]
    },
    {
      "id": "scope2",
      "label": "Area to design (sq ft)",
      "kind": "number"
    },
    {
      "id": "scope3",
      "label": "Scope",
      "kind": "choice",
      "options": [
        "Design only",
        "Design and execution",
        "Renovation"
      ]
    }
  ]
};
