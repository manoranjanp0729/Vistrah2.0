import {UiText} from "../../../components/localized-ui";
import Link from 'next/link';
import copy from '@/lib/interface-copy.json';
export default function Provider(){return <div className="container page replica-page"><h1><UiText value={copy.provider.title}/></h1><p><UiText value={copy.provider.subtitle}/></p><p><UiText value={copy.provider.intro}/></p><div className="panel"><h2><UiText value={copy.provider.business}/></h2><p><UiText value={copy.provider.businessCopy}/></p><div className="replica-actions"><Link href="/seller/register"><UiText value={copy.provider.register}/></Link><Link href="/seller/login"><UiText value={copy.provider.login}/></Link></div></div><div className="replica-actions"><Link href="/provide-service"><UiText value={copy.provider.application}/></Link><Link href="/seller"><UiText value={copy.provider.dashboard}/></Link><Link href="/app/employer-jobs"><UiText value={"Employer job postings"}/></Link></div></div>;}

