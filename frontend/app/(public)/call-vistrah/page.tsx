import {UiText} from "../../../components/localized-ui";
import {pagePhoto} from '@/lib/imagery';
import {officialContact,emailHref} from '@/lib/contact';
import {Visual} from '@/components/visual';
import {Mail,ArrowUpRight,MessageCircle,Globe} from 'lucide-react';
import {Breadcrumbs,ButtonLink} from '@/components/ui';
import {buildContactPrefillMailto} from '../../../../shared/nearby-services';

export const metadata={title:'Contact Us — Vistrah India Pvt Limited'};

export default async function Contact({
  searchParams,
}:{
  searchParams?: Promise<Record<string,string|string[]|undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  const str = (v: unknown, max = 140) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const intent = str(raw.intent, 40);
  const business = str(raw.business, 140);
  const category = str(raw.category, 100);
  const type = str(raw.type, 100);
  const locality = str(raw.locality, 120);
  const isWebsiteRequest = intent === 'request-website';
  const hasContext = Boolean(isWebsiteRequest || business || type || category);
  const prefilledMailHref = hasContext
    ? buildContactPrefillMailto(officialContact.email, { intent, business, category, type, locality })
    : emailHref(officialContact.email)!;

  return (
    <div className="container page">
      <Breadcrumbs items={[{label: isWebsiteRequest ? 'Request Business Website' : 'Contact VISTRAH'}]}/>

      {hasContext && (
        <section
          aria-label={isWebsiteRequest ? 'Website development request' : 'Business support enquiry'}
          style={{
            marginBottom: 24,
            padding: '18px 20px',
            borderRadius: 14,
            border: '1px solid rgba(212, 175, 55, 0.55)',
            background: 'rgba(212, 175, 55, 0.08)',
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isWebsiteRequest ? <Globe size={18}/> : <Mail size={18}/>}
            <strong style={{ fontSize: 16 }}>
              {isWebsiteRequest
                ? `Request a Business Website${business ? ` for ${business}` : ''}`
                : `Contact VISTRAH${business ? ` regarding ${business}` : ''}`}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: 14 }}>
            {isWebsiteRequest
              ? 'Vistrah Digital builds fast, mobile-ready websites and SEO pages for local Indian businesses. Send your pre-filled details below and our team will respond with options.'
              : 'Your selected business context is pre-filled below so our support team can assist you right away.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
            {business && <span className="status status-approved">Business: {business}</span>}
            {(type || category) && (
              <span className="status status-pending">
                Service: {(type || category).replace(/-/g, ' ')}
              </span>
            )}
            {locality && <span className="status status-pending">Area: {locality}</span>}
          </div>
          <div className="button-row" style={{ marginTop: 4 }}>
            <a className="button" href={prefilledMailHref}>
              <Mail size={16}/>
              <UiText value={isWebsiteRequest ? 'Send Website Request' : 'Send Pre-Filled Email'}/>
              <ArrowUpRight size={16}/>
            </a>
            {isWebsiteRequest && (
              <ButtonLink secondary href="/marketing-pricing">
                <UiText value="View Website & Marketing Plans"/>
              </ButtonLink>
            )}
          </div>
        </section>
      )}

      <div className="contact-grid">
        <div>
          <p className="eyebrow"><UiText value={"CONTACT VISTRAH · Vistrah India Pvt Limited"}/></p>
          <h1><UiText value={"Questions about"}/><br/><UiText value={"the platform?"}/></h1>
          <p className="lead"><UiText value={"Contact Vistrah India Pvt Limited about finding services, business onboarding, V Ads campaigns, billing/refunds, or an existing enquiry."}/></p>
          <a className="contact-email" href={prefilledMailHref}><Mail size={30}/>{officialContact.email}<ArrowUpRight size={28}/></a>
          <p><UiText value={"Vistrah India Pvt Limited · Bengaluru, Karnataka, India · Support: "}/>{officialContact.email}<UiText value={" · Grievance Officer: grievance@vistrah.in"}/></p>
          <ButtonLink secondary href="/services"><UiText value={"Explore services"}/></ButtonLink>
        </div>
        <div className="contact-card">
          <Visual photo={pagePhoto('contact')} className="inline-editorial"/>
          <MessageCircle size={36}/>
          <h2><UiText value={"Tell us about"}/><br/><UiText value={"your requirements."}/></h2>
          <p><UiText value={"Have a few details ready:"}/></p>
          <ul className="process-list">
            <li><UiText value={"The service or application you are asking about."}/></li>
            <li><UiText value={"Your location and preferred timeline."}/></li>
            <li><UiText value={"Any documents or project details that may help."}/></li>
          </ul>
          <p><UiText value={"Prefer to write down your requirements? Open a service and submit a request through your account."}/></p>
        </div>
      </div>
    </div>
  );
}
