"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export function MarketingPricingEntry(){const path=usePathname();if(path!=='/marketing-solutions'&&!path.startsWith('/marketing-services/'))return null;return <div className="container" style={{paddingBlock:12}}><Link className="button" href="/marketing-pricing">Explore services & pricing</Link></div>;}
