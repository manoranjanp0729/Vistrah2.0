"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { serviceImages } from "../data/serviceImages";

type ServiceCarouselCategory =
  | "civil"
  | "marketing"
  | "jobs"
  | "realEstate"
  | "taxCompliance"
  | "digital"
  | "business"
  | "other";

const slidesByCategory = {
  civil: [
    {
      title: "Civil & Construction",
      text: "Plan, build and manage construction projects with trusted professionals.",
      image: serviceImages.services.civil.civilConstruction,
    },
    {
      title: "Residential Construction",
      text: "Bring residential building projects from plans through execution.",
      image: serviceImages.services.civil.residentialConstruction,
    },
    {
      title: "Commercial Construction",
      text: "Coordinate construction for commercial buildings and workplaces.",
      image: serviceImages.services.civil.commercialConstruction,
    },
    {
      title: "Architecture & Design",
      text: "Connect your project with architecture and design expertise.",
      image: serviceImages.services.civil.architectureDesign,
    },
  ],
  marketing: [
    {
      title: "Digital Marketing",
      text: "Build your online presence, reach customers and grow your brand.",
      image: serviceImages.services.marketing.digitalMarketing,
    },
    {
      title: "Outdoor Advertising",
      text: "Reach more people with outdoor advertising and campaign placements.",
      image: serviceImages.services.marketing.outdoorAdvertising,
    },
    {
      title: "LED & Digital Displays",
      text: "Make your business visible with modern digital display solutions.",
      image: serviceImages.services.marketing.ledDigitalDisplays,
    },
    {
      title: "Signage & Branding",
      text: "Build a consistent brand presence with professional signage.",
      image: serviceImages.services.marketing.signageBranding,
    },
  ],
  jobs: [
    {
      title: "Resume & CV",
      text: "Present your experience clearly with professional resume support.",
      image: serviceImages.services.jobs.resumeBuilding,
    },
    {
      title: "Job Applications",
      text: "Get assistance finding and applying for suitable opportunities.",
      image: serviceImages.services.jobs.jobApplicationAssistance,
    },
    {
      title: "Interview Preparation",
      text: "Prepare for interviews with structured guidance and practice.",
      image: serviceImages.services.jobs.interviewPreparation,
    },
    {
      title: "LinkedIn Profile",
      text: "Build a professional profile that helps you stand out to recruiters.",
      image: serviceImages.services.jobs.linkedinProfile,
    },
    {
      title: "Career Consultation",
      text: "Get guidance on career direction, skills and opportunities.",
      image: serviceImages.services.jobs.careerConsultation,
    },
  ],
  realEstate: [
    {
      title: "Property Search",
      text: "Find properties matching your location, budget and requirements.",
      image: serviceImages.services.realEstate.propertySearch,
    },
    {
      title: "Buy Property",
      text: "Get assistance through the property buying process.",
      image: serviceImages.services.realEstate.buyProperty,
    },
    {
      title: "Property Verification",
      text: "Review property documents and details before proceeding.",
      image: serviceImages.services.realEstate.propertyVerification,
    },
    {
      title: "Property Valuation",
      text: "Understand a property's estimated market value.",
      image: serviceImages.services.realEstate.propertyValuation,
    },
    {
      title: "Rental Assistance",
      text: "Find or manage suitable residential and commercial rentals.",
      image: serviceImages.services.realEstate.rentalAssistance,
    },
  ],
  taxCompliance: [
    {
      title: "Income Tax",
      text: "Get support with income tax return filing and related requirements.",
      image: serviceImages.services.taxCompliance.incomeTaxReturnFiling,
    },
    {
      title: "GST Services",
      text: "Get help with GST registration and filing.",
      image: serviceImages.services.taxCompliance.gstRegistration,
    },
    {
      title: "Business Registration",
      text: "Get guidance with business registration and documentation.",
      image: serviceImages.services.taxCompliance.businessRegistration,
    },
    {
      title: "TDS Compliance",
      text: "Manage tax deducted at source and compliance requirements.",
      image: serviceImages.services.taxCompliance.tdsCompliance,
    },
    {
      title: "Tax Consultation",
      text: "Discuss tax and compliance requirements with a professional.",
      image: serviceImages.services.taxCompliance.taxConsultation,
    },
  ],
  digital: [
    {
      title: "Website Development",
      text: "Build a website tailored to your business and customers.",
      image: serviceImages.services.digital.websiteDevelopment,
    },
    {
      title: "Mobile App Development",
      text: "Turn your product or service into a mobile application.",
      image: serviceImages.services.digital.mobileAppDevelopment,
    },
    {
      title: "Cloud Services",
      text: "Use cloud platforms to support reliable digital operations.",
      image: serviceImages.services.digital.cloudServices,
    },
    {
      title: "DevOps Services",
      text: "Improve software delivery and infrastructure operations.",
      image: serviceImages.services.digital.devopsServices,
    },
    {
      title: "IT Support",
      text: "Get practical support for your technology and IT needs.",
      image: serviceImages.services.digital.itSupport,
    },
  ],
  business: [
    {
      title: "Business Setup",
      text: "Get support establishing and organizing your business.",
      image: serviceImages.services.business.businessSetup,
    },
    {
      title: "Business Consultation",
      text: "Get professional guidance on business planning and decisions.",
      image: serviceImages.services.business.businessConsultation,
    },
    {
      title: "Market Research",
      text: "Understand your market, customers and business opportunities.",
      image: serviceImages.services.business.marketResearch,
    },
    {
      title: "Documentation",
      text: "Organize essential business documents and records.",
      image: serviceImages.services.business.documentationServices,
    },
    {
      title: "Vendor Assistance",
      text: "Get help with vendor coordination and business support.",
      image: serviceImages.services.business.vendorAssistance,
    },
  ],
  other: [
    {
      title: "Home Services",
      text: "Find support for everyday home service requirements.",
      image: serviceImages.services.other.homeServices,
    },
    {
      title: "Electrical Services",
      text: "Get help with electrical work and household repairs.",
      image: serviceImages.services.other.electricalServices,
    },
    {
      title: "Plumbing Services",
      text: "Find help for plumbing maintenance and repairs.",
      image: serviceImages.services.other.plumbingServices,
    },
    {
      title: "Professional Consultation",
      text: "Connect with professionals for expert guidance.",
      image: serviceImages.services.other.professionalConsultation,
    },
  ],
} satisfies Record<ServiceCarouselCategory, {
  title: string;
  text: string;
  image: string;
}[]>;

export default function ServiceCarousel({
  category,
}: {
  category: ServiceCarouselCategory;
}) {
  const slides = slidesByCategory[category];
  const categoryLabel = {
    civil: "Civil & Construction",
    marketing: "Marketing",
    jobs: "Jobs & Careers",
    realEstate: "Real Estate",
    taxCompliance: "Tax & Compliance",
    digital: "Digital & Technology",
    business: "Business Services",
    other: "Local & Professional Services",
  }[category];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActive(0);
  }, [category]);

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [category, paused, slides.length]);

  const slide = slides[active];

  return (
    <div
      className="vServiceCarousel"
      aria-label={`${categoryLabel} services`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="vCarouselImage">
        <Image src={slide.image} alt={`${slide.title} service`} width={800} height={500} sizes="(max-width: 800px) 100vw, 40vw" />
      </div>

      <div className="vCarouselContent">
        <span className="vCarouselEyebrow">VISTRAH SERVICES</span>
        <h3>{slide.title}</h3>
        <p>{slide.text}</p>
      </div>

      <div className="vCarouselControls">
        <button
          type="button"
          aria-label="Previous service"
          className="vCarouselArrow"
          onClick={() =>
            setActive((current) => (current - 1 + slides.length) % slides.length)
          }
        >
          ‹
        </button>

        <div className="vCarouselDots">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Show ${item.title}`}
              className={`vCarouselDot${index === active ? " active" : ""}`}
              onClick={() => setActive(index)}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Next service"
          className="vCarouselArrow"
          onClick={() =>
            setActive((current) => (current + 1) % slides.length)
          }
        >
          ›
        </button>
      </div>
    </div>
  );
}
