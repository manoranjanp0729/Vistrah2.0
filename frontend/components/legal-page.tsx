import {UiText,UiNav} from "./localized-ui";
import Link from 'next/link';
import {legalDocuments,legalDraftNotice,type LegalDocumentKey} from '../../shared/legal';

export function LegalPage({document}:{document:LegalDocumentKey}){
  const content=legalDocuments[document];
  return <article lang="en" className="container page" style={{maxWidth:820,overflowWrap:'anywhere',lineHeight:1.7}}>
    <h1>{content.title}</h1>
    <p role="note" className="notice">{legalDraftNotice}</p>
    <p><UiText value={"English draft for customer and seller review."}/></p>
    {content.sections.map(section=><section key={section.title} style={{marginBlock:24}}><h2><UiText value={section.title}/></h2><p>{section.text}</p></section>)}
    <UiNav  aria-label="Legal documents" style={{display:'flex',flexWrap:'wrap',gap:16}}><Link href="/terms"><UiText value={"Terms & Conditions"}/></Link><Link href="/privacy"><UiText value={"Privacy Policy"}/></Link><a href="mailto:info@vistrah.in">info@vistrah.in</a></UiNav>
  </article>;
}
