import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {getMarketingService,marketingServicePages,marketingServiceHref,marketingEnquiryHref} from '../../shared/marketing-services';
import {ThemeProvider} from '../components/theme-provider';
import {themedMarketingVisuals} from '../../shared/marketing-visuals';
import {themeAppearance} from '../../shared/theme-appearance';
import {LanguageProvider} from '../components/language-provider';
import {AdsMarketing} from '../components/ads-marketing';
import {MarketingServiceLanding} from '../components/marketing-service-landing';
import MarketingPage from '../app/(public)/marketing-services/[slug]/page';

describe('dedicated marketing service journeys',()=>{
 it('gives the homepage four distinct destinations and retains Get Started',()=>{
  const html=renderToStaticMarkup(createElement(LanguageProvider,{children:createElement(AdsMarketing)}));
  expect(new Set(marketingServicePages.map(page=>page.slug)).size).toBe(4);
  for(const page of marketingServicePages)expect(html).toContain(`href="${marketingServiceHref(page.slug)}"`);
  expect(html).toContain('href="/marketing-solutions"');
  expect(html).not.toContain('href="/service/');
 });
 for(const page of marketingServicePages){
  for(const locale of ['en','kn','hi'] as const){
   it(`${page.slug} renders its own content in ${locale} without requiring catalogue data`,()=>{
    const html=renderToStaticMarkup(createElement(LanguageProvider,{initialLocale:locale,children:createElement(ThemeProvider,{initialMode:'light',children:createElement(MarketingServiceLanding,{slug:page.slug})})}));
    expect(html).toContain(page.headline[locale]);
    expect(html).toContain(`src="/images/ads-marketing/${page.photo}"`);
    expect(html).toContain('id="capabilities"');
    expect(html).toContain('mailto:info@vistrah.in');
    for(const sibling of marketingServicePages.filter(item=>item.slug!==page.slug))expect(html).toContain(marketingServiceHref(sibling.slug));
    expect(page.capabilities).toHaveLength(4);
    for(const item of [page.title,page.headline,page.intro,...page.outputs,...page.brief,...page.capabilities.flat()]){
     expect(item[locale]).toBeTruthy();expect(item[locale]).not.toMatch(/\?{2,}|\uFFFD/);
    }
    if(locale!=='en')expect(page.intro[locale]).toMatch(locale==='kn'?/[\u0c80-\u0cff]/:/[\u0900-\u097f]/);
   });
  }
  it(`${page.slug} creates a service-specific email brief without automatically submitting anything`,()=>{
   const url=new URL(marketingEnquiryHref(page,'en'));
   expect(url.protocol).toBe('mailto:');expect(url.pathname).toBe('info@vistrah.in');
   expect(url.searchParams.get('subject')).toContain(page.title.en);
   for(const question of page.brief)expect(url.searchParams.get('body')).toContain(question.en);
  });
 }
 it('accepts known routes and rejects unknown services',async()=>{
  for(const page of marketingServicePages)expect(await MarketingPage({params:Promise.resolve({slug:page.slug})})).toBeTruthy();
  expect(getMarketingService('__proto__')).toBeUndefined();
  await expect(MarketingPage({params:Promise.resolve({slug:'missing-service'})})).rejects.toThrow();
 });
});

it("keeps all four service palettes light and responsive to every App Theme",()=>{
 for(const page of marketingServicePages){
  const papers=new Set<string>();
  for(const id of ["blue","indigo","lavender","orchid","pink"]){
   const visual=themedMarketingVisuals(page.key,themeAppearance("light",id).colors.accent);
   papers.add(visual.paper);
   for(const color of [visual.paper,visual.wash]){
    const channels=color.slice(1).match(/.{2}/g)!.map(part=>parseInt(part,16));
    expect(Math.min(...channels)).toBeGreaterThan(180);
   }
   expect(themedMarketingVisuals(page.key,themeAppearance("dark",id).colors.accent).dark).toMatch(/^#[0-9a-f]{6}$/);
  }
  expect(papers.size).toBe(5);
 }
});
