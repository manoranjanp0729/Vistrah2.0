import {pagePhoto} from '@/lib/imagery';
import {ContextVisual} from '@/components/visual';
import Link from 'next/link';
export default function NotFound() {return <main className="container page empty"><ContextVisual photo={pagePhoto('not-found')} className="access-context"/><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>Let’s find your next step.</h1><p>This destination is unavailable or no longer active.</p><Link className="button" href="/services">Explore services</Link><Link className="button secondary" href="/">Return home</Link></main>;}
