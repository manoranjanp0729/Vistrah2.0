import {describe,it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import defaults from '../../shared/edit-vistrah-page-defaults.json';
import {editVistrahClient,loadVistrahEditor,editorPageStatus,type VistrahPage} from '../../shared/edit-vistrah';
import {contentHref,sectionCopy} from '../../shared/edit-vistrah-content';
import {marketingServicePages} from '../../shared/marketing-services';
import {LanguageProvider} from '../components/language-provider';
import {ContentSections} from '../components/edit-vistrah-content';
const home=defaults[0] as unknown as VistrahPage;
function fixture(fail?:string){return editVistrahClient(vi.fn(async(path:string)=>{
 if(path===fail)throw Object.assign(new Error('Fixture failure'),{status:404});
 if(path==='/admin/edit-vistrah/pages')return [home] as never;
 if(path==='/admin/edit-vistrah/library')return [] as never;
 return home as never;
}));}
describe('Edit Vistrah existing page loading',()=>{
 it('loads existing page details and sections rather than only Add Page',async()=>{
  const result=await loadVistrahEditor(fixture());expect(result.pages).toHaveLength(1);expect(result.page?.sections.length).toBeGreaterThan(0);expect(result.warning).toBe('');
 });
 it('keeps existing pages visible when the optional library fails',async()=>{
  const result=await loadVistrahEditor(fixture('/admin/edit-vistrah/library'));expect(result.page?.slug).toBe('home');expect(result.pages).toHaveLength(1);expect(result.warning).toContain('library');
 });
 it('falls back to real listed details when the details request fails',async()=>{
  const result=await loadVistrahEditor(fixture('/admin/edit-vistrah/pages/home'));expect(result.page?.sections).toEqual(home.sections);expect(result.warning).toContain('page list');
 });
 it('explains an old API 404 instead of presenting a blank editor',async()=>{
  await expect(loadVistrahEditor(fixture('/admin/edit-vistrah/pages'))).rejects.toThrow('running API (404)');
 });
 it('rejects malformed lists and missing sections',async()=>{
  await expect(loadVistrahEditor(editVistrahClient(async()=>({pages:[]} as never)))).rejects.toThrow('page list response');
  await expect(loadVistrahEditor(editVistrahClient(async(path)=>path.endsWith('/pages')?[{slug:'home'}] as never:{slug:'home'} as never))).rejects.toThrow('sections are missing');
 });
 it('distinguishes app defaults, published content and unpublished changes',()=>{
  expect(editorPageStatus({...home,content_source:'APP'})).toBe('App content');
  expect(editorPageStatus({...home,status:'DRAFT',published_version:2,content_source:'CMS'})).toBe('Live v2 + draft');
  expect(editorPageStatus({...home,status:'LIVE',published_version:2,content_source:'CMS'})).toBe('Live v2');
 });
 it('carries revisions through saving and publishing and strips empty playlist lines',async()=>{
  const fetcher=vi.fn(async(_path:string,_options?:RequestInit)=>({...home,revision:_options?.method==='PUT'?2:1} as never));
  const client=editVistrahClient(fetcher);await client.getPage('home');
  await client.updatePage('home',{revision:1,sections:[{...home.sections[0],video_urls:['',' /v.mp4 ','']}]});await client.publishPage('home');
  const saved=JSON.parse(fetcher.mock.calls[1][1]!.body as string),published=JSON.parse(fetcher.mock.calls[2][1]!.body as string);
  expect(saved.revision).toBe(1);expect(saved.sections[0].video_urls).toEqual(['/v.mp4']);expect(published.revision).toBe(2);
 });
});
describe('Published content and app baselines',()=>{
 it('has populated baselines for all nine app pages without declaring them CMS live',()=>{
  expect(defaults).toHaveLength(9);for(const page of defaults){expect(page.sections.length).toBeGreaterThan(0);expect(page.published_version).toBeNull();}
 });
 it('marketing page baseline copy matches the app source in all three languages',()=>{
  for(const page of marketingServicePages){const baseline=defaults.find(p=>p.slug===page.slug)!;for(const locale of ['en','kn','hi'] as const){expect(sectionCopy(baseline.sections[0] as never,locale).title).toBe(page.headline[locale]);expect(sectionCopy(baseline.sections[0] as never,locale).description).toBe(page.intro[locale]);}}
 });
 it('renders translated published text, media and actual local actions',()=>{
  for(const locale of ['en','kn','hi'] as const){const html=renderToStaticMarkup(createElement(LanguageProvider,{initialLocale:locale,children:createElement(ContentSections,{sections:[{...home.sections[0],type:'editable_banner',content:{en:{title:'Synthetic content',action:'Continue'},kn:{title:'Synthetic Kannada'},hi:{title:'Synthetic Hindi'}},action_href:'/services',images:[{url:'/fixture.webp',alt_text:'Fixture photo'}]}]})}));expect(html).toContain(locale==='en'?'Synthetic content':locale==='kn'?'Synthetic Kannada':'Synthetic Hindi');expect(html).toContain('/fixture.webp');expect(html).toContain('href="/services"');}
 });
 it('does not render disabled sections or unsafe actions',()=>{
  const section={...home.sections[0],content:{en:{title:'Hidden fixture',action:'Bad'}},enabled:false,action_href:'javascript:alert(1)'};
  const html=renderToStaticMarkup(createElement(LanguageProvider,{children:createElement(ContentSections,{sections:[section]})}));expect(html).not.toContain('Hidden fixture');expect(contentHref(section.action_href)).toBeUndefined();expect(contentHref('mailto:info@vistrah.in')).toBeTruthy();expect(contentHref('mailto:info@vistrah.in.evil')).toBeUndefined();
 });
});
