"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    title: "Digital Marketing",
    text: "Build your online presence, reach customers and grow your brand.",
    image: "/images/services/marketing/digital-marketing.svg",
  },
  {
    title: "Residential Construction",
    text: "Plan, build and manage residential construction requirements.",
    image: "/images/services/civil/residential-construction.svg",
  },
  {
    title: "Retractable Roofing",
    text: "Create flexible outdoor spaces with premium retractable roofing.",
    image: "/images/services/civil/retractable-roofing.svg",
  },
  {
    title: "LED & Digital Displays",
    text: "Make your business visible with modern digital display solutions.",
    image: "/images/services/marketing/led-digital-displays.svg",
  },
];

export default function ServiceCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [paused]);

  const slide = slides[active];

  return (
    <div
      className="vServiceCarousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="vCarouselImage">
        <img src={slide.image} alt={slide.title} />
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
              className={index === active ? "active" : ""}
              onClick={() => setActive(index)}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="Next service"
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
