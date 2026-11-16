import {UiText,UiNav} from "./localized-ui";
import Link from 'next/link';
import {legalDocuments,legalDraftNotice,type LegalDocumentKey} from '../../shared/legal';

export function LegalPage({document}:{document:LegalDocumentKey}){
  const content=legalDocuments[document];
  return <article lang="en" className="container page" style={{maxWidth:820,overflowWrap:'anywhere',lineHeight:1.6}}>
    <p className="eyebrow"><UiText value={"VISTRAH GROUPS PVT LTD · VISTRAH.IN"}/></p>
    <h1>{content.title}</h1>
    <p role="note" className="notice">{legalDraftNotice}</p>
    {content.sections.map(section=><section key={section.title} style={{marginBlock:24,paddingBottom:16,borderBottom:'1px solid var(--border,rgba(15,23,42,0.08))'}}><h2><UiText value={section.title}/></h2><p>{section.text}</p></section>)}
    <UiNav aria-label="Legal documents" style={{display:'flex',flexWrap:'wrap',gap:16,marginTop:24}}>
      <Link href="/terms"><UiText value={"Terms & Conditions"}/></Link>
      <Link href="/privacy"><UiText value={"Privacy Policy"}/></Link>
      <Link href="/refund-policy"><UiText value={"Cancellation & Refund Policy"}/></Link>
      <Link href="/shipping-policy"><UiText value={"Service Delivery & Shipping Policy"}/></Link>
      <Link href="/grievance-officer"><UiText value={"Grievance Officer"}/></Link>
      <Link href="/pricing"><UiText value={"Pricing"}/></Link>
      <Link href="/contact-us"><UiText value={"Contact Us"}/></Link>
      <a href="mailto:grievance@vistrah.in">grievance@vistrah.in</a>
      <a href="mailto:info@vistrah.in">info@vistrah.in</a>
    </UiNav>
  </article>;
}
