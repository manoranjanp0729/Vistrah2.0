"use client";

import Image from "next/image";
import { useState } from "react";
import { serviceImages } from "../data/serviceImages";

export default function PublicImage({
  src,
  alt,
  fill,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  fill: boolean;
  priority?: boolean;
  sizes: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  return <Image
    src={currentSrc}
    alt={alt}
    fill={fill}
    priority={priority}
    unoptimized
    sizes={sizes}
    onError={() => {
      if (currentSrc !== serviceImages.placeholders.default) setCurrentSrc(serviceImages.placeholders.default);
    }}
  />;
}
