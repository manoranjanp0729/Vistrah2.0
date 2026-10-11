import copy from '@/lib/interface-copy.json';
import Link from 'next/link';
import {destinationLink} from '@/lib/destinations';
export function ServiceAccessState({status,next,embedded=false}:{status:number;next:string;embedded?:boolean}) {
  const Heading=embedded?'h4':'h1';
  return <section className={embedded?'service-tab-access':'container page'} aria-label="Service access"><Heading>{status===401?copy.service.signIn:copy.service.membership}</Heading><p>{status===401?copy.service.signInCopy:copy.service.membershipCopy}</p><div className="button-row">{status===401?<><Link className="button" href={destinationLink('/login',next)}>Sign in</Link><Link className="button secondary" href={destinationLink('/register',next)}>Create account</Link></>:<Link className="button" href={destinationLink('/membership',next)}>Explore membership</Link>}</div></section>;
}

