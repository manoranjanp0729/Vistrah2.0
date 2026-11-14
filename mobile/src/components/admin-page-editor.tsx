import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Switch,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text,TextInput} from './typography';
import {ContentSection} from './edit-vistrah-content';
import {useTheme} from '../lib/theme';
import {useSession} from '../lib/session';
import {api} from '../lib/api';
import {pickEditorImage} from '../lib/editor-image-picker';
import {editVistrahClient,loadVistrahEditor,editorPageStatus,calculateAspectRatio,SECTION_LIBRARY,type VistrahPage,type PageSection,type SectionLibraryItem} from '../../../shared/edit-vistrah';
import {contentLayouts,contentHref,contentImage,featureEnabled,pageUsesEditorialContent,sectionCopy} from '../../../shared/edit-vistrah-content';
import {editorChanges} from '../../../shared/editor-review';
import {validateEditorPageSize} from '../../../shared/editor-image';

type Locale='en'|'kn'|'hi';
type Panel='text'|'photos'|'button'|'layout'|'add'|'settings'|'create';
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const corePages=['home','services','v-ads','v-essentials','marketing-solutions','digital-marketing','branding-creative-production','outdoor-advertising-signage','mobility-billboard-advertising'];
const sectionNames:Record<string,string>={hero_banner:'Photo banner',editable_banner:'Highlight',custom:'Text & media',search_bar:'Search',services_for_you:'Categories',big_widget:'Ads & Marketing'};
const languages:{key:Locale;label:string}[]=[{key:'en',label:'English'},{key:'kn',label:'ಕನ್ನಡ'},{key:'hi',label:'हिन्दी'}];
const audience={all:'Website and app',web:'Website only',mobile:'App only'};
const textSection:SectionLibraryItem={type:'custom',default_name:'Text & media',description:'A heading, description, photos and a button.',recommended_resolution:'',variations:[],default_features:[],default_images:[]};
const errorText=(error:unknown)=>error instanceof Error?error.message:'Could not complete that action. Please retry.';
const confirmAction=(title:string,body:string)=>Platform.OS==='web'?Promise.resolve(window.confirm(title+'\n\n'+body)):new Promise<boolean>(resolve=>Alert.alert(title,body,[{text:'Cancel',style:'cancel',onPress:()=>resolve(false)},{text:'Continue',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
const imageUri=(url:string)=>url.startsWith('/')?(process.env.EXPO_PUBLIC_WEB_URL||'https://vistrah.in').replace(/\/$/,'')+url:url;

function Button({label,onPress,disabled=false,primary=false,accessibilityLabel}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;accessibilityLabel?:string}){
 const {colors,accentGradient}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,{backgroundColor:primary?accentGradient[0]:colors.soft,borderColor:primary?accentGradient[0]:colors.border,opacity:disabled?.45:pressed?.75:1}]}><Text style={{color:primary?'#fff':colors.text,fontWeight:'700',textAlign:'center',fontSize:14}}>{label}</Text></Pressable>;
}
function Field({label,value,onChange,multiline=false,disabled=false,placeholder=''}:{label:string;value:string;onChange:(value:string)=>void;multiline?:boolean;disabled?:boolean;placeholder?:string}){
 const {colors,styles}=useTheme();
 return <View style={s.gap}><Text style={{color:colors.text,fontWeight:'600'}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} multiline={multiline} maxLength={5000} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input,multiline&&{minHeight:110,textAlignVertical:'top'}]}/></View>;
}
function Photo({url,small=false}:{url:string;small?:boolean}){
 const {colors}=useTheme(),[failed,setFailed]=useState('');
 return failed===url||!contentImage(url)?<View style={[s.image,{height:small?100:150,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'}]}><Text style={{color:colors.muted}}>Photo preview unavailable</Text></View>:<Image source={{uri:imageUri(url)}} accessibilityLabel="Page photo" resizeMode="cover" style={[s.image,{height:small?100:150,backgroundColor:colors.soft}]} onError={()=>setFailed(url)}/>;
}

export function AdminPageEditor(){
 const {user,ready}=useSession();
 if(!ready)return <ActivityIndicator/>;
 if(user?.role!=='ADMIN')return <Text>Administrator access required.</Text>;
 return <PageEditor/>;
}

function PageEditor(){
 const {colors,styles,accentGradient}=useTheme();
 const [client]=useState(()=>editVistrahClient(api));
 const [pages,setPages]=useState<VistrahPage[]>([]),[page,setPage]=useState<VistrahPage|null>(null),[baseline,setBaseline]=useState<VistrahPage|null>(null);
 const [library,setLibrary]=useState(SECTION_LIBRARY),[stage,setStage]=useState<'pages'|'edit'|'review'>('pages');
 const [busy,setBusy]=useState(true),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[filter,setFilter]=useState('');
 const [locale,setLocale]=useState<Locale>('en'),[panel,setPanel]=useState<Panel|null>(null),[section,setSection]=useState<PageSection|null>(null),[sectionOriginal,setSectionOriginal]=useState('');
 const [history,setHistory]=useState<VistrahPage[]>([]),[reorder,setReorder]=useState(false),[reviewed,setReviewed]=useState(false);
 const [imageLink,setImageLink]=useState(''),[details,setDetails]=useState(false),[newName,setNewName]=useState(''),[newSlug,setNewSlug]=useState('');
 const locked=useRef(true),photoRequest=useRef(0),dirtyRef=useRef(false);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const editorScroll=useRef<ScrollView>(null);
 useEffect(()=>{editorScroll.current?.scrollTo({y:0,animated:false});},[stage]);
 const dirty=!!page&&!!baseline&&JSON.stringify(page)!==JSON.stringify(baseline),working=busy||photoBusy;
 const addableLibrary=library.some(item=>item.type==='custom')?library:[...library,textSection];
 useEffect(()=>{dirtyRef.current=dirty||!!section&&JSON.stringify(section)!==sectionOriginal;},[dirty,section,sectionOriginal]);
 useEffect(()=>{
  let active=true;
  loadVistrahEditor(client).then(result=>{if(active){setPages(result.pages);if(result.library.length)setLibrary(result.library);setError(result.warning);}}).catch(cause=>{if(active)setError(errorText(cause));}).finally(()=>{if(active){locked.current=false;setBusy(false);}});
  return()=>{active=false;};
 },[client]);
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  const leave=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);
 },[]);
 function accept(next:VistrahPage){setPage(clone(next));setBaseline(clone(next));setHistory([]);setReviewed(false);setPages(list=>list.some(item=>item.slug===next.slug)?list.map(item=>item.slug===next.slug?next:item):[...list,next]);}
 async function run(action:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(true);setError('');setNotice('');try{await action();}catch(cause){setError(errorText(cause));editorScroll.current?.scrollTo({y:0,animated:false});}finally{locked.current=false;setBusy(false);}}
 function edit(next:VistrahPage){if(!page)return;setHistory(values=>[...values.slice(-29),clone(page)]);setPage(next);setReviewed(false);setNotice('');}
 async function closeEditor(){if(working)return;if(dirty&&!await confirmAction('Leave this page?','Unsaved changes will be discarded. Save a draft first to keep them.'))return;setPanel(null);setSection(null);setStage('pages');setPage(null);setBaseline(null);setHistory([]);setError('');setNotice('');}
 async function closePanel(){if(working)return;if(section&&JSON.stringify(section)!==sectionOriginal&&!await confirmAction('Discard section edits?','Your changes in this panel have not been applied.'))return;setPanel(null);setSection(null);}
 function openSection(value:PageSection,tab:Panel='text'){setSection(clone(value));setSectionOriginal(JSON.stringify(value));setPanel(tab);setDetails(false);setImageLink('');setError('');}
 function applySection(){
  if(!page||!section||working)return;
  try{
   if(section.action_href&&!contentHref(section.action_href))throw new Error('Choose a local page address or mailto:info@vistrah.in for the button.');
   if(section.images.some(image=>!contentImage(image.url)))throw new Error('Use a valid HTTPS link or choose a photo from your device.');
   const next={...page,sections:page.sections.map(item=>item.id===section.id?section:item)};validateEditorPageSize(next);edit(next);setPanel(null);setSection(null);setError('');
  }catch(cause){setError(errorText(cause));}
 }
 async function persist(publish=false){
  if(!page||publish&&!reviewed)return;
  await run(async()=>{validateEditorPageSize(page);let next=page;if(dirty){next=await client.updatePage(page.slug,page);accept(next);}if(publish){next=await client.publishPage(next.slug);accept(next);setStage('edit');}setNotice(publish?'Published to '+audience[next.target_platform].toLowerCase()+'.':'Draft saved. Your live page has not changed.');});
 }
 function move(index:number,direction:number){if(!page)return;const list=[...page.sections],to=index+direction;if(to<0||to>=list.length)return;[list[index],list[to]]=[list[to],list[index]];edit({...page,sections:list.map((item,i)=>({...item,order:i+1}))});}
 async function choosePhoto(index:number|null){
  if(working||!section)return;const request=++photoRequest.current;setPhotoBusy(true);setError('');
  try{const photo=await pickEditorImage();if(!photo||request!==photoRequest.current||!alive.current)return;setSection(value=>{
   if(!value)return value;const images=[...value.images],item={...photo,alt_text:photo.title,aspect_ratio:calculateAspectRatio(photo.width,photo.height),resolution:photo.width+' × '+photo.height+' px'};
   if(index===null)images.push(item);else images[index]={...images[index],...item};return {...value,images};
  });}catch(cause){if(request===photoRequest.current&&alive.current)setError(errorText(cause));}finally{if(request===photoRequest.current&&alive.current)setPhotoBusy(false);}
 }
 function addSection(type:string){if(!page)return;const item=addableLibrary.find(value=>value.type===type);if(!item)return;const id='section-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),name=sectionNames[type]||item.default_name;
  const next:PageSection={id,type,name,variation:'content_grid',available_variations:clone(item.variations),features:clone(item.default_features),images:[],order:page.sections.length+1,enabled:true,content:{en:{title:name}}};edit({...page,sections:[...page.sections,next]});openSection(next);
 }
 const surface={backgroundColor:colors.surface,borderColor:colors.border},muted={color:colors.muted},ink={color:colors.text};
 const changes=page&&baseline?editorChanges(baseline,page):[];
 const feedback=<>{!!error&&<Text accessibilityRole="alert" style={{color:'#be123c',lineHeight:22}}>{error}</Text>}{!!notice&&<Text accessibilityRole="alert" style={{color:colors.text,lineHeight:22}}>{notice}</Text>}</>;
 const localizedField=(field:'title'|'description'|'action',label:string,multiline=false)=><Field label={label} value={section?.content?.[locale]?.[field]??''} disabled={working} multiline={multiline} onChange={value=>{if(section)setSection({...section,content:{...section.content,[locale]:{...section.content?.[locale],[field]:value}}});}}/>;

 return <View style={s.stack}>
  <View style={s.row}><View style={s.grow}><Text style={[styles.heading,{fontSize:22}]}>What would you like to edit?</Text><Text style={muted}>Choose a page to start.</Text></View><Button label="New page" disabled={working} onPress={()=>{setNewName('');setNewSlug('');setPanel('create');}}/></View>
  {stage==='pages'&&feedback}
  <Field label="Find a page" value={filter} onChange={setFilter} placeholder="Home, services, marketing…"/>
  {busy&&<ActivityIndicator/>}
  {!pages.length&&!busy&&<Button label="Retry loading pages" onPress={()=>void run(async()=>{const result=await loadVistrahEditor(client);setPages(result.pages);if(result.library.length)setLibrary(result.library);setError(result.warning);})}/>}
  <View style={s.gallery}>{pages.filter(value=>(value.name+' '+value.description).toLowerCase().includes(filter.toLowerCase())).map(value=>{
   const image=value.sections.flatMap(item=>item.images).find(item=>contentImage(item.url));
   return <Pressable key={value.slug} accessibilityRole="button" accessibilityLabel={'Edit '+value.name} disabled={working} onPress={()=>void run(async()=>{accept(await client.getPage(value.slug));setStage('edit');setReorder(false);})} style={[s.pageCard,surface]}>
    <View style={[s.thumbnail,{backgroundColor:colors.soft}]}>{image?<Photo url={image.url} small/>:<View style={{height:68,backgroundColor:accentGradient[0],borderRadius:8,padding:12}}><Text numberOfLines={2} style={{color:'#fff',fontWeight:'700'}}>{value.sections[0]?sectionCopy(value.sections[0],locale).title:value.name}</Text></View>}<View style={s.miniGrid}>{[0,1,2].map(i=><View key={i} style={{height:16,flex:1,borderRadius:4,backgroundColor:colors.border}}/>)}</View></View>
    <Text style={[ink,{fontWeight:'700',fontSize:16}]}>{value.name}</Text><Text style={[muted,{fontSize:12}]}>{value.sections.length} sections · {editorPageStatus(value)}</Text><Text style={{color:accentGradient[0],fontWeight:'700'}}>Edit page →</Text>
   </Pressable>;
  })}</View>
  <Modal visible={stage!=='pages'&&!!page} animationType="slide" presentationStyle="fullScreen" onRequestClose={()=>void closeEditor()}>
   <SafeAreaView style={[s.full,{backgroundColor:colors.background}]}><View style={[s.topbar,{borderColor:colors.border}]}><Button label="All pages" disabled={working} onPress={()=>void closeEditor()}/><View style={s.grow}><Text style={[ink,{fontWeight:'700',fontSize:17}]} numberOfLines={1}>{page?.name}</Text><Text style={[muted,{fontSize:12}]}>{dirty?'Unsaved changes':page?editorPageStatus(page):''}</Text></View>{working&&<ActivityIndicator/>}</View>
    <View style={[s.row,{paddingHorizontal:18,paddingVertical:10}]}>{['1 Choose page','2 Edit content','3 Review'].map((label,index)=><Text key={label} style={{color:(stage==='edit'?index===1:index===2)?accentGradient[0]:colors.muted,fontSize:12,fontWeight:'700'}}>{label}</Text>)}</View>
    <ScrollView ref={editorScroll} contentContainerStyle={s.canvas} keyboardShouldPersistTaps="handled">
     {feedback}
     {page&&stage==='edit'&&<>
      <View style={s.row}><Text style={[styles.heading,s.grow]}>Tap anything to edit</Text><Button label="Page options" disabled={working} onPress={()=>setPanel('settings')}/></View>
      <View style={s.row}>{languages.map(language=><Pressable key={language.key} disabled={working} accessibilityRole="button" accessibilityLabel={'Preview in '+language.label} accessibilityState={{selected:locale===language.key}} onPress={()=>setLocale(language.key)} style={[s.chip,{borderColor:locale===language.key?accentGradient[0]:colors.border,backgroundColor:locale===language.key?colors.soft:colors.surface}]}><Text style={ink}>{language.label}</Text></Pressable>)}</View>
      <Text style={[muted,{fontSize:13,lineHeight:20}]}>Your draft preview. Text, photos and buttons are editable. Navigation and live service tools stay app-managed.</Text>
      <View style={[s.pageCanvas,surface]}><View style={[s.mockHeader,{borderColor:colors.border}]}><Text style={[ink,{fontWeight:'800'}]}>VISTRAH</Text><Text style={muted}>Navigation · app-managed</Text></View>
       {page.sections.filter(item=>item.enabled&&(item.type!=='header'||!!item.content)).slice().sort((a,b)=>a.order-b.order).map(item=><Pressable key={item.id} disabled={working} accessibilityRole="button" accessibilityLabel={'Edit section '+sectionCopy(item,locale).title} onPress={()=>openSection(item)} style={s.selectable}><View pointerEvents="none"><ContentSection section={item} preview previewLocale={locale} editorialOnly={pageUsesEditorialContent(page.path)}/></View><View style={[s.editTag,{backgroundColor:colors.surface,borderColor:colors.border}]}><Text style={{color:accentGradient[0],fontSize:12,fontWeight:'700'}}>Tap to edit</Text></View></Pressable>)}
       {!page.sections.some(item=>item.enabled&&item.type!=='header')&&<Text style={[muted,{padding:20}]}>Start with a banner or a text section.</Text>}
       {pageUsesEditorialContent(page.path)&&<View style={[s.note,{backgroundColor:colors.soft}]}><Text style={muted}>The existing service screen continues below these sections.</Text></View>}
      </View>
      {page.sections.filter(item=>!item.enabled).map(item=><Button key={item.id} label={'Hidden: '+item.name+' · edit'} disabled={working} onPress={()=>openSection(item,'layout')}/>)}
      <Button label="+ Add a section" disabled={working||page.sections.length>=30} onPress={()=>setPanel('add')}/>
      <View style={s.row}><Button label={reorder?'Done arranging':'Arrange sections'} disabled={working} onPress={()=>setReorder(!reorder)}/><Button label="Undo" disabled={working||!history.length} onPress={()=>{setPage(history[history.length-1]);setHistory(values=>values.slice(0,-1));setReviewed(false);}}/></View>
      {reorder&&page.sections.map((item,index)=><View key={item.id} style={[s.reorderRow,surface,s.row]}><Text style={[ink,s.grow]}>{index+1}. {item.name}</Text><Button label="↑" accessibilityLabel={'Move '+item.name+' up'} disabled={working||!index} onPress={()=>move(index,-1)}/><Button label="↓" accessibilityLabel={'Move '+item.name+' down'} disabled={working||index===page.sections.length-1} onPress={()=>move(index,1)}/></View>)}
     </>}
     {page&&stage==='review'&&<>
      <Text style={[styles.heading,{fontSize:24}]}>Ready to publish?</Text><Text style={[muted,{lineHeight:22}]}>Check the changes and audience before updating your live page.</Text>
      <View style={[s.card,surface]}><Text style={[ink,{fontWeight:'700'}]}>Unsaved changes</Text>{changes.length?changes.map((change,index)=><Text key={index} style={ink}>• {change}</Text>):<Text style={muted}>No unsaved changes. You are reviewing the saved draft.</Text>}</View>
      <View style={[s.card,surface]}><Text style={[ink,{fontWeight:'700'}]}>Who will see this?</Text><Text style={ink}>{audience[page.target_platform]}</Text><Text style={muted}>{page.path}</Text><Text style={[ink,{lineHeight:22}]}>{pageUsesEditorialContent(page.path)?'These sections appear above the existing service screen.':'Publishing replaces this page’s content with your edited sections.'}</Text><Text style={[muted,{lineHeight:22}]}>Navigation, account access and service permissions remain managed by Vistrah.</Text></View>
      <View style={s.previewLabel}><Text style={[ink,{fontWeight:'700'}]}>Page preview</Text></View>{page.sections.filter(item=>item.enabled&&(item.type!=='header'||!!item.content)).slice().sort((a,b)=>a.order-b.order).map(item=><View key={item.id} pointerEvents="none"><ContentSection section={item} preview previewLocale={locale} editorialOnly={pageUsesEditorialContent(page.path)}/></View>)}
      <Pressable accessibilityRole="checkbox" accessibilityLabel="I reviewed this page" accessibilityState={{checked:reviewed}} disabled={working} onPress={()=>setReviewed(!reviewed)} style={[s.card,surface,s.row]}><Text style={{color:accentGradient[0],fontSize:24}}>{reviewed?'☑':'☐'}</Text><Text style={[ink,s.grow]}>I reviewed this page and its publishing audience.</Text></Pressable>
     </>}
    </ScrollView>
    <View style={[s.footer,{backgroundColor:colors.surface,borderColor:colors.border}]}>{stage==='edit'?<><View style={s.grow}><Button label="Save draft" disabled={working||!dirty} onPress={()=>void persist()}/></View><View style={s.grow}><Button label="Review changes" primary disabled={working} onPress={()=>{setReviewed(false);setStage('review');}}/></View></>:<><View style={s.grow}><Button label="Keep editing" disabled={working} onPress={()=>setStage('edit')}/></View><View style={s.grow}><Button label="Publish page" primary disabled={working||!reviewed} onPress={()=>void persist(true)}/></View></>}</View>
    {panel!=='create'&&renderPanel()}
   </SafeAreaView>
  </Modal>
  {panel==='create'&&renderPanel()}
 </View>;

 function renderPanel(){return <Modal visible={!!panel} transparent animationType="slide" onRequestClose={()=>void closePanel()}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.backdrop}><SafeAreaView edges={['bottom']} style={[s.sheet,{backgroundColor:colors.surface}]}>
  <View style={s.row}><Text style={[ink,s.grow,{fontSize:20,fontWeight:'700'}]}>{panel==='create'?'New page':panel==='add'?'Add a section':panel==='settings'?'Page options':section?sectionCopy(section,locale).title:'Edit section'}</Text><Button label="Close panel" disabled={working} onPress={()=>void closePanel()}/></View>
  <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={s.panelContent}>
   {feedback}
   {!!section&&<View style={s.row}>{(['text','photos','button','layout'] as const).map(tab=><Pressable key={tab} accessibilityRole="button" accessibilityLabel={'Edit '+tab} accessibilityState={{selected:panel===tab}} disabled={working} onPress={()=>setPanel(tab)} style={[s.chip,{backgroundColor:panel===tab?colors.soft:colors.surface,borderColor:panel===tab?accentGradient[0]:colors.border}]}><Text style={[ink,{textTransform:'capitalize'}]}>{tab}</Text></Pressable>)}</View>}
   {panel==='text'&&section&&<><Text style={muted}>Editing {languages.find(value=>value.key===locale)?.label}. Empty translations use English.</Text>{localizedField('title','Heading')}{localizedField('description','Description',true)}</>}
   {panel==='button'&&section&&<>{localizedField('action','Button label')}<Field label="Where should this button go?" value={section.action_href??''} disabled={working} placeholder="/services" onChange={value=>setSection({...section,action_href:value})}/><Text style={muted}>Use a Vistrah page address, such as /services, or mailto:info@vistrah.in.</Text><View style={s.row}><Text style={[ink,s.grow]}>Show button</Text><Switch accessibilityLabel="Show button" disabled={working} value={featureEnabled(section,'show_direct_cta')} onValueChange={value=>setSection({...section,features:[...section.features.filter(item=>item.key!=='show_direct_cta'),{key:'show_direct_cta',label:'Show button',description:'',enabled:value}]})}/></View></>}
   {panel==='photos'&&section&&<>
    {section.images.map((image,index)=><View key={index} style={[s.card,surface]}><Photo url={image.url}/><View style={s.row}><Text style={[ink,s.grow,{fontWeight:'700'}]}>Photo {index+1}</Text><Button label={'Replace photo '+(index+1)} disabled={working} onPress={()=>void choosePhoto(index)}/><Button label={'Remove photo '+(index+1)} disabled={working} onPress={()=>setSection({...section,images:section.images.filter((_,i)=>i!==index)})}/></View><Field label={'Photo '+(index+1)+' caption'} value={image.title??''} disabled={working} onChange={value=>setSection({...section,images:section.images.map((item,i)=>i===index?{...item,title:value}:item)})}/><Field label={'Photo '+(index+1)+' description for accessibility'} value={image.alt_text??''} disabled={working} onChange={value=>setSection({...section,images:section.images.map((item,i)=>i===index?{...item,alt_text:value}:item)})}/><View style={s.row}><Button label={'Move photo '+(index+1)+' earlier'} disabled={working||!index} onPress={()=>{const list=[...section.images];[list[index-1],list[index]]=[list[index],list[index-1]];setSection({...section,images:list});}}/><Button label={'Move photo '+(index+1)+' later'} disabled={working||index===section.images.length-1} onPress={()=>{const list=[...section.images];[list[index],list[index+1]]=[list[index+1],list[index]];setSection({...section,images:list});}}/></View></View>)}
    <Button label={photoBusy?'Reading photo…':'Choose a photo'} primary disabled={working||section.images.length>=20} onPress={()=>void choosePhoto(null)}/><Text style={muted}>JPG, PNG, WebP or GIF · under 400 KB each · up to 20 photos</Text>
    <Button label={details?'Hide photo link':'Use a photo link instead'} disabled={working} onPress={()=>setDetails(!details)}/>{details&&<><Field label="Photo link" value={imageLink} onChange={setImageLink} disabled={working} placeholder="https://…"/><Button label="Add photo link" disabled={working||section.images.length>=20} onPress={()=>{if(!contentImage(imageLink.trim())){setError('Enter a valid HTTPS image link or local image path.');return;}setSection({...section,images:[...section.images,{url:imageLink.trim(),alt_text:'',title:''}]});setImageLink('');setDetails(false);setError('');}}/></>}
   </>}
   {panel==='layout'&&section&&<><View style={s.row}><Text style={[ink,s.grow]}>Show this section</Text><Switch accessibilityLabel="Show section" disabled={working} value={section.enabled} onValueChange={value=>setSection({...section,enabled:value})}/></View><Text style={[ink,{fontWeight:'700'}]}>Photo arrangement</Text>{!contentLayouts.some(value=>value.key===section.variation)&&<Text style={muted}>Your existing arrangement is kept until you choose another.</Text>}{contentLayouts.map(layout=><Pressable key={layout.key} disabled={working} accessibilityRole="radio" accessibilityLabel={layout.name} accessibilityState={{checked:section.variation===layout.key}} onPress={()=>setSection({...section,variation:layout.key})} style={[s.card,{borderColor:section.variation===layout.key?accentGradient[0]:colors.border}]}><View style={[s.miniGrid,{flexDirection:layout.key==='content_rail'?'row':'column'}]}>{[0,1].map(i=><View key={i} style={{height:22,width:layout.key==='content_rail'?'65%':'100%',backgroundColor:colors.soft,borderRadius:layout.key==='content_spotlight'?0:8,borderWidth:layout.key==='content_spotlight'?3:0,borderColor:accentGradient[0]}}/>)}</View><Text style={[ink,{fontWeight:'600'}]}>{layout.name}</Text></Pressable>)}<Button label={details?'Hide section options':'More section options'} disabled={working} onPress={()=>setDetails(!details)}/>{details&&<><Field label="Section name" value={section.name} disabled={working} onChange={value=>setSection({...section,name:value})}/><Field label="Video links, one per line" value={(section.video_urls??[]).join('\n')} multiline disabled={working} onChange={value=>setSection({...section,video_urls:value.split('\n')})}/><Button label="Duplicate section" disabled={working||!page||page.sections.length>=30} onPress={()=>{if(!page)return;const item={...clone(section),id:'copy-'+Date.now().toString(36),name:section.name+' (copy)'};const list=[...page.sections],index=list.findIndex(value=>value.id===section.id);list.splice(index+1,0,item);edit({...page,sections:list.map((value,i)=>({...value,order:i+1}))});setPanel(null);setSection(null);}}/><Button label="Remove section" disabled={working} onPress={()=>void (async()=>{if(page&&await confirmAction('Remove this section?','You can undo this before saving.')){edit({...page,sections:page.sections.filter(item=>item.id!==section.id).map((item,i)=>({...item,order:i+1}))});setPanel(null);setSection(null);}})()}/></>}</>}
   {panel==='add'&&page&&<>{addableLibrary.filter(item=>item.type!=='header').map(item=><Pressable accessibilityRole="button" accessibilityLabel={'Add '+(sectionNames[item.type]||item.default_name)} key={item.type} disabled={working||page.sections.length>=30} onPress={()=>addSection(item.type)} style={[s.card,surface]}><Text style={[ink,{fontSize:17,fontWeight:'700'}]}>{sectionNames[item.type]||item.default_name}</Text><Text style={muted}>{item.type==='custom'?'A heading, description, photos and a button.':item.type==='hero_banner'||item.type==='editable_banner'?'A prominent message with photos and a call to action.':item.type==='search_bar'?'A search heading and search form.':'Heading and supporting content around an app-managed widget.'}</Text></Pressable>)}</>}
   {panel==='settings'&&page&&<><Field label="Page name" value={page.name} disabled={working} onChange={value=>edit({...page,name:value})}/><Field label="Page description" value={page.description} disabled={working} onChange={value=>edit({...page,description:value})}/><Text style={[ink,{fontWeight:'700'}]}>Publishing audience</Text>{(['all','web','mobile'] as const).map(value=><Button key={value} label={(page.target_platform===value?'✓ ':'')+audience[value]} disabled={working} onPress={()=>edit({...page,target_platform:value})}/>)}<Text style={muted}>{page.path}</Text>{!corePages.includes(page.slug)&&<Button label="Delete custom page" disabled={working} onPress={()=>void (async()=>{if(!await confirmAction('Delete this page?','This permanently removes the custom page and its publication.'))return;await run(async()=>{await client.deletePage(page.slug);const result=await loadVistrahEditor(client);setPages(result.pages);setPage(null);setBaseline(null);setPanel(null);setStage('pages');setNotice('Custom page deleted.');});})()}/>}</>}
   {panel==='create'&&<><Field label="Page name" value={newName} disabled={working} onChange={value=>{setNewName(value);setNewSlug(value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));}}/><Field label="Page address" value={newSlug} disabled={working} onChange={setNewSlug} placeholder="summer-offers"/><Text style={muted}>/pages/{newSlug||'your-page'}</Text><Button label="Create draft page" primary disabled={working||!newName.trim()||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug)} onPress={()=>void run(async()=>{accept(await client.createPage({name:newName.trim(),slug:newSlug,path:'/pages/'+newSlug}));setPanel(null);setStage('edit');setNotice('Draft page created. Add your first section.');})}/></>}
  </ScrollView>
  {!!section&&<Button label="Apply changes" primary disabled={working} onPress={applySection}/>}
 </SafeAreaView></KeyboardAvoidingView></Modal>;}
}

const s=StyleSheet.create({
 full:{flex:1},grow:{flex:1,minWidth:0},stack:{gap:18},gap:{gap:8},row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},
 button:{paddingHorizontal:14,paddingVertical:12,minHeight:46,borderWidth:1,borderRadius:12,justifyContent:'center'},
 gallery:{flexDirection:'row',flexWrap:'wrap',gap:14},pageCard:{width:'46%',minWidth:145,maxWidth:420,flexGrow:1,borderWidth:1,borderRadius:18,padding:14,gap:10},
 thumbnail:{padding:10,gap:8,borderRadius:12,overflow:'hidden'},miniGrid:{flexDirection:'row',gap:6,overflow:'hidden'},image:{width:'100%',borderRadius:10},
 topbar:{paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,flexDirection:'row',alignItems:'center',gap:12},
 canvas:{padding:18,gap:18,paddingBottom:30},pageCanvas:{width:'100%',maxWidth:520,alignSelf:'center',borderRadius:20,padding:10,borderWidth:1,gap:12},mockHeader:{padding:12,borderBottomWidth:1,gap:5},
 selectable:{position:'relative',paddingTop:8,paddingBottom:18},editTag:{position:'absolute',bottom:5,right:8,borderWidth:1,borderRadius:20,paddingHorizontal:12,paddingVertical:6},
 chip:{borderWidth:1,paddingHorizontal:14,paddingVertical:11,borderRadius:24,minHeight:44},card:{borderWidth:1,borderRadius:16,padding:16,gap:12},note:{padding:16,borderRadius:12},
 reorderRow:{borderWidth:1,borderRadius:12,padding:12,gap:8},footer:{padding:16,borderTopWidth:1,flexDirection:'row',gap:12},previewLabel:{paddingTop:6},
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{height:'85%',maxHeight:'90%',minHeight:240,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,gap:16},panelContent:{gap:18,paddingBottom:20},
});
