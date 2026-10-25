'use client';
import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {api} from '@/lib/api';
import {AuthGate} from './customer';
import {editVistrahClient,loadVistrahEditor,editorPageStatus,SECTION_LIBRARY,type VistrahPage,type PageSection,type ImageDetails} from '../../shared/edit-vistrah';
import {contentLayouts,contentHref,contentImage,sectionCopy,sectionLayout,featureEnabled,pageUsesEditorialContent} from '../../shared/edit-vistrah-content';
import {validateEditorImage,validateEditorPageSize} from '../../shared/editor-image';
import styles from './edit-vistrah.module.css';

const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const corePages=['home','services','v-ads','v-essentials','marketing-solutions','digital-marketing','branding-creative-production','outdoor-advertising-signage','mobility-billboard-advertising'];
type Locale='en'|'kn'|'hi';
export function EditVistrah(){return <AuthGate>{()=> <Editor/>}</AuthGate>;}

function EditorImage({image}:{image:ImageDetails}){
 const [failed,setFailed]=useState('');
 return failed===image.url?<p className={styles.guidance}>Image unavailable on this admin origin. Verify this asset on the public app: {image.url.startsWith('data:')?'embedded photo':image.url}</p>:<img src={image.url} alt={image.alt_text||image.title||''} loading="lazy" onError={()=>setFailed(image.url)}/>;
}

function Editor(){
 const [client]=useState(()=>editVistrahClient(api));
 const [pages,setPages]=useState<VistrahPage[]>([]),[page,setPage]=useState<VistrahPage|null>(null),[library,setLibrary]=useState(SECTION_LIBRARY);
 const [selected,setSelected]=useState(''),[saved,setSaved]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [filter,setFilter]=useState(''),[locale,setLocale]=useState<Locale>('en'),[preview,setPreview]=useState(false),[phone,setPhone]=useState(false);
 const [past,setPast]=useState<VistrahPage[]>([]),[future,setFuture]=useState<VistrahPage[]>([]);
 const [creating,setCreating]=useState(false),[name,setName]=useState(''),[slug,setSlug]=useState('');
 const locked=useRef(true),dirtyRef=useRef(false);
 const dirty=!!page&&JSON.stringify(page)!==saved;
 useEffect(()=>{dirtyRef.current=dirty;},[dirty]);

 function accept(value:VistrahPage){
  setPage(clone(value));setSaved(JSON.stringify(value));setPast([]);setFuture([]);setSelected(value.sections[0]?.id??'');dirtyRef.current=false;
  setPages(list=>list.some(item=>item.slug===value.slug)?list.map(item=>item.slug===value.slug?value:item):[...list,value]);
 }
 useEffect(()=>{
  let active=true;
  loadVistrahEditor(client).then(result=>{
   if(!active)return;setPages(result.pages);if(result.library.length)setLibrary(result.library);
   if(result.page){setPage(clone(result.page));setSaved(JSON.stringify(result.page));setSelected(result.page.sections[0]?.id??'');}
   setError(result.warning);
  }).catch(cause=>{if(active)setError(String(cause.message||cause));}).finally(()=>{if(active){locked.current=false;setBusy(false);}});
  return()=>{active=false;};
 },[client]);
 useEffect(()=>{
  function leave(event:BeforeUnloadEvent){if(dirtyRef.current||locked.current){event.preventDefault();event.returnValue='';}}
  function navigate(event:MouseEvent){
   const target=event.target instanceof Element?event.target.closest('a[href]'):null;
   if(!target||target.getAttribute('href')?.startsWith('#'))return;
   if(locked.current||dirtyRef.current&&!window.confirm('Leave this editor and discard unsaved changes?')){event.preventDefault();event.stopPropagation();}
  }
  window.addEventListener('beforeunload',leave);document.addEventListener('click',navigate,true);
  return()=>{window.removeEventListener('beforeunload',leave);document.removeEventListener('click',navigate,true);};
 },[]);
 async function run(action:()=>Promise<void>){
  if(locked.current)return;locked.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch(cause){setError(cause instanceof Error?cause.message:'Request failed. Please try again.');}
  finally{locked.current=false;setBusy(false);}
 }
 function edit(next:VistrahPage){if(!page)return;setPast(values=>[...values.slice(-29),clone(page)]);setFuture([]);setPage(next);dirtyRef.current=true;setNotice('');}
 function patch(id:string,value:Partial<PageSection>){if(page)edit({...page,sections:page.sections.map(item=>item.id===id?{...item,...value}:item)});}
 function history(redo=false){
  const source=redo?future:past;if(!page||!source.length)return;
  if(redo){setFuture(source.slice(0,-1));setPast(values=>[...values,clone(page)]);}else{setPast(source.slice(0,-1));setFuture(values=>[...values,clone(page)]);}
  const next=source[source.length-1];setPage(next);setNotice('');dirtyRef.current=JSON.stringify(next)!==saved;
 }
 function discard(){return !dirty||window.confirm('Discard unsaved edits?');}
 async function load(value?:string){await run(async()=>{
  if(value)accept(await client.getPage(value));else{const result=await loadVistrahEditor(client);setPages(result.pages);if(result.page)accept(result.page);if(result.library.length)setLibrary(result.library);setError(result.warning);}
 });}
 async function save(publish=false){
  if(!page)return;
  if(publish&&!window.confirm((pageUsesEditorialContent(page.path)?'Publish editorial sections above the existing screen?':'Publishing replaces this page’s content body. Review the preview before continuing.')+' Target: '+page.target_platform+'.'))return;
  await run(async()=>{
   validateEditorPageSize(page);let next=page;
   if(dirty){next=await client.updatePage(page.slug,page);accept(next);}
   // Preserve the saved revision if publishing subsequently fails.
   if(publish){next=await client.publishPage(next.slug);accept(next);}
   setNotice(publish?'Published for '+next.target_platform+'. Open screens must refresh to see changes.':'Draft saved. Published content is unchanged.');
  });
 }
 function move(index:number,direction:number){if(!page)return;const list=[...page.sections],to=index+direction;if(to<0||to>=list.length)return;[list[index],list[to]]=[list[to],list[index]];edit({...page,sections:list.map((item,i)=>({...item,order:i+1}))});}
 function add(type:string){
  if(!page)return;const item=library.find(entry=>entry.type===type);if(!item)return;
  const section:PageSection={id:crypto.randomUUID(),type,name:item.default_name,variation:'content_grid',available_variations:clone(item.variations),features:clone(item.default_features),images:[],order:page.sections.length+1,enabled:true,content:{en:{title:item.default_name}}};
  edit({...page,sections:[...page.sections,section]});setSelected(section.id);
 }
 const section=page?.sections.find(item=>item.id===selected)??page?.sections[0];
 function copy(field:'title'|'description'|'action',value:string){if(section)patch(section.id,{content:{...section.content,[locale]:{...section.content?.[locale],[field]:value}}});}
 function imagePatch(index:number,value:Partial<ImageDetails>){if(section)patch(section.id,{images:section.images.map((image,i)=>i===index?{...image,...value}:image)});}
 async function upload(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value='';if(!file||!page||!section)return;
  await run(async()=>{
   validateEditorImage(file.type,file.size);
   const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read this photo.'));reader.readAsDataURL(file);});
   const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{
    const image=new Image(),timeout=window.setTimeout(()=>reject(new Error('Photo could not be decoded. Choose another image.')),10000);
    image.onload=()=>{clearTimeout(timeout);resolve({width:image.naturalWidth,height:image.naturalHeight});};image.onerror=()=>{clearTimeout(timeout);reject(new Error('Photo could not be opened.'));};image.src=url;
   });
   const images=[...section.images,{url,title:file.name,alt_text:'',...dimensions}];validateEditorPageSize({...page,sections:page.sections.map(item=>item.id===section.id?{...item,images}:item)});patch(section.id,{images});
  });
 }
 function duplicate(){if(!page||!section)return;const list=[...page.sections],item={...clone(section),id:crypto.randomUUID(),name:section.name+' (copy)'};list.splice(list.findIndex(value=>value.id===section.id)+1,0,item);edit({...page,sections:list.map((value,i)=>({...value,order:i+1}))});setSelected(item.id);}
 function movePhoto(index:number,direction:number){if(!section)return;const list=[...section.images],to=index+direction;[list[index],list[to]]=[list[to],list[index]];patch(section.id,{images:list});}

 return <div className={styles.editor}>
  <header className={styles.toolbar}><p>Choose a page, edit a section, preview, then publish.</p><span role="status">{busy?'Working…':dirty?'Unsaved changes':page?editorPageStatus(page):'Choose a page'}</span></header>
  {error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
  {!page&&!busy&&<button onClick={()=>void load()}>Retry loading pages</button>}
  <fieldset className={styles.workspace} disabled={busy}>
   <aside className={styles.sidebar}><h2>Pages</h2><label className={styles.pageSearch}>Find a page<input type="search" value={filter} onChange={event=>setFilter(event.target.value)}/></label>
    <label className={styles.pagePicker}>Page<select aria-label="Page to edit" value={page?.slug??''} onChange={event=>{if(discard())void load(event.target.value);}}>{!page&&<option value="">Choose a page</option>}{pages.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
    <nav aria-label="Pages to edit">{pages.filter(item=>(item.name+' '+item.path).toLowerCase().includes(filter.toLowerCase())).map(item=><button key={item.slug} aria-current={page?.slug===item.slug?'page':undefined} onClick={()=>{if(discard())void load(item.slug);}}><strong>{item.name}</strong><small>{item.path} · {editorPageStatus(item)}</small></button>)}</nav>
    <button onClick={()=>setCreating(!creating)}>+ Add page</button>
    {creating&&<form className={styles.stack} onSubmit={event=>{event.preventDefault();if(!discard())return;void run(async()=>{accept(await client.createPage({name:name.trim(),slug:slug.trim(),path:'/pages/'+slug.trim()}));setCreating(false);setName('');setSlug('');setNotice('Empty draft created. Add a section to begin.');});}}><label>Page name<input required maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label><label>URL name<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={50} value={slug} onChange={event=>setSlug(event.target.value)}/></label><small>/pages/{slug||'your-page'}</small><button type="submit">Create draft</button><button type="button" onClick={()=>setCreating(false)}>Cancel</button></form>}
   </aside>
   <div className={styles.main}>{page&&<>
    <div className={styles.actions}><strong>{page.name}</strong><button disabled={!past.length} onClick={()=>history()}>Undo</button><button disabled={!future.length} onClick={()=>history(true)}>Redo</button><button aria-pressed={preview} onClick={()=>setPreview(!preview)}>Preview</button><button disabled={!dirty} onClick={()=>void save()}>Save draft</button><button className="button" onClick={()=>void save(true)}>Publish</button></div>
    <p className={styles.guidance}>{pageUsesEditorialContent(page.path)?'These sections appear above the existing screen. Service and moderation controls stay app-managed.':'Publishing replaces this page’s content body. Header, navigation and account tools stay app-managed.'} Target: {page.target_platform}.</p>
    <details className={styles.panel}><summary>Page settings & recovery</summary><div className={styles.stack}>
     <label>Display name<input maxLength={100} value={page.name} onChange={event=>edit({...page,name:event.target.value})}/></label><label>Description<textarea aria-label="Page description" maxLength={500} value={page.description} onChange={event=>edit({...page,description:event.target.value})}/></label>
     <label>Publish to<select aria-label="Publish to" value={page.target_platform} onChange={event=>edit({...page,target_platform:event.target.value as VistrahPage['target_platform']})}><option value="all">Website and mobile</option><option value="web">Website only</option><option value="mobile">Mobile app only</option></select></label><p>Page address: <code>{page.path}</code></p>
     <div className={styles.actions}><button disabled={!dirty} onClick={()=>{if(discard())void load(page.slug);}}>Discard edits</button>
      <button disabled={page.content_source!=='CMS'} onClick={()=>{if(discard())void run(async()=>{const live=await client.getPublishedPage(page.slug);edit({...page,name:live.name,description:live.description,target_platform:live.target_platform,sections:clone(live.sections)});setNotice('Published content loaded for editing. Save and publish to apply.');});}}>Restore published content to draft</button>
      <button disabled={page.content_source!=='CMS'} onClick={()=>{if(discard()&&window.confirm('Unpublish? Core pages return to app content; custom pages become unavailable. The draft stays, but its published snapshot is removed.'))void run(async()=>{accept(await client.unpublishPage(page.slug,page.revision));setNotice('Unpublished. Draft retained; open screens must reload.');});}}>Unpublish</button>
      {!corePages.includes(page.slug)&&<button onClick={()=>{if(window.confirm('Delete this custom page, its draft and publication?'))void run(async()=>{await client.deletePage(page.slug);const result=await loadVistrahEditor(client);setPages(result.pages);if(result.page)accept(result.page);setNotice('Custom page deleted.');});}}>Delete page</button>}
     </div><p>Restore loads the last active publication. Undo history lasts until a save or page change.</p>
    </div></details>
    <div className={styles.actions}><label>Language<select aria-label="Language" value={locale} onChange={event=>setLocale(event.target.value as Locale)}><option value="en">English</option><option value="kn">Kannada</option><option value="hi">Hindi</option></select></label><small>Empty translated fields use English.</small></div>
    {preview&&<section className={styles.panel} aria-label="Draft content preview"><div className={styles.actions}><h2>Draft content preview</h2><button onClick={()=>setPhone(!phone)}>{phone?'Use desktop width':'Use phone width'}</button></div><p>Content and image layout preview. App widgets are placeholders; native styling and video playback need device review.</p><div className={styles.preview} style={{maxWidth:phone?390:960}}>{page.sections.filter(item=>item.enabled&&(item.type!=='header'||!!item.content)).slice().sort((a,b)=>a.order-b.order).map(item=>{
     const text=sectionCopy(item,locale),href=contentHref(item.action_href),layout=sectionLayout(item);
     return <section key={item.id} data-layout={layout} data-banner={['hero_banner','editable_banner'].includes(item.type)} className={styles.previewSection}><h2>{text.title}</h2>{text.description&&<p>{text.description}</p>}
      {item.type==='search_bar'&&!pageUsesEditorialContent(page.path)&&<input disabled aria-label="Search preview" placeholder={text.description}/>}
      {!!item.images.length&&<div className={layout==='rail'?styles.rail:styles.grid}>{item.images.filter(image=>contentImage(image.url)).map((image,index)=><figure key={index}><EditorImage image={image}/>{image.title&&<figcaption>{image.title}</figcaption>}</figure>)}</div>}
      {!!item.video_urls?.length&&<p>Video playlist: {item.video_urls.filter(url=>url.trim()).length} videos</p>}
      {!pageUsesEditorialContent(page.path)&&['services_for_you','big_widget'].includes(item.type)&&<p className={styles.guidance}>{item.type==='services_for_you'?'Live category grid':'Ads & Marketing widget'} — rendered by the app</p>}
      {href&&text.action&&featureEnabled(item,'show_direct_cta')&&<span className="button">{text.action} → {href}</span>}
     </section>;
    })}</div></section>}
    <div className={styles.sections}><aside className={styles.outline}><h2>Sections ({page.sections.length}/30)</h2>{page.sections.map((item,index)=><div className={styles.outlineRow} key={item.id}><button aria-pressed={section?.id===item.id} onClick={()=>setSelected(item.id)}><strong>{index+1}. {item.name}</strong><small>{item.enabled?'Visible':'Hidden'}</small></button><button aria-label={'Move '+item.name+' up'} disabled={!index} onClick={()=>move(index,-1)}>↑</button><button aria-label={'Move '+item.name+' down'} disabled={index===page.sections.length-1} onClick={()=>move(index,1)}>↓</button></div>)}
     <label>Add a section<select aria-label="Add a section" value="" disabled={page.sections.length>=30} onChange={event=>add(event.target.value)}><option value="">Choose section…</option>{library.filter(item=>item.type!=='header').map(item=><option key={item.type} value={item.type}>{item.default_name}</option>)}</select></label>
    </aside><section className={styles.panel} aria-label="Section editor">{section?<div className={styles.stack}>
     <div className={styles.actions}><h2>{section.name}</h2><button onClick={duplicate} disabled={page.sections.length>=30}>Duplicate</button><button onClick={()=>{if(window.confirm('Remove this section? You can undo before saving.')){edit({...page,sections:page.sections.filter(item=>item.id!==section.id).map((item,i)=>({...item,order:i+1}))});setSelected('');}}}>Remove</button></div>
     <label>Section name<input value={section.name} onChange={event=>patch(section.id,{name:event.target.value})}/></label><label className={styles.check}><input type="checkbox" checked={section.enabled} onChange={event=>patch(section.id,{enabled:event.target.checked})}/>Show this section</label>
     <label>Heading<textarea aria-label="Heading" rows={2} maxLength={5000} value={section.content?.[locale]?.title??''} onChange={event=>copy('title',event.target.value)}/></label><label>Description<textarea aria-label="Description" rows={5} maxLength={5000} value={section.content?.[locale]?.description??''} onChange={event=>copy('description',event.target.value)}/></label><label>Button label<input maxLength={5000} value={section.content?.[locale]?.action??''} onChange={event=>copy('action',event.target.value)}/></label>
     <label>Button destination<input value={section.action_href??''} onChange={event=>patch(section.id,{action_href:event.target.value})} placeholder="/services"/></label><small>Use an existing app path or mailto:info@vistrah.in. A button needs both a label and destination.</small>
     <label className={styles.check}><input type="checkbox" checked={featureEnabled(section,'show_direct_cta')} onChange={event=>patch(section.id,{features:[...section.features.filter(item=>item.key!=='show_direct_cta'),{key:'show_direct_cta',label:'Show button',description:'Display the section button',enabled:event.target.checked}]})}/>Show button</label>
     {section.type==='search_bar'?<p>Search remains app-managed on service screens.</p>:<label>Image layout<select aria-label="Image layout" value={section.variation} onChange={event=>patch(section.id,{variation:event.target.value})}>{!contentLayouts.some(item=>item.key===section.variation)&&<option value={section.variation}>Existing layout (preserved)</option>}{contentLayouts.map(item=><option key={item.key} value={item.key}>{item.name}</option>)}</select></label>}
     <h3>Photos ({section.images.length}/20)</h3><small>JPG, PNG, WebP or GIF under 400 KB. Files are embedded in this page; use hosted HTTPS links for larger media.</small>
     {section.images.map((image,index)=><details key={index} className={styles.photo}><summary>Photo {index+1}: {image.title||'Untitled'}{image.width&&image.height?' · '+image.width+' × '+image.height+' px':''}</summary><div className={styles.stack}>{contentImage(image.url)&&<EditorImage image={image}/>}
      <label>Image URL<textarea aria-label="Image URL" rows={2} value={image.url.startsWith('data:')?'':image.url} placeholder={image.url.startsWith('data:')?'Embedded photo — enter a URL to replace':'https://…'} onChange={event=>imagePatch(index,{url:event.target.value})}/></label><label>Caption<input value={image.title??''} onChange={event=>imagePatch(index,{title:event.target.value})}/></label><label>Alternative text<input value={image.alt_text??''} onChange={event=>imagePatch(index,{alt_text:event.target.value})}/></label>
      <div className={styles.actions}><button disabled={!index} onClick={()=>movePhoto(index,-1)}>Move photo up</button><button disabled={index===section.images.length-1} onClick={()=>movePhoto(index,1)}>Move photo down</button><button onClick={()=>patch(section.id,{images:section.images.filter((_,i)=>i!==index)})}>Remove photo</button></div></div></details>)}
     <div className={styles.actions}><label>Choose photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={section.images.length>=20} onChange={event=>void upload(event)}/></label><button disabled={section.images.length>=20} onClick={()=>patch(section.id,{images:[...section.images,{url:'',title:'',alt_text:''}]})}>+ Image URL</button></div>
     <label>Video playlist<textarea aria-label="Video playlist" rows={3} value={(section.video_urls??[]).join('\n')} onChange={event=>patch(section.id,{video_urls:event.target.value.split('\n')})} placeholder="One hosted HTTPS or local video URL per line"/></label><small>Up to 12 videos. Video uploading and cropping are unavailable.</small>
    </div>:<p>Add a section to start editing.</p>}</section></div>
   </>}</div>
  </fieldset>
 </div>;
}
