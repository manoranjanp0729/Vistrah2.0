import {UiText,UiElement} from "../../components/localized-ui";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Text,View,Pressable,ScrollView,AppState,Dimensions,Modal} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {router,useLocalSearchParams} from 'expo-router';
import {useVideoPlayer, VideoView} from 'expo-video';
import {mobileVideoCoordinator} from '../../lib/video-coordinator';
import {SelectionFill,Page,Heading,Action,Field,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useTheme} from '../../lib/theme';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {api} from '../../lib/api';
import {vAds, toPlayableUrl} from '../../lib/v-ads';
import brandTheme from '../../../../shared/brand-theme.json';
import {pickAndUploadVideo} from '../../lib/v-ads-upload';
import {studioVideoLive,type Workspace,type Reel,type AdMetadata,type AdType,parseAdDescription,type AdProductMeta} from '../../../../shared/v-ads';
import {AdvertiserManagement,VideoManagement,DiscardUpload} from '../../components/v-ads-management';
import {VAdsCreator} from '../../components/v-ads-creator';

function InlineStudioPlayer({videoUrl,isActive,onActivate}:{videoUrl:string;isActive:boolean;onActivate:()=>void}){
  const url=useMemo(()=>toPlayableUrl(videoUrl),[videoUrl]);
  const player=useVideoPlayer(url||null,instance=>{
    instance.loop=true;
    instance.muted=false;
  });
  const containerRef=useRef<View>(null);
  const videoViewRef=useRef<VideoView>(null);
  const manualPause=useRef(false);
  const idRef=useRef('studio-'+Math.random().toString(36).slice(2));
  const [playing,setPlaying]=useState(false);
  const [muted,setMuted]=useState(false);
  const [controlsVisible,setControlsVisible]=useState(true);
  const [activity,setActivity]=useState(0);
  const [progress,setProgress]=useState(0);
  const [aspectRatio,setAspectRatio]=useState<number>(9/16);

  useEffect(()=>{
    const updateSize=(track:any)=>{
      if(track?.size?.width&&track?.size?.height&&track.size.height>0){
        const r=track.size.width/track.size.height;
        if(r>0&&isFinite(r))setAspectRatio(r);
      }
    };
    try{
      if((player as any).videoTrack)updateSize((player as any).videoTrack);
    }catch{}
    const sub=player.addListener('videoTrackChange' as any,(event:any)=>{
      if(event?.videoTrack)updateSize(event.videoTrack);
    });
    return()=>{try{sub.remove();}catch{}};
  },[player]);

  useEffect(()=>{
    if(!isActive){try{player.pause();}catch{}}
  },[isActive,player]);

  useEffect(()=>{
    const sub=player.addListener('playingChange',event=>{
      setPlaying(event.isPlaying);
      if(event.isPlaying&&!isActive)onActivate();
    });
    return()=>{try{sub.remove();}catch{}};
  },[player,isActive,onActivate]);

  useEffect(()=>{
    const sub=player.addListener('timeUpdate',event=>{
      if(player.duration>0){
        setProgress(Math.min(100,Math.max(0,(event.currentTime/player.duration)*100)));
      }
    });
    return()=>{try{sub.remove();}catch{}};
  },[player]);

  useEffect(()=>{
    if(!url)return;
    const id=idRef.current;
    mobileVideoCoordinator.register({
      id,
      visibleArea:0,
      play:()=>{
        if(!manualPause.current){
          try{player.play();}catch{}
        }
      },
      pause:()=>{
        try{player.pause();}catch{}
      },
      isManuallyPaused:()=>manualPause.current
    });
    return()=>{
      mobileVideoCoordinator.unregister(id);
    };
  },[url,player]);

  useEffect(()=>{
    if(!url)return;
    const id=idRef.current;
    const interval=setInterval(()=>{
      if(AppState.currentState!=='active'){
        mobileVideoCoordinator.updateVisibleArea(id,0);
        return;
      }
      containerRef.current?.measureInWindow((x,y,w,h)=>{
        const windowHeight=Dimensions.get('window').height;
        const windowWidth=Dimensions.get('window').width;
        const visibleYStart=Math.max(0,y);
        const visibleYEnd=Math.min(windowHeight,y+h);
        const visibleXStart=Math.max(0,x);
        const visibleXEnd=Math.min(windowWidth,x+w);
        const visibleHeight=Math.max(0,visibleYEnd-visibleYStart);
        const visibleWidth=Math.max(0,visibleXEnd-visibleXStart);
        const area=visibleHeight>0&&visibleWidth>0?visibleWidth*visibleHeight:0;
        mobileVideoCoordinator.updateVisibleArea(id,area);
      });
    },300);
    return()=>{
      clearInterval(interval);
      mobileVideoCoordinator.updateVisibleArea(id,0);
    };
  },[url]);

  useEffect(()=>{
    if(!controlsVisible||!playing)return;
    const timer=setTimeout(()=>setControlsVisible(false),1000);
    return()=>clearTimeout(timer);
  },[controlsVisible,playing,activity]);

  const reveal=()=>{
    setControlsVisible(true);
    setActivity(v=>v+1);
  };

  useEffect(()=>{return ()=>{try{player.pause();}catch{}};},[player]);

  if(!url){
    return <View style={{width:'100%',height:200,borderRadius:12,backgroundColor:'#160e22',alignItems:'center',justifyContent:'center',gap:6}}><Feather name="video-off" size={24} color="#888"/><Text style={{fontSize:12,color:'#888'}}><UiText value={"Video preview unavailable"}/></Text></View>;
  }

  return (
    <View
      ref={containerRef}
      style={{
        width:'100%',
        aspectRatio:aspectRatio,
        maxHeight:560,
        borderRadius:14,
        overflow:'hidden',
        backgroundColor:'transparent',
        alignSelf:'center',
      }}
    >
      <VideoView
        ref={videoViewRef}
        player={player}
        style={{width:'100%',height:'100%'}}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{enable:true}}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing?"Pause video":"Play video"}
        onPress={()=>{
          if(controlsVisible){
            manualPause.current=playing;
            if(playing)try{player.pause();}catch{}
            else try{player.play();}catch{}
          }
          reveal();
        }}
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}
      />
      {controlsVisible&&(
        <View pointerEvents="box-none" style={{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'space-between',padding:10,backgroundColor:'rgba(0,0,0,0.28)'}}>
          <View style={{flexDirection:'row',justifyContent:'flex-end',gap:8}} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={muted?"Unmute sound":"Mute sound"}
              onPress={()=>{
                try{player.muted=!muted;}catch{}
                setMuted(!muted);
                reveal();
              }}
              style={({pressed})=>({width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.55)',alignItems:'center',justifyContent:'center',opacity:pressed?0.75:1})}
            >
              <Feather name={muted?"volume-x":"volume-2"} size={16} color="#FFFFFF"/>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fullscreen"
              onPress={()=>{
                void videoViewRef.current?.enterFullscreen().catch(()=>{});
                reveal();
              }}
              style={({pressed})=>({width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.55)',alignItems:'center',justifyContent:'center',opacity:pressed?0.75:1})}
            >
              <Feather name="maximize" size={16} color="#FFFFFF"/>
            </Pressable>
          </View>
          <View style={{alignItems:'center',justifyContent:'center'}} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing?"Pause":"Play"}
              onPress={()=>{
                manualPause.current=playing;
                if(playing)try{player.pause();}catch{}
                else try{player.play();}catch{}
                reveal();
              }}
              style={({pressed})=>({width:52,height:52,borderRadius:26,backgroundColor:'rgba(0,0,0,0.60)',borderWidth:1.5,borderColor:'rgba(255,255,255,0.3)',alignItems:'center',justifyContent:'center',opacity:pressed?0.75:1})}
            >
              <Feather name={playing?"pause":"play"} size={24} color="#FFFFFF"/>
            </Pressable>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:4}} pointerEvents="box-none">
            <View style={{flex:1,height:4,backgroundColor:'rgba(255,255,255,0.25)',borderRadius:2,overflow:'hidden'}}>
              <View style={{height:'100%',width:`${progress}%`,backgroundColor:'#a855f7',borderRadius:2}}/>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function StudioProductDetailsModal({
  visible,
  onClose,
  title,
  channelName,
  advertiserId,
  description,
  meta,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  channelName: string;
  advertiserId?: string;
  description: string;
  meta: AdProductMeta;
}) {
  const {colors, mode} = useTheme();
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable style={{flex: 1}} onPress={onClose} />
        <View
          style={{
            backgroundColor: mode === 'light' ? '#FFFFFF' : '#1c1728',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 18,
            maxHeight: '75%',
            gap: 14,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.4)', alignSelf: 'center', marginBottom: 4}} />
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
              <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: mode === 'light' ? '#fdf2f4' : '#2a1520', alignItems: 'center', justifyContent: 'center'}}>
                <Feather name="shopping-bag" size={16} color="#e11d48"/>
              </View>
              <Text numberOfLines={1} style={{fontSize: 16, fontWeight: '700', color: colors.text, flex: 1}}>
                <UiText value="Product Details" />
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" color={colors.text} size={22} />
            </Pressable>
          </View>

          <ScrollView style={{flexShrink: 1}} contentContainerStyle={{gap: 14, paddingBottom: 24}}>
            <View style={{gap: 4}}>
              <Text style={{fontSize: 18, fontWeight: '800', color: colors.text}}>
                {meta.product_name || title}
              </Text>
              {Boolean(advertiserId) && (
                <Pressable
                  style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                  onPress={() => {
                    onClose();
                    router.push({pathname: '/advertiser-profile', params: {id: advertiserId!}});
                  }}
                >
                  <Text style={{fontSize: 13, color: colors.accent, fontWeight: '600'}}>
                    {channelName}
                  </Text>
                  <Feather name="check-circle" size={13} color="#16a34a" />
                  <Text style={{fontSize: 12, color: colors.muted}}>
                    <UiText value="· View Brand Profile" />
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Price Details */}
            <View style={{padding: 12, borderRadius: 14, backgroundColor: mode === 'light' ? '#fdf2f4' : '#2a121c', borderWidth: 1, borderColor: '#fca5a5', gap: 4}}>
              <Text style={{fontSize: 11, fontWeight: '700', color: '#e11d48', textTransform: 'uppercase', letterSpacing: 0.5}}>
                <UiText value="Price Details" />
              </Text>
              <Text style={{fontSize: 20, fontWeight: '800', color: mode === 'light' ? '#9f1239' : '#fecdd3'}}>
                {meta.product_price || 'Available on request / order'}
              </Text>
            </View>

            {/* Delivery Options */}
            <View style={{padding: 12, borderRadius: 14, backgroundColor: mode === 'light' ? '#f0fdf4' : '#142a1b', borderWidth: 1, borderColor: '#86efac', gap: 4}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Feather name="truck" size={14} color="#16a34a"/>
                <Text style={{fontSize: 11, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5}}>
                  <UiText value="Delivery Options" />
                </Text>
              </View>
              <Text style={{fontSize: 13.5, fontWeight: '600', color: mode === 'light' ? '#14532d' : '#bbf7d0'}}>
                {meta.delivery_info || 'Direct delivery & local pickup available from seller'}
              </Text>
            </View>

            {/* Where Product is Used / Video Context */}
            <View style={{padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 6}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Feather name="play-circle" size={14} color={colors.accent}/>
                <Text style={{fontSize: 11.5, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5}}>
                  <UiText value="Where Product is Used in this Ad" />
                </Text>
              </View>
              <Text style={{fontSize: 13, lineHeight: 19, color: colors.text}}>
                {description || title}
              </Text>
            </View>

            {/* Links */}
            {Boolean(meta.product_id) && (
              <UiElement as={Action}
                label="View Full Product Page & Order"
                onPress={() => {
                  onClose();
                  router.push({pathname: '/commerce/[id]', params: {id: meta.product_id!}});
                }}
              />
            )}

            {Boolean(advertiserId) && (
              <UiElement as={Action}
                secondary
                label="Explore Brand Channel & Available Products"
                onPress={() => {
                  onClose();
                  router.push({pathname: '/advertiser-profile', params: {id: advertiserId!}});
                }}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SellerVAds(){
  return <Page><WorkspaceScreen/></Page>;
}

function WorkspaceScreen(){
  const {styles,colors,mode}=useTheme();const {user}=useSession();
  const surface=mode==='light'?brandTheme.headerLight:brandTheme.headerDark;
  const brandGradient=[brandTheme.gradient[0],brandTheme.gradient[1],brandTheme.gradient[2]] as const;
  const resource=useResource<Workspace>('/v-ads/me',user?.id??null);
  const params=useLocalSearchParams<{from?:string;tab?:string}>();
  const initialTab=params.from==='v-ads'||params.tab==='public'||!user?'public':'ads';
  const [studioTab,setStudioTab]=useState<'ads'|'create'|'upload'|'public'>(initialTab);
  useEffect(()=>{
    if(params.from==='v-ads'||params.tab==='public'||!user)setStudioTab('public');
  },[params.from,params.tab,user]);
  const [title,setTitle]=useState(''),[videoDescription,setVideoDescription]=useState(''),[uploadId,setUploadId]=useState('');
  const [adType,setAdType]=useState<AdType>('PRODUCT');
  const [productName,setProductName]=useState('');
  const [productPrice,setProductPrice]=useState('');
  const [deliveryInfo,setDeliveryInfo]=useState('');
  const [productId,setProductId]=useState('');
  const [productsAvailable,setProductsAvailable]=useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState<{
    title: string;
    channelName: string;
    advertiserId?: string;
    description: string;
    meta: AdProductMeta;
  } | null>(null);
  const [accountId,setAccountId]=useState(''),[page,setPage]=useState(1);
  const [filter,setFilter]=useState<'ALL'|'APPROVED'|'PENDING'|'REJECTED'>('ALL');
  const [activeVideoId,setActiveVideoId]=useState<string|null>(null);
  const [showProfileManage,setShowProfileManage]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [history,setHistory]=useState<Workspace['videos']>([]);
  const [historyMore,setHistoryMore]=useState<boolean|null>(null);
  const working=useRef(false),provisioned=useRef(false);
  const data=resource.data;

  useEffect(()=>{
    if(user&&data&&(!data.accounts.length)&&!provisioned.current){
      provisioned.current=true;
      void api('/auth/seller/enable',{method:'POST'}).then(()=>resource.retry()).catch(()=>{});
    }
  },[user,data,resource]);

  const account=data?.accounts.find(item=>item.id===accountId)??data?.accounts[0];
  async function perform(action:()=>Promise<void>){
    if(working.current)return;
    working.current=true;setBusy(true);setError('');setMessage('');
    try{await action();}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}}

  if(user&&resource.loading)return <Loading/>;
  if(user&&resource.error)return <ErrorPanel error={resource.error} retry={resource.retry}/>;

  const rawVideos=data?[...data.videos,...history.filter(item=>!data.videos.some(v=>v.id===item.id))].filter(v=>v.status!=='REMOVED'):[];
  const accountVideos=data&&data.accounts.length>1&&accountId?rawVideos.filter(v=>v.advertiser_id===accountId):rawVideos;
  const allVideos=accountVideos.filter(v=>filter==='ALL'||v.status===filter);

  const totalViews=accountVideos.reduce((acc,v)=>acc+(v.views||0),0);
  const totalLikes=accountVideos.reduce((acc,v)=>acc+(v.likes||0),0);
  const totalComments=accountVideos.reduce((acc,v)=>acc+(v.comments||0),0);
  const liveCount=data?accountVideos.filter(v=>studioVideoLive(v,data.accounts)).length:0;
  const pendingCount=accountVideos.filter(v=>v.status==='PENDING').length;
  const rejectedCount=accountVideos.filter(v=>v.status==='REJECTED').length;

  return <>
    {/* Exact V Ads Studio Top Banner */}
    <View style={{borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#503fbd', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.16, shadowRadius: 8, elevation: 3}}>
      <LinearGradient
        colors={['#2D1F50', '#48257C', '#642E9E']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.20)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="video" size={22} color="#FFFFFF" />
        </View>
        <View style={{flex: 1, gap: 2}}>
          <Text style={{fontSize: 9, letterSpacing: 1.2, fontWeight: '700', color: '#f0e6ff', textTransform: 'uppercase'}}>
            <UiText value="CREATOR STUDIO"/>
          </Text>
          <Text style={{fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2}}>
            <UiText value="V Ads Studio"/>
          </Text>
          <Text numberOfLines={1} style={{fontSize: 12, color: '#eadaff', fontWeight: '500'}}>
            <UiText value="Create, promote & track your video ads"/>
          </Text>
        </View>
      </LinearGradient>
    </View>

    {user ? (
      <>
        <Text accessibilityRole="text" style={styles.muted}><UiText value={"Signed in as seller: "}/>{user.email}</Text>
        {/* Clean Channel Identity Card */}
        <View style={[styles.card, {borderRadius: 20, padding: 16, gap: 14}]}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0}}>
              <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border}}>
                <Feather name="video" size={22} color={colors.accent}/>
              </View>
              <View style={{flex: 1, minWidth: 0, gap: 2}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Text numberOfLines={1} style={[styles.heading, {fontSize: 18, lineHeight: 23}]}>{account?.name || user.name || 'Your V Ads Channel'}</Text>
                  {account?.status === 'APPROVED' && <Feather name="check-circle" size={15} color="#16a34a"/>}
                </View>
                <Text numberOfLines={1} style={[styles.muted, {fontSize: 12}]}>@{account?.handle || 'seller'} <UiText value={"· Free V Ads Creator Channel"}/></Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: mode === 'light' ? '#e6f4ea' : '#122b1b', borderWidth: 1, borderColor: mode === 'light' ? '#bbf7d0' : '#1e3a24'}}>
              <Feather name="check-circle" size={12} color="#16a34a"/>
              <Text style={{fontSize: 11, fontWeight: '700', color: '#16a34a'}}><UiText value={"Verified"}/></Text>
            </View>
          </View>
          <View style={{flexDirection: 'row', gap: 10, paddingTop: 2}}>
            <UiElement as={Pressable} accessibilityRole="button" accessibilityLabel="Watch V Ads tab" onPress={()=>router.push('/(tabs)/v-ads')} style={({pressed})=>({flex: 1, minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.75 : 1})}>
              <Feather name="play" size={13} color={colors.accent}/>
              <Text style={{fontSize: 13, fontWeight: '700', color: colors.accent}}><UiText value={"Watch Reels"}/></Text>
              <Feather name="arrow-right" size={13} color={colors.accent}/>
            </UiElement>
            <UiElement as={Pressable} accessibilityRole="button" accessibilityLabel="Refresh studio" disabled={busy} onPress={()=>{setHistory([]);setPage(1);setHistoryMore(null);resource.retry();}} style={({pressed})=>({minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.75 : 1})}>
              <Feather name="refresh-cw" size={13} color={colors.text}/>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.text}}><UiText value={"Refresh"}/></Text>
            </UiElement>
          </View>
        </View>
      </>
    ) : (
      <View style={[styles.card, {borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
          <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center'}}>
            <Feather name="globe" size={20} color={colors.accent}/>
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={{fontSize: 14, fontWeight: '700', color: colors.text}}><UiText value="Public V Ads Studio"/></Text>
            <Text style={[styles.muted, {fontSize: 12}]}><UiText value="Browse community ads. Sign in for creator & upload tools."/></Text>
          </View>
        </View>
        <UiElement
          as={Pressable}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.push('/auth')}
          style={({pressed}) => ({
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{fontSize: 12, fontWeight: '700', color: colors.ink}}><UiText value="Sign in"/></Text>
        </UiElement>
      </View>
    )}


    {Boolean(error)&&<ErrorPanel error={new Error(error)}/>}
    {Boolean(message)&&<View style={[styles.card,{backgroundColor:mode==='light'?'#f4ecf9':'#26173a',borderColor:colors.accent}]}><Text style={{color:colors.text,fontWeight:'500'}}><UiText value={message}/></Text></View>}

    {/* Clean Segmented Control Tabs */}
    <View style={{flexDirection: 'row', backgroundColor: mode === 'light' ? '#eceef3' : '#1e1c26', padding: 4, borderRadius: 14, gap: 4}}>
      <UiElement as={Pressable} accessibilityRole="tab" accessibilityLabel={`My V Ads tab (${accountVideos.length})`} accessibilityState={{selected: studioTab === 'ads'}} onPress={()=>setStudioTab('ads')} style={({pressed})=>({flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: studioTab === 'ads' ? colors.surface : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: studioTab === 'ads' ? 0.08 : 0, shadowRadius: 2, elevation: studioTab === 'ads' ? 2 : 0, opacity: pressed ? 0.75 : 1})}>
        <Feather name="video" size={14} color={studioTab === 'ads' ? colors.accent : colors.muted}/>
        <Text style={{fontSize: 13, fontWeight: studioTab === 'ads' ? '700' : '500', color: studioTab === 'ads' ? colors.text : colors.muted}}><UiText value={"My V Ads"}/></Text>
        <View style={{paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: studioTab === 'ads' ? (mode === 'light' ? '#e9ecef' : '#2e2b38') : (mode === 'light' ? '#dfdbe7' : '#292534')}}>
          <Text style={{fontSize: 11, fontWeight: '700', color: studioTab === 'ads' ? colors.text : colors.muted}}>{accountVideos.length}</Text>
        </View>
      </UiElement>
      <UiElement as={Pressable} accessibilityRole="tab" accessibilityLabel="Upload V Ad tab" accessibilityState={{selected: studioTab === 'upload'}} onPress={()=>setStudioTab('upload')} style={({pressed})=>({flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: studioTab === 'upload' ? colors.surface : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: studioTab === 'upload' ? 0.08 : 0, shadowRadius: 2, elevation: studioTab === 'upload' ? 2 : 0, opacity: pressed ? 0.75 : 1})}>
        <Feather name="plus-circle" size={14} color={studioTab === 'upload' ? colors.accent : colors.muted}/>
        <Text style={{fontSize: 13, fontWeight: studioTab === 'upload' ? '700' : '500', color: studioTab === 'upload' ? colors.text : colors.muted}}><UiText value={"+ Upload"}/></Text>
      </UiElement>
      <UiElement as={Pressable} accessibilityRole="tab" accessibilityLabel="Public V Ads tab" accessibilityState={{selected: studioTab === 'public'}} onPress={()=>setStudioTab('public')} style={({pressed})=>({flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: studioTab === 'public' ? colors.surface : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: studioTab === 'public' ? 0.08 : 0, shadowRadius: 2, elevation: studioTab === 'public' ? 2 : 0, opacity: pressed ? 0.75 : 1})}>
        <Feather name="globe" size={14} color={studioTab === 'public' ? colors.accent : colors.muted}/>
        <Text style={{fontSize: 13, fontWeight: studioTab === 'public' ? '700' : '500', color: studioTab === 'public' ? colors.text : colors.muted}}><UiText value={"Public V Ads"}/></Text>
      </UiElement>
    </View>

    {/* TAB 1: V ADS FEED */}
    {studioTab==='ads'&&(!user ? (
      <RestrictedStudioTool
        title="Sign In to Manage Your V Ads"
        description="Track views, likes, comments, and manage all your published video ads."
        icon="video"
      />
    ) : !data ? (
      <Loading/>
    ) : (
      <View style={{gap:10}}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingVertical: 2}}>
        <Pressable accessibilityRole="button" onPress={()=>setFilter('ALL')} style={({pressed})=>({paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === 'ALL' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.surface, borderWidth: 1, borderColor: filter === 'ALL' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.border, opacity: pressed ? 0.75 : 1})}>
          <Text style={{fontSize: 12, fontWeight: '600', color: filter === 'ALL' ? (mode === 'light' ? '#fff' : '#1e1c26') : colors.text}}><UiText value={"All ("}/>{accountVideos.length})</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>setFilter('APPROVED')} style={({pressed})=>({paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === 'APPROVED' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.surface, borderWidth: 1, borderColor: filter === 'APPROVED' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.border, opacity: pressed ? 0.75 : 1})}>
          <Text style={{fontSize: 12, fontWeight: '600', color: filter === 'APPROVED' ? (mode === 'light' ? '#fff' : '#1e1c26') : colors.text}}><UiText value={"● Approved ("}/>{accountVideos.filter(v=>v.status==='APPROVED').length})</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>setFilter('PENDING')} style={({pressed})=>({paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === 'PENDING' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.surface, borderWidth: 1, borderColor: filter === 'PENDING' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.border, opacity: pressed ? 0.75 : 1})}>
          <Text style={{fontSize: 12, fontWeight: '600', color: filter === 'PENDING' ? (mode === 'light' ? '#fff' : '#1e1c26') : colors.text}}><UiText value={"⏳ Review ("}/>{pendingCount})</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>setFilter('REJECTED')} style={({pressed})=>({paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === 'REJECTED' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.surface, borderWidth: 1, borderColor: filter === 'REJECTED' ? (mode === 'light' ? '#20344f' : '#f4edff') : colors.border, opacity: pressed ? 0.75 : 1})}>
          <Text style={{fontSize: 12, fontWeight: '600', color: filter === 'REJECTED' ? (mode === 'light' ? '#fff' : '#1e1c26') : colors.text}}><UiText value={"⚠️ Changes ("}/>{rejectedCount})</Text>
        </Pressable>
      </ScrollView>

      {allVideos.map(video=>{
        const isLive=studioVideoLive(video,data.accounts);
        const isPending=video.status==='PENDING';
        const statusBg=isLive?(mode==='light'?'#e6f4ea':'#132b1b'):isPending?(mode==='light'?'#fef7e0':'#2b2210'):(mode==='light'?'#fce8e6':'#2e1515');
        const statusColor=isLive?'#16a34a':isPending?'#ca8a04':'#dc2626';
        const statusText=isLive?'Live on V Ads':isPending?'In admin review':video.status==='APPROVED'?'Approved - not public':'Needs changes';
        const canManage=Boolean(video.is_owner);
        const badgeLabel=(video.account_name||video.account_handle||'VISTRAH SPOTLIGHT').toUpperCase();
        return <LinearGradient
          colors={[surface[0],surface[1],surface[2]]}
          start={{x:0,y:0}}
          end={{x:1,y:1}}
          style={{gap:12,padding:16,borderRadius:24,borderWidth:1,borderColor:colors.border,maxWidth:440,width:'100%',alignSelf:'center'}}
          key={video.id}
        >
          {/* Eyebrow badge + Status tag */}
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <LinearGradient
              colors={brandGradient}
              start={{x:0,y:0}}
              end={{x:1,y:1}}
              style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingVertical:6,paddingHorizontal:10,borderRadius:20,maxWidth:'70%'}}
            >
              <Feather name="play" size={11} color="#fff"/>
              <Text numberOfLines={1} style={{fontSize:10,fontWeight:'700',letterSpacing:1,color:'#fff'}}>{badgeLabel}</Text>
            </LinearGradient>
            <View style={{paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:statusBg,borderWidth:1,borderColor:statusColor+'30'}}>
              <Text style={{fontSize:11,fontWeight:'700',color:statusColor}}><UiText value={statusText}/></Text>
            </View>
          </View>

          {/* Heading & description */}
          {(() => {
            const { description: cleanDesc, meta: videoMeta } = parseAdDescription(video.description);
            const isProduct = videoMeta.ad_type === 'PRODUCT';
            return (
              <>
                <View style={{gap:6}}>
                  <Text accessibilityRole="header" style={[styles.heading,{fontSize:20,lineHeight:26}]}>{video.title}</Text>
                  {Boolean(cleanDesc)&&<Text style={[styles.muted,{lineHeight:20,fontSize:13.5}]}>{cleanDesc}</Text>}
                </View>

                {/* Explore Product / Explore Brand Action Button */}
                <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {isProduct ? (
                    <UiElement as={Pressable}
                      onPress={()=>setSelectedProductDetails({
                        title: video.title,
                        channelName: video.account_name || account?.name || 'Vistrah Seller',
                        advertiserId: video.advertiser_id || account?.id,
                        description: cleanDesc,
                        meta: videoMeta,
                      })}
                      style={({pressed})=>({
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 14,
                        backgroundColor: '#e11d48',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        opacity: pressed ? 0.85 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Explore Product"
                    >
                      <Feather name="shopping-bag" size={13} color="#FFFFFF"/>
                      <Text style={{color: '#FFFFFF', fontSize: 12.5, fontWeight: '700'}}>
                        <UiText value="Explore Product"/>
                        {videoMeta.product_price ? ` · ${videoMeta.product_price}` : ''}
                      </Text>
                      <Feather name="chevron-right" size={13} color="#FFFFFF"/>
                    </UiElement>
                  ) : (
                    <UiElement as={Pressable}
                      onPress={()=>router.push({pathname:'/advertiser-profile',params:{id:video.advertiser_id || account?.id}})}
                      style={({pressed})=>({
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 14,
                        backgroundColor: '#503fbd',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        opacity: pressed ? 0.85 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Explore Brand"
                    >
                      <Feather name="briefcase" size={13} color="#FFFFFF"/>
                      <Text style={{color: '#FFFFFF', fontSize: 12.5, fontWeight: '700'}}>
                        <UiText value="Explore Brand"/>
                      </Text>
                      <Feather name="arrow-right" size={12} color="#FFFFFF"/>
                    </UiElement>
                  )}
                </View>
              </>
            );
          })()}

          {/* Inset Video Player / Thumbnail Preview */}
          {Boolean(video.video_url)&&<View style={{borderRadius:18,overflow:'hidden',backgroundColor:'transparent',width:'100%',alignItems:'center'}}>
            <InlineStudioPlayer
              videoUrl={video.video_url!}
              isActive={activeVideoId===video.id}
              onActivate={()=>setActiveVideoId(video.id)}
            />
          </View>}

          {Boolean(video.review_reason)&&<View style={{padding:12,borderRadius:14,backgroundColor:mode==='light'?'#fff3cd':'#2c2411',gap:3,borderWidth:1,borderColor:'#ffeeba'}}>
            <Text style={{fontSize:11,fontWeight:'700',color:'#856404'}}><UiText value={"Admin Feedback:"}/></Text>
            <Text style={{fontSize:12.5,color:colors.text}}>{video.review_reason}</Text>
          </View>}

          {/* Bottom Action & Metrics */}
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:10,borderTopWidth:1,borderColor:colors.border}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                <Feather name="eye" size={13} color={colors.muted}/>
                <Text style={{fontSize:11,fontWeight:'600',color:colors.text}}>{(video.views??0).toLocaleString()}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                <Feather name="heart" size={13} color={colors.accent}/>
                <Text style={{fontSize:11,fontWeight:'600',color:colors.text}}>{(video.likes??0).toLocaleString()}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                <Feather name="message-circle" size={13} color={colors.muted}/>
                <Text style={{fontSize:11,fontWeight:'600',color:colors.text}}>{(video.comments??0).toLocaleString()}</Text>
              </View>
            </View>
            {isLive&&<UiElement as={Pressable}
              accessibilityRole="link"
              accessibilityLabel={`Watch ${video.title} full screen in V Ads`}
              onPress={()=>router.push({pathname:'/(tabs)/v-ads',params:{video:video.id}})}
              style={({pressed})=>({minHeight:36,flexDirection:'row',alignItems:'center',gap:6,opacity:pressed?.7:1})}
            >
              <Text style={{color:colors.accent,fontSize:13.5,fontWeight:'600'}}><UiText value={"Watch Full Reel"}/></Text>
              <Feather name="arrow-right" size={15} color={colors.accent}/>
            </UiElement>}
          </View>

          {canManage&&<VideoManagement video={video} onChanged={()=>{setHistory([]);setPage(1);setHistoryMore(null);resource.retry();}}/>}
        </LinearGradient>;
      })}

      {!allVideos.length&&<View style={[styles.card,{alignItems:'center',padding:28,gap:10}]}>
        <Feather name="video" size={36} color={colors.muted}/>
        <Text style={[styles.heading,{fontSize:16}]}><UiText value={"No V Ads in this filter"}/></Text>
        <Text style={[styles.muted,{textAlign:'center',fontSize:12}]}><UiText value={"Upload a V Ad, add its details and submit it for administrator review."}/></Text>
        <View style={{flexDirection: 'row', gap: 10}}>
          <UiElement as={Action} label="+ Create Video" onPress={()=>setStudioTab('create')}/>
          <UiElement as={Action} secondary label="+ Upload MP4" onPress={()=>setStudioTab('upload')}/>
        </View>
      </View>}

      {(historyMore??data.has_more)&&<UiElement as={Action} label="Load more V Ads" secondary disabled={busy} onPress={()=>void perform(async()=>{const next=await vAds.workspace(page+1);setHistory(previous=>[...previous,...next.videos.filter(item=>!previous.some(old=>old.id===item.id))]);setPage(next.page);setHistoryMore(next.has_more);})}/>}

      {/* Channel Profile Management Settings */}
      <Pressable
        accessibilityRole="button"
        onPress={()=>setShowProfileManage(v=>!v)}
        style={({pressed})=>({flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14,borderRadius:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,marginTop:6,opacity:pressed?.75:1})}
      >
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Feather name="settings" size={15} color={colors.accent}/>
          <Text style={{fontSize:13,fontWeight:'600',color:colors.text}}><UiText value={"Channel Profile Settings"}/></Text>
        </View>
        <Feather name={showProfileManage?'chevron-up':'chevron-down'} size={16} color={colors.muted}/>
      </Pressable>

      {showProfileManage&&<View style={[styles.card,{gap:12,marginTop:2}]}>
        {data.accounts.length>1&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
          {data.accounts.map(item=>(
            <Pressable key={item.id} onPress={()=>{setAccountId(item.id);setUploadId('');}} style={{paddingHorizontal:10,paddingVertical:5,borderRadius:12,backgroundColor:account?.id===item.id?colors.accent:colors.surface,borderWidth:1,borderColor:account?.id===item.id?colors.accent:colors.border}}>
              <Text style={{fontSize:11,fontWeight:'600',color:account?.id===item.id?colors.ink:colors.text}}>{item.name}</Text>
            </Pressable>
          ))}
        </View>}
        {account&&<AdvertiserManagement key={account.review_token??account.id} account={account} onChanged={resource.retry}/>}
      </View>}
    </View>))}

    {/* TAB: CREATE MARKETING VIDEO AD */}
    {studioTab==='create'&&(!user ? (
      <RestrictedStudioTool
        title="Sign In to Create V Ads"
        description="Use the AI and marketing creator tools to build engaging video ads for your services."
        icon="zap"
      />
    ) : (
      <VAdsCreator
        account={account}
        onSubmitted={()=>{
          setHistory([]);
          setPage(1);
          setHistoryMore(null);
          resource.retry();
          setStudioTab('ads');
        }}
      />
    ))}

    {/* TAB 2: UPLOAD V AD */}
    {studioTab==='upload'&&(!user ? (
      <RestrictedStudioTool
        title="Sign In to Upload V Ads"
        description="Upload up to 60-second MP4 videos to promote your business across Vistrah."
        icon="upload-cloud"
      />
    ) : !data ? (
      <Loading/>
    ) : (
      <View style={{gap:12}}>
        {account?.status!=='APPROVED'?<View style={styles.card}><Text style={styles.muted}><UiText value={"An approved advertiser profile is required to upload V Ads."}/></Text></View>:!data.uploads_available?<View style={styles.card}><UiElement as={Heading} title="+ Upload New V Ad"/><Text style={styles.muted}><UiText value={"Video uploads are currently offline in this environment. MP4 videos (H.264/AAC, up to 60s and 100 MB) are free for all sellers."}/></Text></View>:<View style={[styles.card, {borderRadius: 20, padding: 18, gap: 14, borderWidth: 1.5, borderColor: uploadId ? colors.accent : colors.border}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <View style={{width: 38, height: 38, borderRadius: 19, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center'}}>
            <Feather name="video" size={18} color={colors.accent}/>
          </View>
          <View style={{flex: 1}}>
            <Text accessibilityRole="header" style={[styles.heading, {fontSize: 18, lineHeight: 23}]}><UiText value={"Upload New V Ad (Free)"}/></Text>
            <Text style={[styles.muted, {fontSize: 12}]}><UiText value={"MP4 (H.264/AAC) · Up to 60s · Max 100 MB"}/></Text>
          </View>
        </View>

        <UiElement as={Action} label={busy ? 'Please wait…' : uploadId ? '✓ Video selected — choose another' : '1. Select & upload MP4 video'} disabled={busy} onPress={()=>void perform(async()=>{const result=await pickAndUploadVideo(account.id);if(result){setUploadId(result.id);setMessage('Video uploaded privately. Add a title and caption, then submit for review.');}})}/>

        {data.uploads.filter(item=>item.advertiser_id===account.id&&!item.video_id).map(item=><View key={item.id} style={{flexDirection:'row',gap:8,alignItems:'center'}}><UiElement as={Action} secondary label={uploadId===item.id?'✓ Upload selected':'Use upload '+item.id.slice(0,8)} disabled={busy} onPress={()=>setUploadId(item.id)}/><DiscardUpload id={item.id} onChanged={()=>{if(uploadId===item.id)setUploadId('');resource.retry();}}/></View>)}

        {Boolean(uploadId)&&<View style={{padding:12,borderRadius:12,backgroundColor:mode==='light'?'#e6f4ea':'#122b1b',flexDirection:'row',alignItems:'center',gap:8}}><Feather name="check-circle" size={16} color="#16a34a"/><Text style={{color:mode==='light'?'#137333':'#86efac',fontSize:12.5,fontWeight:'600'}}><UiText value={"Video validated and ready to submit for review."}/></Text></View>}

        {/* Ad Type Selector: Product Ad vs Brand Ad */}
        <View style={{gap: 8}}>
          <Text style={{fontSize: 13, fontWeight: '700', color: colors.text}}>
            <UiText value="2. Select Ad Type" />
          </Text>
          <View style={{flexDirection: 'row', gap: 10}}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Product Ad"
              onPress={() => setAdType('PRODUCT')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 14,
                backgroundColor: adType === 'PRODUCT' ? (mode === 'light' ? '#fdf2f4' : '#2a1520') : colors.surface,
                borderWidth: 1.5,
                borderColor: adType === 'PRODUCT' ? '#e11d48' : colors.border,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Feather name="shopping-bag" size={20} color={adType === 'PRODUCT' ? '#e11d48' : colors.muted} />
              <Text style={{fontSize: 13, fontWeight: '700', color: adType === 'PRODUCT' ? '#e11d48' : colors.text}}>
                <UiText value="Product Ad" />
              </Text>
              <Text style={{fontSize: 10.5, color: colors.muted, textAlign: 'center'}}>
                <UiText value="Promote a product with price & delivery options" />
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Brand Ad"
              onPress={() => setAdType('BRAND')}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 14,
                backgroundColor: adType === 'BRAND' ? (mode === 'light' ? '#f3eefc' : '#221935') : colors.surface,
                borderWidth: 1.5,
                borderColor: adType === 'BRAND' ? colors.accent : colors.border,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Feather name="briefcase" size={20} color={adType === 'BRAND' ? colors.accent : colors.muted} />
              <Text style={{fontSize: 13, fontWeight: '700', color: adType === 'BRAND' ? colors.accent : colors.text}}>
                <UiText value="Brand Ad" />
              </Text>
              <Text style={{fontSize: 10.5, color: colors.muted, textAlign: 'center'}}>
                <UiText value="Promote your brand & showcase available products" />
              </Text>
            </Pressable>
          </View>
        </View>

        {adType === 'PRODUCT' ? (
          <View style={{gap: 10, padding: 12, borderRadius: 14, backgroundColor: mode === 'light' ? '#faf7fc' : '#1d172b', borderWidth: 1, borderColor: colors.border}}>
            <Text style={{fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 0.5, textTransform: 'uppercase'}}>
              <UiText value="Product Details & Purchasing Options" />
            </Text>
            <UiElement as={Field} label="Product Name" placeholder="E.g., Pure Kanchipuram Silk Saree" value={productName} onChangeText={setProductName} maxLength={100} />
            <UiElement as={Field} label="Price Details" placeholder="E.g., ₹2,499 (Incl. of all taxes) or Starting at ₹499" value={productPrice} onChangeText={setProductPrice} maxLength={80} />
            <UiElement as={Field} label="Delivery Options" placeholder="E.g., Free 2-Day Delivery · Cash on Delivery available" value={deliveryInfo} onChangeText={setDeliveryInfo} maxLength={120} />
            <UiElement as={Field} label="Catalog Product ID (Optional)" placeholder="Paste listing ID if this product is listed in Vistrah commerce" value={productId} onChangeText={setProductId} maxLength={64} />
          </View>
        ) : (
          <View style={{gap: 10, padding: 12, borderRadius: 14, backgroundColor: mode === 'light' ? '#faf7fc' : '#1d172b', borderWidth: 1, borderColor: colors.border}}>
            <Text style={{fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 0.5, textTransform: 'uppercase'}}>
              <UiText value="Brand Details & Catalog Available" />
            </Text>
            <UiElement as={Field} label="Products & Services Available" placeholder="E.g., Custom tailoring, silk sarees, bridal accessories, fabric dyes" value={productsAvailable} onChangeText={setProductsAvailable} multiline maxLength={200} />
          </View>
        )}

        <UiElement as={Field} label="3. V Ad Title" placeholder="E.g., Special Bridal Makeup Offer or Farm Land Prep" value={title} onChangeText={setTitle} maxLength={160}/>
        <UiElement as={Field} label="4. Where Product/Brand is Used & Caption" placeholder="Describe where/how the product is used in the video, shop location, and contact..." value={videoDescription} onChangeText={setVideoDescription} multiline maxLength={2000}/>
        <UiElement as={Action} label="Submit V Ad for admin review" disabled={busy||!uploadId||title.trim().length<3} onPress={()=>void perform(async()=>{
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
          const sub=await vAds.submit(account.id,uploadId,title,videoDescription,meta);
          setUploadId('');
          setTitle('');
          setVideoDescription('');
          setProductName('');
          setProductPrice('');
          setDeliveryInfo('');
          setProductId('');
          setProductsAvailable('');
          setHistory([]);
          setPage(1);
          setHistoryMore(null);
          setMessage(sub.status==='APPROVED'?'V Ad published! It is now live on the V Ads tab.':'V Ad submitted! It will appear on the V Ads tab after admin approval.');
          setStudioTab('ads');
          resource.retry();
        })}/>
      </View>}

      {/* Creator Growth Tips Card */}
      <View style={[styles.card, {borderRadius: 20, padding: 16, gap: 8, backgroundColor: mode === 'light' ? '#f8f5fc' : '#221933', borderColor: colors.accent + '30'}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Feather name="trending-up" size={16} color={colors.accent}/>
          <Text style={[styles.heading, {fontSize: 15, color: colors.text}]}><UiText value={"Tips for a clear V Ad"}/></Text>
        </View>
        <Text style={[styles.muted, {fontSize: 12.5, lineHeight: 18}]}><UiText value={"• Introduce your shop name and location within the first 3 seconds."}/>{'\n'}<UiText value={"• Keep your video under 30 seconds for highest retention on V Ads."}/>{'\n'}<UiText value={"• Show practical demonstrations or real customer results."}/></Text>
      </View>
    </View>))}

    {/* TAB 3: PUBLIC APPROVED V ADS (VISIBLE TO ALL USERS) */}
    {studioTab==='public'&&<PublicFeedView/>}

    {selectedProductDetails && (
      <StudioProductDetailsModal
        visible={Boolean(selectedProductDetails)}
        onClose={()=>setSelectedProductDetails(null)}
        title={selectedProductDetails.title}
        channelName={selectedProductDetails.channelName}
        advertiserId={selectedProductDetails.advertiserId}
        description={selectedProductDetails.description}
        meta={selectedProductDetails.meta}
      />
    )}
  </>;
}

function PublicFeedView() {
  const {styles, colors, mode} = useTheme();
  const surface=mode==='light'?brandTheme.headerLight:brandTheme.headerDark;
  const brandGradient=[brandTheme.gradient[0],brandTheme.gradient[1],brandTheme.gradient[2]] as const;
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busyMore, setBusyMore] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<{
    title: string;
    channelName: string;
    advertiserId?: string;
    description: string;
    meta: AdProductMeta;
  } | null>(null);

  const loadFeed = async (nextPage = 1) => {
    if (nextPage === 1) setLoading(true);
    else setBusyMore(true);
    setError('');
    try {
      const feed = await vAds.feed(nextPage);
      if (nextPage === 1) {
        setReels(feed.items);
      } else {
        setReels(prev => [...prev, ...feed.items.filter(item => !prev.some(p => p.id === item.id))]);
      }
      setPage(feed.page);
      setHasMore(feed.has_more);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setBusyMore(false);
    }
  };

  useEffect(() => {
    void loadFeed(1);
  }, []);

  if (loading) return <Loading />;
  if (error && !reels.length) return <ErrorPanel error={new Error(error)} retry={() => void loadFeed(1)} />;

  return (
    <View style={{gap: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <View style={{gap: 2, flex: 1}}>
          <Text accessibilityRole="header" style={[styles.heading, {fontSize: 18}]}>
            <UiText value="Public V Ads" />
          </Text>
          <Text style={[styles.muted, {fontSize: 12.5}]}>
            <UiText value="All approved public ads visible to all users, not just sellers." />
          </Text>
        </View>
        <UiElement
          as={Pressable}
          accessibilityRole="button"
          accessibilityLabel="Refresh public ads"
          onPress={() => void loadFeed(1)}
          style={({pressed}) => ({
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Feather name="refresh-cw" size={13} color={colors.accent} />
          <Text style={{fontSize: 12, fontWeight: '600', color: colors.accent}}>
            <UiText value="Refresh" />
          </Text>
        </UiElement>
      </View>

      {Boolean(error) && <ErrorPanel error={new Error(error)} retry={() => void loadFeed(page)} />}

      {!reels.length ? (
        <View style={[styles.card, {alignItems: 'center', padding: 28, gap: 10}]}>
          <Feather name="globe" size={36} color={colors.muted} />
          <Text style={[styles.heading, {fontSize: 16}]}>
            <UiText value="No approved public V Ads yet" />
          </Text>
          <Text style={[styles.muted, {textAlign: 'center', fontSize: 12}]}>
            <UiText value="Approved marketing videos from all creators appear here and in the main V Ads feed." />
          </Text>
        </View>
      ) : (
        reels.map(reel => {
          const advertiserLabel = (reel.advertiser?.name || reel.advertiser?.handle || 'VISTRAH CREATOR').toUpperCase();
          const { description: cleanDesc, meta: reelMeta } = parseAdDescription(reel.description);
          const isProduct = reelMeta.ad_type === 'PRODUCT';
          return (
            <LinearGradient
                key={reel.id}
                colors={[surface[0], surface[1], surface[2]]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{gap: 12, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, maxWidth: 440, width: '100%', alignSelf: 'center'}}
              >
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                <LinearGradient
                  colors={brandGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 20,
                    maxWidth: '70%',
                  }}
                >
                  <Feather name="globe" size={11} color="#fff" />
                  <Text numberOfLines={1} style={{fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#fff'}}>
                    {advertiserLabel}
                  </Text>
                </LinearGradient>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: mode === 'light' ? '#e6f4ea' : '#132b1b',
                    borderWidth: 1,
                    borderColor: '#16a34a30',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Feather name="check-circle" size={11} color="#16a34a" />
                  <Text style={{fontSize: 11, fontWeight: '700', color: '#16a34a'}}>
                    <UiText value="Live Public Ad" />
                  </Text>
                </View>
              </View>

              <View style={{gap: 6}}>
                <Text accessibilityRole="header" style={[styles.heading, {fontSize: 18, lineHeight: 24}]}>
                  {reel.title}
                </Text>
                {Boolean(cleanDesc) && (
                  <Text style={[styles.muted, {lineHeight: 20, fontSize: 13}]}>
                    {cleanDesc}
                  </Text>
                )}
              </View>

              {/* Explore Product / Explore Brand Action Button */}
              <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                {isProduct ? (
                  <UiElement as={Pressable}
                    onPress={()=>setSelectedProductDetails({
                      title: reel.title,
                      channelName: reel.advertiser?.name || 'Vistrah Creator',
                      advertiserId: reel.advertiser?.id,
                      description: cleanDesc,
                      meta: reelMeta,
                    })}
                    style={({pressed})=>({
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 14,
                      backgroundColor: '#e11d48',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      opacity: pressed ? 0.85 : 1,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel="Explore Product"
                  >
                    <Feather name="shopping-bag" size={13} color="#FFFFFF"/>
                    <Text style={{color: '#FFFFFF', fontSize: 12.5, fontWeight: '700'}}>
                      <UiText value="Explore Product"/>
                      {reelMeta.product_price ? ` · ${reelMeta.product_price}` : ''}
                    </Text>
                    <Feather name="chevron-right" size={13} color="#FFFFFF"/>
                  </UiElement>
                ) : (
                  <UiElement as={Pressable}
                    onPress={()=>router.push({pathname:'/advertiser-profile',params:{id:reel.advertiser?.id}})}
                    style={({pressed})=>({
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 14,
                      backgroundColor: '#503fbd',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      opacity: pressed ? 0.85 : 1,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel="Explore Brand"
                  >
                    <Feather name="briefcase" size={13} color="#FFFFFF"/>
                    <Text style={{color: '#FFFFFF', fontSize: 12.5, fontWeight: '700'}}>
                      <UiText value="Explore Brand"/>
                    </Text>
                    <Feather name="arrow-right" size={12} color="#FFFFFF"/>
                  </UiElement>
                )}
              </View>

              {Boolean(reel.video_url) && (
                <View style={{borderRadius: 18, overflow: 'hidden', backgroundColor: 'transparent', width: '100%', alignItems: 'center'}}>
                  <InlineStudioPlayer
                    videoUrl={reel.video_url}
                    isActive={activeVideoId === reel.id}
                    onActivate={() => setActiveVideoId(reel.id)}
                  />
                </View>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <Feather name="heart" size={14} color={colors.accent} />
                    <Text style={{fontSize: 12, fontWeight: '600', color: colors.text}}>
                      {(reel.likes_count ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <Feather name="message-circle" size={14} color={colors.muted} />
                    <Text style={{fontSize: 12, fontWeight: '600', color: colors.text}}>
                      {(reel.comments_count ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <UiElement
                  as={Pressable}
                  accessibilityRole="link"
                  accessibilityLabel={`Watch ${reel.title} full screen in V Ads`}
                  onPress={() => router.push({pathname: '/(tabs)/v-ads', params: {video: reel.id}})}
                  style={({pressed}) => ({
                    minHeight: 36,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{color: colors.accent, fontSize: 13.5, fontWeight: '600'}}>
                    <UiText value="Watch Full Reel" />
                  </Text>
                  <Feather name="arrow-right" size={15} color={colors.accent} />
                </UiElement>
              </View>
            </LinearGradient>
          );
        })
      )}

      {hasMore && (
        <UiElement
          as={Action}
          label="Load more public ads"
          secondary
          disabled={busyMore}
          onPress={() => void loadFeed(page + 1)}
        />
      )}
      {selectedProductDetails && (
        <StudioProductDetailsModal
          visible={Boolean(selectedProductDetails)}
          onClose={()=>setSelectedProductDetails(null)}
          title={selectedProductDetails.title}
          channelName={selectedProductDetails.channelName}
          advertiserId={selectedProductDetails.advertiserId}
          description={selectedProductDetails.description}
          meta={selectedProductDetails.meta}
        />
      )}
    </View>
  );
}

function RestrictedStudioTool({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}) {
  const {styles, colors} = useTheme();
  return (
    <View style={[styles.card, {borderRadius: 20, padding: 24, alignItems: 'center', gap: 14}]}>
      <View style={{width: 56, height: 56, borderRadius: 28, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center'}}>
        <Feather name={icon} size={26} color={colors.accent}/>
      </View>
      <View style={{alignItems: 'center', gap: 6}}>
        <Text style={[styles.heading, {fontSize: 17, textAlign: 'center'}]}>
          <UiText value={title}/>
        </Text>
        <Text style={[styles.muted, {textAlign: 'center', fontSize: 13, lineHeight: 18, maxWidth: 300}]}>
          <UiText value={description}/>
        </Text>
      </View>
      <UiElement
        as={Pressable}
        accessibilityRole="button"
        accessibilityLabel="Sign in to continue"
        onPress={() => router.push('/auth')}
        style={({pressed}) => ({
          marginTop: 4,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Feather name="log-in" size={15} color={colors.ink}/>
        <Text style={{fontSize: 13, fontWeight: '700', color: colors.ink}}>
          <UiText value="Sign in / Register"/>
        </Text>
      </UiElement>
    </View>
  );
}
