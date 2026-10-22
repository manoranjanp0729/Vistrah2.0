'use client';
import {UiText,UiSection} from "./localized-ui";
import {useLanguage} from './language-provider';
import Link from 'next/link';
import {destinationLink} from '@/lib/destinations';
export function ServiceAccessState({status,next,embedded=false}:{status:number;next:string;embedded?:boolean}) {const {copy}=useLanguage();
  const Heading=embedded?'h4':'h1';
  return <UiSection  className={embedded?'service-tab-access':'container page'} aria-label="Service access"><Heading>{status===401?copy.service.signIn:copy.service.membership}</Heading><p>{status===401?copy.service.signInCopy:copy.service.membershipCopy}</p><div className="button-row">{status===401?<><Link className="button" href={destinationLink('/login',next)}><UiText value={copy.auth.signIn}/></Link><Link className="button secondary" href={destinationLink('/register',next)}><UiText value={copy.auth.create}/></Link></>:<Link className="button" href={destinationLink('/membership',next)}><UiText value={copy.service.exploreMembership}/></Link>}</div></UiSection>;
}

