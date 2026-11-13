'use client';
import {pagePhoto} from '@/lib/imagery';

import {ContextVisual} from '@/components/visual';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}) {return <main className="container page empty"><ContextVisual photo={pagePhoto('error')} className="access-context"/><p className="eyebrow">LET’S TRY THAT AGAIN</p><h1>We couldn’t load this page.</h1><p>The service may be temporarily unavailable.</p><button className="button" onClick={reset}>Try again</button><Link href="/call-vistrah" className="button secondary">Contact VISTRAH</Link></main>;}
