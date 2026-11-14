'use client';
import {UiText,UiNav,UiInput,UiTextarea,UiDiv} from "./localized-ui";
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {Play,RefreshCw,Eye,Heart,MessageCircle,Video,CheckCircle2,Sparkles,Check,PlusCircle,Volume2,VolumeX,Lock,Globe,ShoppingBag,Briefcase,Truck,X,ArrowRight} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useUser} from './customer';
import {vAdsClient,validateVideoFile,studioVideoLive,mediaUrl,mergeReels,parseAdDescription,type Workspace,type Reel,type SellerVideo,type AdMetadata,type AdType,type AdProductMeta} from '../../shared/v-ads';
import s from './v-ads.module.css';
import {AdvertiserManagement,VideoManagement,DiscardUpload} from './v-ads-management';
import {webVideoCoordinator} from '../lib/video-coordinator';

const client=vAdsClient(api);

export function VAdsSeller(){
  return (
    <Suspense fallback={<div className={s.page}><p role="status"><UiText value={"Loading V Ads studio…"}/></p></div>}>
      <VAdsSellerContent/>
    </Suspense>
  );
}

function VAdsSellerContent(){
  const {user}=useUser();
  const [enabled,setEnabled]=useState(false),[enabling,setEnabling]=useState(false),[enableError,setEnableError]=useState('');
  async function activate(){setEnabling(true);setEnableError('');try{await api('/auth/seller/enable',{method:'POST'});setEnabled(true);}catch(e){setEnableError((e as Error).message);}finally{setEnabling(false);}}

  return <SellerWorkspace user={user} enabled={enabled} activate={activate} enabling={enabling} enableError={enableError}/>;
}

function SellerWorkspace({
  user,
  enabled,
  activate,
  enabling,
  enableError,
}:{
  user: any;
  enabled: boolean;
  activate: ()=>Promise<void>;
  enabling: boolean;
  enableError: string;
}){
  const searchParams=useSearchParams();
  const fromParam=searchParams?.get('from');
  const tabParam=searchParams?.get('tab');
  const initialTab=fromParam==='v-ads'||tabParam==='public'||!user?'public':'ads';
  const [studioTab,setStudioTab]=useState<'ads'|'upload'|'public'>(initialTab);

  useEffect(()=>{
    if(fromParam==='v-ads'||tabParam==='public'||!user){
      setStudioTab('public');
    }
  },[fromParam,tabParam,user]);

  const [data,setData]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(Boolean(user));
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [accountId,setAccountId]=useState('');
  const [uploadId,setUploadId]=useState('');
  const [adType,setAdType]=useState<AdType>('PRODUCT');
  const [productName,setProductName]=useState('');
  const [productPrice,setProductPrice]=useState('');
  const [deliveryInfo,setDeliveryInfo]=useState('');
  const [productId,setProductId]=useState('');
  const [productsAvailable,setProductsAvailable]=useState('');
  const [title,setTitle]=useState('');
  const [videoDescription,setVideoDescription]=useState('');
  const [filter,setFilter]=useState<'ALL'|'APPROVED'|'PENDING'|'REJECTED'>('ALL');
  const [busy,setBusy]=useState(false);
  const working=useRef(false);
  const [authRequired,setAuthRequired]=useState(false);

  const account=data?.accounts.find(item=>item.id===accountId)??data?.accounts[0];

  const refresh=useCallback(async()=>{
    if(!user)return;
    try{
      let result=await client.workspace();
      if(!result.accounts.length){
        await api('/auth/seller/enable',{method:'POST'});
        result=await client.workspace();
      }
      setData(result);
      setError('');
    }catch(e){
      setError((e as Error).message);
    }finally{
      setLoading(false);
    }
  },[user]);

  useEffect(()=>{
    if(!user){
      setLoading(false);
      return;
    }
    let alive=true;
    (async()=>{
      try{
        let result=await client.workspace();
        if(!result.accounts.length){
          await api('/auth/seller/enable',{method:'POST'});
          result=await client.workspace();
        }
        if(alive){
          setData(result);
          setError('');
        }
      }catch(e){
        if(alive)setError((e as Error).message);
      }finally{
        if(alive)setLoading(false);
      }
    })();
    return()=>{alive=false;};
  },[user]);

  async function action(work:()=>Promise<void>){
    if(working.current)return;
    working.current=true;setBusy(true);setError('');setMessage('');
    try{await work();}catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.status===401)setAuthRequired(true);}finally{working.current=false;setBusy(false);}
  }

  const rawVideos=(data?.videos??[]).filter(v=>v.status!=='REMOVED');
  const activeVideos=rawVideos.filter(v=>filter==='ALL'||v.status===filter);
  const pendingCount=rawVideos.filter(v=>v.status==='PENDING').length;
  const rejectedCount=rawVideos.filter(v=>v.status==='REJECTED').length;

  return <div className={s.page}>
    {/* V Ads Studio Header Banner */}
    <div style={{
      background: 'linear-gradient(135deg, #2D1F50 0%, #48257C 50%, #642E9E 100%)',
      borderRadius: 18,
      padding: '20px 24px',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 4px 14px rgba(72, 37, 124, 0.25)',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        background: 'rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Video size={24} color="#FFFFFF" />
      </div>
      <div>
        <div style={{fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#eadaff'}}>
          <UiText value="Creator Studio"/>
        </div>
        <h1 style={{margin: '2px 0', fontSize: 22, fontWeight: 800, color: '#FFFFFF'}}>
          <UiText value="V Ads Studio"/>
        </h1>
        <p style={{margin: 0, fontSize: 13, color: '#eadaff'}}>
          <UiText value="Create, promote & track your video ads"/>
        </p>
      </div>
    </div>

    {user ? (
      <>
        <p><UiText value={"Signed in as seller: "}/>{user.email}</p>
        <header className={s.creatorHero}>
          <div className={s.heroHeader}>
            <div className={s.heroAvatar}>
              <Video size={26}/>
            </div>
            <div className={s.heroTitleGroup}>
              <h1>
                {account?.name||'Your V Ads Channel'}
                {account?.status==='APPROVED'&&<CheckCircle2 size={18} color="#4ade80"/>}
              </h1>
              <p className={s.heroHandle}>@{account?.handle||'seller'} <UiText value={"· Free V Ads Creator Channel"}/></p>
            </div>
          </div>
          <div className={s.heroActions}>
            <Link href="/v-ads" className={s.heroActionBtn}>
              <Play size={14}/> <UiText value={"Watch V Ads "}/></Link>
            <button disabled={busy||loading} onClick={()=>void refresh()} className={s.heroActionBtn}>
              <RefreshCw size={14}/> <UiText value={"Refresh "}/></button>
            <Link href="/account" className={s.heroActionBtn} style={{marginLeft:'auto'}}>
              <UiText value={"Account "}/></Link>
          </div>
        </header>
      </>
    ) : (
      <div className={s.panel} style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,padding:'16px 20px',borderRadius:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:20,background:'rgba(80,63,189,0.1)',color:'#503fbd',display:'grid',placeItems:'center'}}>
            <Globe size={20}/>
          </div>
          <div>
            <h2 style={{margin:0,fontSize:16,fontWeight:700}}><UiText value="Public V Ads Studio"/></h2>
            <p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}>
              <UiText value="Browse community ads. Sign in for creator & upload tools."/>
            </p>
          </div>
        </div>
        <Link href="/login?next=%2Fseller%2Fv-ads" style={{padding:'8px 16px',borderRadius:10,background:'#503fbd',color:'#fff',fontWeight:700,fontSize:13,textDecoration:'none'}}>
          <UiText value="Sign in / Register"/>
        </Link>
      </div>
    )}

    {Boolean(error)&&<p role="alert" className={s.error}><UiText value={error}/></p>}
    {authRequired&&<Link href="/login?next=%2Fseller%2Fv-ads"><UiText value={"Sign in again"}/></Link>}
    {Boolean(message)&&<div className={s.panel} style={{borderColor:'#503fbd',background:'var(--surface)'}}><p role="status" style={{margin:0,color:'var(--text-primary)',fontWeight:500}}><UiText value={message}/></p></div>}

    {/* Clean Segmented Toggle Tabs */}
    <UiNav className={s.tabNav} aria-label="Creator Studio Sections">
      <button
        type="button"
        className={`${s.tabButton} ${studioTab==='public'?s.tabButtonActive:''}`}
        onClick={()=>setStudioTab('public')}
      >
        <Globe size={16}/>
        <span><UiText value={"Public V Ads"}/></span>
      </button>
      <button
        type="button"
        className={`${s.tabButton} ${studioTab==='ads'?s.tabButtonActive:''}`}
        onClick={()=>setStudioTab('ads')}
      >
        <Video size={16}/>
        <span><UiText value={"My V Ads"}/></span>
        {Boolean(user)&&<span className={s.tabBadge}>{rawVideos.length}</span>}
      </button>
      <button
        type="button"
        className={`${s.tabButton} ${studioTab==='upload'?s.tabButtonActive:''}`}
        onClick={()=>setStudioTab('upload')}
      >
        <PlusCircle size={16}/>
        <span><UiText value={"+ Upload"}/></span>
      </button>
    </UiNav>

    {/* TAB: PUBLIC APPROVED V ADS (VISIBLE TO ALL USERS) */}
    {studioTab==='public'&&<PublicAdsFeed/>}

    {/* TAB 1: MY V ADS */}
    {studioTab==='ads'&&(!user ? (
      <RestrictedStudioTool
        title="Sign In to Manage Your V Ads"
        description="Track views, likes, comments, and manage all your published video ads."
        icon="video"
      />
    ) : (!user.seller_enabled&&!enabled) ? (
      <div className={s.panel}>
        <h2><UiText value={"Enable Seller Access"}/></h2>
        <p><UiText value={"All sellers can upload V Ads for free. Enable seller access on your account to create your free V Ads account immediately."}/></p>
        {enableError&&<p role="alert" className={s.error}>{enableError}</p>}
        <button disabled={enabling} onClick={()=>void activate()}><UiText value={enabling?'Enabling…':'Enable free V Ads account'}/></button>
      </div>
    ) : loading ? (
      <p role="status"><UiText value={"Loading your V Ads studio…"}/></p>
    ) : !data ? (
      <p role="status"><UiText value={"Unable to load workspace data."}/></p>
    ) : (
      <section style={{display:'grid',gap:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
          <h2 style={{margin:0,fontSize:18}}><UiText value={"Your V Ads ("}/>{rawVideos.length})</h2>
          <div className={s.filterBar}>
            <button type="button" onClick={()=>setFilter('ALL')} className={`${s.filterPill} ${filter==='ALL'?s.filterPillActive:''}`}>
              <UiText value={"All ("}/>{rawVideos.length})
            </button>
            <button type="button" onClick={()=>setFilter('APPROVED')} className={`${s.filterPill} ${filter==='APPROVED'?s.filterPillActive:''}`}>
              <UiText value={"● Approved ("}/>{rawVideos.filter(v=>v.status==='APPROVED').length})
            </button>
            <button type="button" onClick={()=>setFilter('PENDING')} className={`${s.filterPill} ${filter==='PENDING'?s.filterPillActive:''}`}>
              <UiText value={"⏳ Review ("}/>{pendingCount})
            </button>
            <button type="button" onClick={()=>setFilter('REJECTED')} className={`${s.filterPill} ${filter==='REJECTED'?s.filterPillActive:''}`}>
              <UiText value={"⚠️ Changes ("}/>{rejectedCount})
            </button>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16,alignItems:'center',width:'100%'}}>
          {activeVideos.map(video=>(
            <SellerVideoCard key={video.id} video={video} data={data} refresh={refresh}/>
          ))}
        </div>

        {!activeVideos.length&&<div className={s.panel} style={{textAlign:'center',padding:32}}>
          <Video size={36} style={{margin:'0 auto 10px',opacity:0.4}}/>
          <h3 style={{margin:'0 0 6px'}}><UiText value={"No V Ads in this view"}/></h3>
          <p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}><UiText value={"Upload your first V Ad to start reaching customers."}/></p>
          <div style={{marginTop:12}}>
            <button type="button" onClick={()=>setStudioTab('upload')}><UiText value={"+ Upload New V Ad"}/></button>
          </div>
        </div>}

        {data.has_more&&<button disabled={busy} onClick={()=>void action(async()=>{const next=await client.workspace(data.page+1);setData(previous=>previous?{...next,videos:[...previous.videos,...next.videos.filter(item=>!previous.videos.some(old=>old.id===item.id))]}:next);})}><UiText value={"Load more V Ads"}/></button>}

        {/* Channel Profiles */}
        {data.accounts.map(item=><section className={s.panel} style={{marginTop:8}} key={item.id}>
          <div className={s.bar}>
            <div>
              <h2>{item.name}</h2>
              <small>@{item.handle} · {item.status} <UiText value={"· Free seller V Ads channel"}/></small>
            </div>
            {data.accounts.length>1&&<button disabled={busy} onClick={()=>{setAccountId(item.id);setUploadId('');}}><UiText value={account?.id===item.id?'Selected channel':'Use this channel'}/></button>}
          </div>
          {item.description&&<p><UiText value={item.description}/></p>}
          <AdvertiserManagement key={item.review_token??item.id} account={item} onChanged={refresh}/>
        </section>)}
      </section>
    ))}

    {/* TAB 2: UPLOAD V AD */}
    {studioTab==='upload'&&(!user ? (
      <RestrictedStudioTool
        title="Sign In to Upload V Ads"
        description="Upload up to 60-second MP4 videos to promote your business across Vistrah."
        icon="upload"
      />
    ) : (!user.seller_enabled&&!enabled) ? (
      <div className={s.panel}>
        <h2><UiText value={"Enable Seller Access"}/></h2>
        <p><UiText value={"All sellers can upload V Ads for free. Enable seller access on your account to create your free V Ads account immediately."}/></p>
        {enableError&&<p role="alert" className={s.error}>{enableError}</p>}
        <button disabled={enabling} onClick={()=>void activate()}><UiText value={enabling?'Enabling…':'Enable free V Ads account'}/></button>
      </div>
    ) : loading ? (
      <p role="status"><UiText value={"Loading your V Ads studio…"}/></p>
    ) : !data ? (
      <p role="status"><UiText value={"Unable to load workspace data."}/></p>
    ) : (
      <section style={{display:'grid',gap:12}}>
        {account?.status!=='APPROVED'?<div className={s.panel}><p><UiText value={"An approved advertiser profile is required to upload V Ads."}/></p></div>:!data.uploads_available?<div className={s.panel}><h2><UiText value={"Upload new V Ad (Free)"}/></h2><p role="status"><UiText value={"Video storage is currently offline in this environment. Once enabled, upload MP4 videos (H.264/AAC, up to 60s and 100 MB) here for free."}/></p></div>:<form className={s.panel} style={{borderColor:uploadId?'#503fbd':'var(--border)'}} onSubmit={event=>{event.preventDefault();if(!uploadId)return;void action(async()=>{
            const meta: AdMetadata = adType === 'PRODUCT'
              ? {
                  ad_type: 'PRODUCT',
                  product_name: productName.trim() || title.trim(),
                  product_price: productPrice.trim(),
                  delivery_info: deliveryInfo.trim(),
                  product_id: productId.trim() || undefined,
                }
              : {
                  ad_type: 'BRAND',
                  products_available: productsAvailable.trim() || undefined,
                };
            const sub=await client.submit(account.id,uploadId,title,videoDescription,meta);
            setUploadId('');
            setTitle('');
            setVideoDescription('');
            setProductName('');
            setProductPrice('');
            setDeliveryInfo('');
            setProductId('');
            setProductsAvailable('');
            setMessage(sub.status==='APPROVED'?'V Ad published! It is now live on the V Ads tab.':'V Ad uploaded and submitted! It will appear on the V Ads tab after admin approval.');
            setStudioTab('ads');
            await refresh();
          });}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:18,background:'#faf4fb',color:'#503fbd',display:'grid',placeItems:'center'}}>
              <Video size={18}/>
            </div>
            <div>
              <h2 style={{margin:0,fontSize:17}}><UiText value={"Upload New V Ad (Free)"}/></h2>
              <small><UiText value={"MP4 (H.264/AAC) · Up to 60s · Max 100 MB · Live on V Ads tab upon admin approval"}/></small>
            </div>
          </div>
          <label>
            <span style={{fontWeight:600}}><UiText value={"1. Select MP4 video"}/></span>
            <input type="file" accept="video/mp4,.mp4" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;void action(async()=>{validateVideoFile(file.name,file.size);const result=await api<{id:string}>('/v-ads/advertisers/'+encodeURIComponent(account.id)+'/uploads',{method:'POST',headers:{'Content-Type':'video/mp4'},body:file});setUploadId(result.id);setMessage('Video file validated. Add a title and caption below to submit for admin approval.');});}}/>
          </label>
          {data.uploads.filter(item=>item.advertiser_id===account.id&&!item.video_id).map(item=><div key={item.id} className={s.bar}><button type="button" disabled={busy} onClick={()=>setUploadId(item.id)}><UiText value={uploadId===item.id?'✓ Selected upload '+item.id.slice(0,8):'Use saved upload '+item.id.slice(0,8)}/></button><DiscardUpload id={item.id} onChanged={async()=>{if(uploadId===item.id)setUploadId('');await refresh();}}/></div>)}
          {Boolean(uploadId)&&<div style={{padding:'8px 12px',borderRadius:8,background:'#e6f4ea',color:'#137333',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:6}}><Check size={16}/> <UiText value={"Video validated and ready for submission."}/></div>}

          {/* Ad Type Selector: Product Ad vs Brand Ad */}
          <div style={{display:'grid',gap:8}}>
            <span style={{fontWeight:600}}><UiText value={"2. Select Ad Type"}/></span>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <button
                type="button"
                onClick={()=>setAdType('PRODUCT')}
                style={{
                  padding:'12px',
                  borderRadius:12,
                  border:adType==='PRODUCT'?'2px solid #e11d48':'1px solid var(--border)',
                  background:adType==='PRODUCT'?'rgba(225,29,72,0.06)':'var(--surface)',
                  color:adType==='PRODUCT'?'#e11d48':'var(--text)',
                  cursor:'pointer',
                  display:'flex',
                  flexDirection:'column',
                  alignItems:'center',
                  gap:6,
                  textAlign:'center'
                }}
              >
                <ShoppingBag size={20}/>
                <strong style={{fontSize:13}}><UiText value={"Product Ad"}/></strong>
                <small style={{fontSize:11,color:'var(--text-secondary)'}}><UiText value={"Promote a product with price & delivery options"}/></small>
              </button>
              <button
                type="button"
                onClick={()=>setAdType('BRAND')}
                style={{
                  padding:'12px',
                  borderRadius:12,
                  border:adType==='BRAND'?'2px solid #503fbd':'1px solid var(--border)',
                  background:adType==='BRAND'?'rgba(80,63,189,0.06)':'var(--surface)',
                  color:adType==='BRAND'?'#503fbd':'var(--text)',
                  cursor:'pointer',
                  display:'flex',
                  flexDirection:'column',
                  alignItems:'center',
                  gap:6,
                  textAlign:'center'
                }}
              >
                <Briefcase size={20}/>
                <strong style={{fontSize:13}}><UiText value={"Brand Ad"}/></strong>
                <small style={{fontSize:11,color:'var(--text-secondary)'}}><UiText value={"Promote brand & showcase available products"}/></small>
              </button>
            </div>
          </div>

          {adType==='PRODUCT' ? (
            <div style={{display:'grid',gap:10,padding:14,borderRadius:12,border:'1px solid var(--border)',background:'var(--surface-soft,#faf7fc)'}}>
              <span style={{fontSize:12,fontWeight:700,color:'#e11d48',textTransform:'uppercase',letterSpacing:'0.5px'}}><UiText value={"Product Details & Purchasing Options"}/></span>
              <label>
                <span style={{fontWeight:600}}><UiText value={"Product Name"}/></span>
                <UiInput maxLength={100} placeholder="E.g., Pure Kanchipuram Silk Saree" value={productName} onChange={event=>setProductName(event.target.value)}/>
              </label>
              <label>
                <span style={{fontWeight:600}}><UiText value={"Price Details"}/></span>
                <UiInput maxLength={80} placeholder="E.g., ₹2,499 (Incl. of all taxes) or Starting at ₹499" value={productPrice} onChange={event=>setProductPrice(event.target.value)}/>
              </label>
              <label>
                <span style={{fontWeight:600}}><UiText value={"Delivery Options"}/></span>
                <UiInput maxLength={120} placeholder="E.g., Free 2-Day Delivery · Cash on Delivery available" value={deliveryInfo} onChange={event=>setDeliveryInfo(event.target.value)}/>
              </label>
              <label>
                <span style={{fontWeight:600}}><UiText value={"Catalog Product ID (Optional)"}/></span>
                <UiInput maxLength={64} placeholder="Listing ID if listed in Vistrah commerce" value={productId} onChange={event=>setProductId(event.target.value)}/>
              </label>
            </div>
          ) : (
            <div style={{display:'grid',gap:10,padding:14,borderRadius:12,border:'1px solid var(--border)',background:'var(--surface-soft,#faf7fc)'}}>
              <span style={{fontSize:12,fontWeight:700,color:'#503fbd',textTransform:'uppercase',letterSpacing:'0.5px'}}><UiText value={"Brand Details & Products Available"}/></span>
              <label>
                <span style={{fontWeight:600}}><UiText value={"Products & Services Available"}/></span>
                <UiTextarea maxLength={200} placeholder="E.g., Custom tailoring, silk sarees, bridal accessories, fabric dyes" value={productsAvailable} onChange={event=>setProductsAvailable(event.target.value)}/>
              </label>
            </div>
          )}

          <label>
            <span style={{fontWeight:600}}><UiText value={"3. V Ad title"}/></span>
            <UiInput required minLength={3} maxLength={160} placeholder="Highlight your service, special offer or demonstration" value={title} onChange={event=>setTitle(event.target.value)}/>
          </label>
          <label>
            <span style={{fontWeight:600}}><UiText value={"4. Where Product/Brand is Used & Caption"}/></span>
            <UiTextarea maxLength={2000} placeholder="Describe where and how the product is used in the video, business contact, shop location…" value={videoDescription} onChange={event=>setVideoDescription(event.target.value)}/>
          </label>
          <button disabled={busy||!uploadId||title.trim().length<3} style={{background:uploadId&&title.trim().length>=3?'#503fbd':'',color:uploadId&&title.trim().length>=3?'#fff':''}}><UiText value={"Submit V Ad for admin review"}/></button>
        </form>}

        {/* Creator Growth Tips Card */}
        <div className={s.tipsCard}>
          <div className={s.tipsTitle}>
            <Sparkles size={16}/>
            <span><UiText value={"Tips for a clear V Ad"}/></span>
          </div>
          <ul className={s.tipsList}>
            <li><strong><UiText value={"First 3 Seconds:"}/></strong> <UiText value={"Introduce your business name and service prominently right away."}/></li>
            <li><strong><UiText value={"Optimal Duration:"}/></strong> <UiText value={"Keep your video between 15-30 seconds for maximum retention on the V Ads feed."}/></li>
            <li><strong><UiText value={"Clear Demonstration:"}/></strong> <UiText value={"Show behind-the-scenes work, customer results, or clear pricing options."}/></li>
          </ul>
        </div>
      </section>
    ))}
  </div>;
}

function RestrictedStudioTool({
  title,
  description,
  icon,
}:{
  title: string;
  description: string;
  icon: 'video' | 'upload';
}){
  return (
    <div className={s.panel} style={{textAlign:'center',padding:'44px 24px',borderRadius:18,display:'grid',gap:12,justifyItems:'center'}}>
      <div style={{width:54,height:54,borderRadius:27,background:'rgba(80,63,189,0.1)',color:'#503fbd',display:'grid',placeItems:'center'}}>
        {icon==='video'?<Video size={26}/>:<PlusCircle size={26}/>}
      </div>
      <h2 style={{margin:0,fontSize:18,fontWeight:700}}><UiText value={title}/></h2>
      <p style={{margin:0,fontSize:13,color:'var(--text-secondary)',maxWidth:420,lineHeight:1.5}}>
        <UiText value={description}/>
      </p>
      <Link href="/login?next=%2Fseller%2Fv-ads" style={{marginTop:6,padding:'10px 24px',borderRadius:10,background:'#503fbd',color:'#fff',fontWeight:700,fontSize:13,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:6}}>
        <Lock size={14}/>
        <UiText value="Sign in / Register"/>
      </Link>
    </div>
  );
}

function PublicAdsFeed(){
  const [reels,setReels]=useState<Reel[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [page,setPage]=useState(1);
  const [hasMore,setHasMore]=useState(false);
  const [busyMore,setBusyMore]=useState(false);

  const loadFeed=useCallback(async(nextPage=1)=>{
    if(nextPage===1)setLoading(true);
    else setBusyMore(true);
    setError('');
    try{
      const feed=await client.feed(nextPage);
      if(nextPage===1){
        setReels(feed.items);
      }else{
        setReels(prev=>mergeReels(prev,feed.items));
      }
      setPage(feed.page);
      setHasMore(feed.has_more);
    }catch(e){
      setError((e as Error).message);
    }finally{
      setLoading(false);
      setBusyMore(false);
    }
  },[]);

  useEffect(()=>{
    void loadFeed(1);
  },[loadFeed]);

  return (
    <section style={{display:'grid',gap:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:18}}>
            <UiText value="All Approved Public Ads"/>
          </h2>
          <small style={{color:'var(--text-secondary)'}}>
            <UiText value="Community showcase & verified business ads visible to all users."/>
          </small>
        </div>
        <button
          type="button"
          onClick={()=>void loadFeed(1)}
          disabled={loading||busyMore}
          className={s.heroActionBtn}
          style={{background:'var(--surface)',color:'var(--text-primary)!important',border:'1px solid var(--border)'}}
        >
          <RefreshCw size={13}/> <UiText value="Refresh"/>
        </button>
      </div>

      {error&&<p role="alert" className={s.error}><UiText value={error}/></p>}

      {loading?(
        <p role="status"><UiText value="Loading public video ads…"/></p>
      ):!reels.length?(
        <div className={s.panel} style={{textAlign:'center',padding:36}}>
          <Video size={36} style={{margin:'0 auto 10px',opacity:0.4}}/>
          <h3 style={{margin:'0 0 6px'}}><UiText value="No approved public V Ads yet"/></h3>
          <p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}>
            <UiText value="Approved marketing videos from all creators appear here and in the main V Ads feed."/>
          </p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:16,alignItems:'center',width:'100%'}}>
          {reels.map(reel=><PublicAdCard key={reel.id} reel={reel}/>)}
        </div>
      )}

      {hasMore&&(
        <button
          type="button"
          disabled={busyMore}
          onClick={()=>void loadFeed(page+1)}
          style={{marginTop:6}}
        >
          <UiText value={busyMore?'Loading…':'Load more public ads'}/>
        </button>
      )}
    </section>
  );
}

function PublicAdCard({reel}:{reel:Reel}){
  const card=useRef<HTMLElement>(null);
  const videoRef=useRef<HTMLVideoElement>(null);
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(false);
  const [paused,setPaused]=useState(false);
  const [controlsVisible,setControlsVisible]=useState(true);
  const [aspectRatio,setAspectRatio]=useState<number>(9/16);
  const controlsTimer=useRef<NodeJS.Timeout|null>(null);

  let source='';
  try{
    source=mediaUrl(reel.video_url,'/api');
  }catch{
    /* Unsupported sources stay disabled */
  }

  const revealControls=()=>{
    setControlsVisible(true);
    if(controlsTimer.current)clearTimeout(controlsTimer.current);
    controlsTimer.current=setTimeout(()=>{
      setControlsVisible(false);
    },1000);
  };

  useEffect(()=>{
    const player=videoRef.current;
    if(!player)return;
    webVideoCoordinator.register({
      id:'studio-public-'+reel.id,
      element:player,
      visibleArea:0,
      play:()=>{
        if(!paused&&source){
          player.muted=muted;
          void player.play().then(()=>setPlaying(true)).catch(()=>{
            player.muted=true;
            setMuted(true);
            void player.play().then(()=>setPlaying(true)).catch(()=>{});
          });
        }
      },
      pause:()=>{
        player.pause();
        setPlaying(false);
      },
      isManuallyPaused:()=>paused,
    });
    return()=>{
      webVideoCoordinator.unregister('studio-public-'+reel.id);
      if(controlsTimer.current)clearTimeout(controlsTimer.current);
    };
  },[reel.id,paused,source,muted]);

  useEffect(()=>{
    const observer=new IntersectionObserver(
      entries=>{
        const entry=entries[0];
        if(!entry){
          webVideoCoordinator.updateVisibleArea('studio-public-'+reel.id,0);
          return;
        }
        const rect=entry.intersectionRect;
        const area=entry.isIntersecting&&rect?rect.width*rect.height:0;
        webVideoCoordinator.updateVisibleArea('studio-public-'+reel.id,area);
      },
      {threshold:[0,0.1,0.25,0.5,0.75,1]}
    );
    if(card.current)observer.observe(card.current);
    return()=>{
      observer.disconnect();
      webVideoCoordinator.updateVisibleArea('studio-public-'+reel.id,0);
    };
  },[reel.id]);

  const advertiserName=reel.advertiser?.name||reel.advertiser?.handle||'Vistrah Creator';
  const [selectedProductDetails, setSelectedProductDetails] = useState<{
    title: string;
    channelName: string;
    advertiserId?: string;
    description: string;
    meta: AdProductMeta;
  } | null>(null);

  const { description: cleanDesc, meta: reelMeta } = parseAdDescription(reel.description);
  const isProduct = reelMeta.ad_type === 'PRODUCT';

  return (
    <article
      ref={card}
      className={s.videoCard}
      onMouseEnter={revealControls}
      onTouchStart={revealControls}
      style={{
        overflow:'hidden',
        position:'relative',
        maxWidth:aspectRatio<1?400:'100%',
        width:'100%',
        margin:'0 auto',
        transition:'max-width 0.2s ease',
      }}
    >
      <div className={s.videoCardHeader}>
        <div>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',color:'#503fbd'}}>
            {advertiserName}
          </span>
          <h3 className={s.videoTitle} style={{marginTop:2}}>{reel.title}</h3>
        </div>
        <span className={s.badgeLive}>
          <CheckCircle2 size={13} style={{marginRight:4}}/>
          <UiText value="Live Public Ad"/>
        </span>
      </div>

      {cleanDesc&&(
        <p style={{margin:0,fontSize:13,color:'var(--text-secondary)',lineHeight:1.5}}>
          {cleanDesc}
        </p>
      )}

      {/* Explore Product / Explore Brand Action Button */}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:2}}>
        {isProduct ? (
          <button
            type="button"
            onClick={()=>setSelectedProductDetails({
              title: reel.title,
              channelName: advertiserName,
              advertiserId: reel.advertiser?.id,
              description: cleanDesc,
              meta: reelMeta,
            })}
            style={{background:'#e11d48',color:'#fff',padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:12.5,display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}}
          >
            <ShoppingBag size={14}/>
            <span><UiText value="Explore Product"/>{reelMeta.product_price ? ` · ${reelMeta.product_price}` : ''}</span>
          </button>
        ) : (
          <Link
            href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser?.id || '')}
            style={{background:'#503fbd',color:'#fff',padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:12.5,display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none'}}
          >
            <Briefcase size={14}/>
            <span><UiText value="Explore Brand"/></span>
          </Link>
        )}
      </div>

      {source&&(
        <div style={{
          position:'relative',
          borderRadius:14,
          overflow:'hidden',
          background:'transparent',
          width:'100%',
          aspectRatio:`${aspectRatio}`,
          maxHeight:560,
          margin:'0 auto',
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
        }}>
          <video
            ref={videoRef}
            src={source}
            loop
            playsInline
            muted={muted}
            onLoadedMetadata={e=>{
              const v=e.currentTarget;
              if(v.videoWidth&&v.videoHeight&&v.videoHeight>0){
                setAspectRatio(v.videoWidth/v.videoHeight);
              }
            }}
            onClick={()=>{
              const player=videoRef.current;
              if(!player)return;
              if(player.paused){
                setPaused(false);
                void player.play();
                setPlaying(true);
              }else{
                setPaused(true);
                player.pause();
                setPlaying(false);
              }
              revealControls();
            }}
            style={{width:'100%',height:'100%',objectFit:'contain',cursor:'pointer',display:'block'}}
          />
          {controlsVisible&&(
            <div
              style={{
                position:'absolute',
                inset:0,
                display:'flex',
                flexDirection:'column',
                justifyContent:'space-between',
                padding:12,
                background:'rgba(0,0,0,0.25)',
                pointerEvents:'none',
                transition:'opacity 0.2s ease',
              }}
            >
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,pointerEvents:'auto'}}>
                <button
                  type="button"
                  aria-label={muted?'Unmute sound':'Mute sound'}
                  onClick={e=>{
                    e.stopPropagation();
                    const player=videoRef.current;
                    if(player){
                      player.muted=!muted;
                    }
                    setMuted(!muted);
                    revealControls();
                  }}
                  style={{
                    width:34,
                    height:34,
                    borderRadius:17,
                    border:'none',
                    background:'rgba(0,0,0,0.6)',
                    color:'#fff',
                    display:'grid',
                    placeItems:'center',
                    cursor:'pointer',
                  }}
                >
                  {muted?<VolumeX size={16}/>:<Volume2 size={16}/>}
                </button>
              </div>
              <div style={{display:'flex',justifyContent:'center',pointerEvents:'auto'}}>
                <button
                  type="button"
                  aria-label={playing?'Pause':'Play'}
                  onClick={e=>{
                    e.stopPropagation();
                    const player=videoRef.current;
                    if(!player)return;
                    if(playing){
                      setPaused(true);
                      player.pause();
                      setPlaying(false);
                    }else{
                      setPaused(false);
                      void player.play();
                      setPlaying(true);
                    }
                    revealControls();
                  }}
                  style={{
                    width:48,
                    height:48,
                    borderRadius:24,
                    border:'1.5px solid rgba(255,255,255,0.4)',
                    background:'rgba(0,0,0,0.6)',
                    color:'#fff',
                    display:'grid',
                    placeItems:'center',
                    cursor:'pointer',
                  }}
                >
                  {playing?<UiText value="❚❚"/>:<Play size={20}/>}
                </button>
              </div>
              <div/>
            </div>
          )}
        </div>
      )}

      {/* Engagement bar + Watch Full Reel */}
      <div className={s.engagementBar}>
        <div className={s.engagementItem}>
          <Heart size={15} color="#503fbd"/>
          <span>{(reel.likes_count??0).toLocaleString()} <UiText value="likes"/></span>
        </div>
        <div className={s.engagementItem}>
          <MessageCircle size={15} color="var(--text-secondary)"/>
          <span>{(reel.comments_count??0).toLocaleString()} <UiText value="comments"/></span>
        </div>
        <Link
          href={`/v-ads?video=${encodeURIComponent(reel.id)}`}
          style={{marginLeft:'auto',display:'inline-flex',alignItems:'center',gap:4,color:'#503fbd',fontWeight:600,fontSize:13,textDecoration:'none'}}
        >
          <UiText value="Watch Full Reel"/> &rarr;
        </Link>
      </div>
      <StudioWebProductModal details={selectedProductDetails} onClose={()=>setSelectedProductDetails(null)}/>
    </article>
  );
}

function SellerVideoCard({
  video,
  data,
  refresh,
}:{
  video: SellerVideo;
  data: Workspace;
  refresh: ()=>void|Promise<void>;
}){
  const card=useRef<HTMLElement>(null);
  const videoRef=useRef<HTMLVideoElement>(null);
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(false);
  const [paused,setPaused]=useState(false);
  const [controlsVisible,setControlsVisible]=useState(true);
  const [aspectRatio,setAspectRatio]=useState<number>(9/16);
  const [selectedProductDetails, setSelectedProductDetails] = useState<{
    title: string;
    channelName: string;
    advertiserId?: string;
    description: string;
    meta: AdProductMeta;
  } | null>(null);
  const controlsTimer=useRef<NodeJS.Timeout|null>(null);

  const { description: cleanDesc, meta: videoMeta } = parseAdDescription(video.description);
  const isProduct = videoMeta.ad_type === 'PRODUCT';

  const isLive=studioVideoLive(video,data.accounts);
  const isPending=video.status==='PENDING';
  let source='';
  try{
    if(video.video_url)source=mediaUrl(video.video_url,'/api');
  }catch{}

  const revealControls=()=>{
    setControlsVisible(true);
    if(controlsTimer.current)clearTimeout(controlsTimer.current);
    controlsTimer.current=setTimeout(()=>{
      setControlsVisible(false);
    },1000);
  };

  useEffect(()=>{
    const player=videoRef.current;
    if(!player)return;
    webVideoCoordinator.register({
      id:'seller-'+video.id,
      element:player,
      visibleArea:0,
      play:()=>{
        if(!paused&&source){
          player.muted=muted;
          void player.play().then(()=>setPlaying(true)).catch(()=>{
            player.muted=true;
            setMuted(true);
            void player.play().then(()=>setPlaying(true)).catch(()=>{});
          });
        }
      },
      pause:()=>{
        player.pause();
        setPlaying(false);
      },
      isManuallyPaused:()=>paused,
    });
    return()=>{
      webVideoCoordinator.unregister('seller-'+video.id);
      if(controlsTimer.current)clearTimeout(controlsTimer.current);
    };
  },[video.id,paused,source,muted]);

  useEffect(()=>{
    const observer=new IntersectionObserver(
      entries=>{
        const entry=entries[0];
        if(!entry){
          webVideoCoordinator.updateVisibleArea('seller-'+video.id,0);
          return;
        }
        const rect=entry.intersectionRect;
        const area=entry.isIntersecting&&rect?rect.width*rect.height:0;
        webVideoCoordinator.updateVisibleArea('seller-'+video.id,area);
      },
      {threshold:[0,0.1,0.25,0.5,0.75,1]}
    );
    if(card.current)observer.observe(card.current);
    return()=>{
      observer.disconnect();
      webVideoCoordinator.updateVisibleArea('seller-'+video.id,0);
    };
  },[video.id]);

  return (
    <article
      ref={card}
      className={s.videoCard}
      onMouseEnter={revealControls}
      onTouchStart={revealControls}
      style={{
        overflow:'hidden',
        position:'relative',
        maxWidth:aspectRatio<1?400:'100%',
        width:'100%',
        margin:'0 auto',
        transition:'max-width 0.2s ease',
      }}
    >
      <div className={s.videoCardHeader}>
        <h3 className={s.videoTitle}>{video.title}</h3>
        <span className={isLive?s.badgeLive:isPending?s.badgePending:s.badgeRejected}>
          <UiText value={isLive?'Live on V Ads':isPending?'In admin review':video.status==='APPROVED'?'Approved - not public':'Needs changes'}/>
        </span>
      </div>
      {cleanDesc&&<p style={{margin:0,fontSize:13,color:'var(--text-secondary)',lineHeight:1.5}}>{cleanDesc}</p>}

      {/* Explore Product / Explore Brand Action Button */}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:2}}>
        {isProduct ? (
          <button
            type="button"
            onClick={()=>setSelectedProductDetails({
              title: video.title,
              channelName: video.account_name || 'Your Channel',
              advertiserId: video.advertiser_id,
              description: cleanDesc,
              meta: videoMeta,
            })}
            style={{background:'#e11d48',color:'#fff',padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:12.5,display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}}
          >
            <ShoppingBag size={14}/>
            <span><UiText value="Explore Product"/>{videoMeta.product_price ? ` · ${videoMeta.product_price}` : ''}</span>
          </button>
        ) : (
          <Link
            href={'/v-ads/advertisers/'+encodeURIComponent(video.advertiser_id || '')}
            style={{background:'#503fbd',color:'#fff',padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:12.5,display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none'}}
          >
            <Briefcase size={14}/>
            <span><UiText value="Explore Brand"/></span>
          </Link>
        )}
      </div>
      {Boolean(video.review_reason)&&<div style={{padding:'8px 12px',borderRadius:8,background:'#fff3cd',color:'#856404',fontSize:12}}><strong><UiText value={"Admin Note:"}/></strong> {video.review_reason}</div>}

      {source&&(
        <div style={{
          position:'relative',
          borderRadius:14,
          overflow:'hidden',
          background:'transparent',
          width:'100%',
          aspectRatio:`${aspectRatio}`,
          maxHeight:560,
          margin:'0 auto',
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
        }}>
          <video
            ref={videoRef}
            src={source}
            loop
            playsInline
            muted={muted}
            onLoadedMetadata={e=>{
              const v=e.currentTarget;
              if(v.videoWidth&&v.videoHeight&&v.videoHeight>0){
                setAspectRatio(v.videoWidth/v.videoHeight);
              }
            }}
            onClick={()=>{
              const player=videoRef.current;
              if(!player)return;
              if(player.paused){
                setPaused(false);
                void player.play();
                setPlaying(true);
              }else{
                setPaused(true);
                player.pause();
                setPlaying(false);
              }
              revealControls();
            }}
            style={{
              width:'100%',
              height:'100%',
              objectFit:'contain',
              cursor:'pointer',
              display:'block',
            }}
          />
          {controlsVisible&&(
            <div
              style={{
                position:'absolute',
                inset:0,
                display:'flex',
                flexDirection:'column',
                justifyContent:'space-between',
                padding:12,
                background:'rgba(0,0,0,0.25)',
                pointerEvents:'none',
                transition:'opacity 0.2s ease',
              }}
            >
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,pointerEvents:'auto'}}>
                <button
                  type="button"
                  aria-label={muted?'Unmute sound':'Mute sound'}
                  onClick={e=>{
                    e.stopPropagation();
                    const player=videoRef.current;
                    if(player){
                      player.muted=!muted;
                    }
                    setMuted(!muted);
                    revealControls();
                  }}
                  style={{
                    width:34,
                    height:34,
                    borderRadius:17,
                    border:'none',
                    background:'rgba(0,0,0,0.6)',
                    color:'#fff',
                    display:'grid',
                    placeItems:'center',
                    cursor:'pointer',
                  }}
                >
                  {muted?<VolumeX size={16}/>:<Volume2 size={16}/>}
                </button>
              </div>
              <div style={{display:'flex',justifyContent:'center',pointerEvents:'auto'}}>
                <button
                  type="button"
                  aria-label={playing?'Pause':'Play'}
                  onClick={e=>{
                    e.stopPropagation();
                    const player=videoRef.current;
                    if(!player)return;
                    if(playing){
                      setPaused(true);
                      player.pause();
                      setPlaying(false);
                    }else{
                      setPaused(false);
                      void player.play();
                      setPlaying(true);
                    }
                    revealControls();
                  }}
                  style={{
                    width:48,
                    height:48,
                    borderRadius:24,
                    border:'1.5px solid rgba(255,255,255,0.4)',
                    background:'rgba(0,0,0,0.6)',
                    color:'#fff',
                    display:'grid',
                    placeItems:'center',
                    cursor:'pointer',
                  }}
                >
                  {playing?<UiText value="❚❚"/>:<Play size={20}/>}
                </button>
              </div>
              <div/>
            </div>
          )}
        </div>
      )}

      {/* Engagement Metrics Row */}
      <div className={s.engagementBar}>
        <div className={s.engagementItem}>
          <Eye size={15} color="var(--text-secondary)"/>
          <span>{(video.views??0).toLocaleString()} <UiText value={"views"}/></span>
        </div>
        <div className={s.engagementItem}>
          <Heart size={15} color="#503fbd"/>
          <span>{(video.likes??0).toLocaleString()} <UiText value={"likes"}/></span>
        </div>
        <div className={s.engagementItem}>
          <MessageCircle size={15} color="var(--text-secondary)"/>
          <span>{(video.comments??0).toLocaleString()} <UiText value={"comments"}/></span>
        </div>
      </div>

      <VideoManagement video={video} onChanged={refresh}/>
      <StudioWebProductModal details={selectedProductDetails} onClose={()=>setSelectedProductDetails(null)}/>
    </article>
  );
}

function StudioWebProductModal({
  details,
  onClose,
}: {
  details: {
    title: string;
    channelName: string;
    advertiserId?: string;
    description: string;
    meta: AdProductMeta;
  } | null;
  onClose: () => void;
}) {
  if (!details) return null;
  const { title, channelName, advertiserId, description, meta } = details;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface, #171b25)',
          color: 'var(--text, #fff)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: 22,
          display: 'grid',
          gap: 14,
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <div style={{width: 32, height: 32, borderRadius: 16, background: 'rgba(225,29,72,0.15)', color: '#e11d48', display: 'grid', placeItems: 'center'}}>
              <ShoppingBag size={16}/>
            </div>
            <h3 style={{margin: 0, fontSize: 16}}><UiText value="Product Details"/></h3>
          </div>
          <button type="button" onClick={onClose} style={{background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer'}}>
            <X size={20}/>
          </button>
        </div>

        <div style={{display: 'grid', gap: 12}}>
          <div>
            <h2 style={{margin: '0 0 4px', fontSize: 18}}>{meta.product_name || title}</h2>
            {Boolean(advertiserId) && (
              <Link href={'/v-ads/advertisers/' + encodeURIComponent(advertiserId!)} style={{fontSize: 13, color: '#503fbd', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4}}>
                <span>{channelName}</span>
                <CheckCircle2 size={13} color="#16a34a"/>
                <span style={{color: 'var(--text-secondary)'}}>· <UiText value="View Brand Profile"/></span>
              </Link>
            )}
          </div>

          <div style={{padding: 12, borderRadius: 10, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.3)', display: 'grid', gap: 2}}>
            <small style={{fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.5px'}}>
              <UiText value="Price Details"/>
            </small>
            <div style={{fontSize: 20, fontWeight: 800, color: '#e11d48'}}>
              {meta.product_price || 'Available on enquiry / order'}
            </div>
          </div>

          <div style={{padding: 12, borderRadius: 10, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', display: 'grid', gap: 2}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              <Truck size={13}/>
              <span><UiText value="Delivery Options"/></span>
            </div>
            <div style={{fontSize: 13.5, fontWeight: 600}}>
              {meta.delivery_info || 'Direct delivery & local pickup available from seller'}
            </div>
          </div>

          <div style={{padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'grid', gap: 4}}>
            <small style={{fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)'}}>
              <UiText value="Where Product is Used in this Ad"/>
            </small>
            <div style={{fontSize: 13, lineHeight: 1.5}}>
              {description || title}
            </div>
          </div>

          {Boolean(meta.product_id) && (
            <Link
              href={'/commerce/' + encodeURIComponent(meta.product_id!)}
              style={{padding: '10px 16px', borderRadius: 10, background: '#e11d48', color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14}}
            >
              <UiText value="View Full Product Page & Order"/>
            </Link>
          )}

          {Boolean(advertiserId) && (
            <Link
              href={'/v-ads/advertisers/' + encodeURIComponent(advertiserId!)}
              style={{padding: '10px 16px', borderRadius: 10, background: 'var(--surface-soft, rgba(255,255,255,0.1))', border: '1px solid var(--border)', color: 'inherit', textAlign: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 13}}
            >
              <UiText value="Explore Brand Channel & Available Products"/>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
