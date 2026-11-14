import {Text,TextInput} from '../../components/typography';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {UiText,UiElement} from "../../components/localized-ui";
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect,router,useLocalSearchParams} from 'expo-router';
import {AppState,FlatList,Pressable,Share,StyleSheet,View,ScrollView,type LayoutChangeEvent,} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Feather} from '@expo/vector-icons';
import {useVideoPlayer, VideoView} from 'expo-video';
import {mobileVideoCoordinator} from '../../lib/video-coordinator';
import {radii,tabularNums,useTheme} from '../../lib/theme';
import {useSession} from '../../lib/session';
import {useOptionalLocation} from '../../lib/location';
import {vAds,playableReel,publicVideoLink,type PlayableReel as Reel} from '../../lib/v-ads';
import {mergeReels,sharePath,parseAdDescription,type Comment,type FeedFilter} from '../../../../shared/v-ads';
import brandTheme from '../../../../shared/brand-theme.json';
import {Loading,ErrorPanel,Action} from '../../components/ui';
import {api} from '../../lib/api';
import {managementClient,advanceView} from '../../../../shared/v-ads-management';
const management=managementClient(api);

function ReelCard({reel, active, height}: {
  reel: Reel;
  active: boolean;
  height: number;
}) {
  const {colors, mode, accentGradient} = useTheme();
  const {user}=useSession();
  const brandGradient=accentGradient;
  const [screenFocused, setScreenFocused] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  const [liked, setLiked] = useState(false);
  const [likesCount,setLikesCount]=useState(reel.likes_count);
  const [engagementReady,setEngagementReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const mutationPending=useRef(false);
  const [error,setError]=useState('');
  const [playbackError,setPlaybackError]=useState('');
  const [commentsLoading,setCommentsLoading]=useState(false);
  const [commentPage,setCommentPage]=useState(0);
  const [moreComments,setMoreComments]=useState(true);
  const [commentCount,setCommentCount]=useState(reel.comments_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { description: cleanDescription, meta: adMeta } = useMemo(
    () => parseAdDescription(reel.description),
    [reel.description]
  );
  const productMeta = adMeta.ad_type === 'PRODUCT' ? adMeta : undefined;

  useEffect(() => {
    return () => {
      if (iconTimer.current) clearTimeout(iconTimer.current);
    };
  }, []);

  function togglePlayback() {
    setPaused(previous => !previous);
    setShowPlayIcon(true);
    if (iconTimer.current) clearTimeout(iconTimer.current);
    iconTimer.current = setTimeout(() => {
      setShowPlayIcon(false);
      iconTimer.current = null;
    }, 1000);
  }
  const [paused, setPaused] = useState(false);

  const player = useVideoPlayer(reel.url, instance => {
    instance.loop = true;
    instance.muted = false;
  });

  useEffect(()=>{
    const sub=player.addListener('timeUpdate',event=>{
      if(player.duration>0){
        setProgress(Math.min(100,Math.max(0,(event.currentTime/player.duration)*100)));
      }
    });
    return()=>{try{sub.remove();}catch{}};
  },[player]);

  useEffect(()=>{
    mobileVideoCoordinator.register({
      id: reel.id,
      visibleArea: active && screenFocused && appActive ? 1000000 : 0,
      play: () => {
        if (!paused && !commentsOpen && active && screenFocused && appActive) {
          try { player.play(); } catch {}
        }
      },
      pause: () => {
        try { player.pause(); } catch {}
      },
      isManuallyPaused: () => paused || commentsOpen
    });
    return () => {
      mobileVideoCoordinator.unregister(reel.id);
    };
  }, [reel.id, active, screenFocused, appActive, paused, commentsOpen, player]);

  useEffect(()=>{
    mobileVideoCoordinator.updateVisibleArea(reel.id, active && screenFocused && appActive ? 1000000 : 0);
  }, [reel.id, active, screenFocused, appActive]);
  const playbackAllowed=useRef(false);
  const viewSent=useRef(false);
  useEffect(()=>{
    if(!user||!active||!screenFocused||!appActive||paused||commentsOpen||viewSent.current)return;
    let previous=0,watched=0;try{previous=player.currentTime;}catch{}
    const timer=setInterval(()=>{if(viewSent.current)return;
      try{watched=advanceView(watched,player.currentTime-previous,player.playing);previous=player.currentTime;}catch{return;}
      if(watched>=3){viewSent.current=true;void management.view(reel.id).catch(()=>{});}
    },500);
    return()=>clearInterval(timer);
  },[user,active,screenFocused,appActive,paused,commentsOpen,player,reel.id]);
  useEffect(()=>{
    const subscription=player.addListener('statusChange',event=>{
      setPlaybackError(event.status==='error'?'Video could not load. Check your connection and try again.':'');
    });
    return()=>{try{subscription.remove();}catch{}};
  },[player]);
  useEffect(()=>{
    let alive=true;
    if(active&&user)vAds.engagement(reel.id).then(result=>{if(alive){setLiked(result.liked);setLikesCount(result.likes_count);setEngagementReady(true);}})
      .catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[active,reel.id,user]);
  useEffect(()=>{
    let alive=true;
    if(commentsOpen){vAds.comments(reel.id).then(result=>{
      if(alive){setComments(result.items);setCommentPage(1);setMoreComments(result.items.length===20);}
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setCommentsLoading(false);});}
    return()=>{alive=false;};
  },[commentsOpen,reel.id]);

  useEffect(() => {
    playbackAllowed.current=active && !commentsOpen && !paused && screenFocused && appActive;
    if (active && !commentsOpen && !paused && screenFocused && appActive) {
      try{player.play();}catch{}
    } else {
      try{player.pause();}catch{}
    }
    return () => {playbackAllowed.current=false;try{player.pause();}catch{}};
  }, [active, commentsOpen, paused, player, screenFocused, appActive]);

  function toggleSound() {
    // eslint-disable-next-line react-hooks/immutability -- expo-video exposes mutable player controls.
    try{player.muted = !muted;}catch{}
    setMuted(!muted);
  }

  async function toggleLike(){
    if(!user){setError('Sign in to like or comment.');return;}
    if(mutationPending.current)return;
    mutationPending.current=true;setBusy(true);setError('');
    try{const current=engagementReady?{liked}:await vAds.engagement(reel.id);const result=await vAds.like(reel.id,!current.liked);setLiked(result.liked);setLikesCount(result.likes_count);setEngagementReady(true);}
    catch(e){setError((e as Error).message);}finally{mutationPending.current=false;setBusy(false);}
  }
  async function addComment() {
    const message = draft.trim();
    if (!message||mutationPending.current) return;
    if(!user){setError('Sign in to like or comment.');return;}
    mutationPending.current=true;setBusy(true);setError('');
    try{const comment=await vAds.comment(reel.id,message);setComments(previous=>[comment,...previous]);setCommentCount(count=>count+1);setDraft('');}
    catch(e){setError((e as Error).message);}finally{mutationPending.current=false;setBusy(false);}
  }
  async function loadMoreComments(){if(commentsLoading||!moreComments)return;setCommentsLoading(true);try{const result=await vAds.comments(reel.id,commentPage+1);setComments(previous=>[...previous,...result.items.filter(item=>!previous.some(old=>old.id===item.id))]);setCommentPage(result.page);setMoreComments(result.items.length===20);}catch(e){setError((e as Error).message);}finally{setCommentsLoading(false);}}
  async function share(){try{await Share.share({message:publicVideoLink(sharePath(reel.id))});}catch(e){setError((e as Error).message);}}

  return (
    <View style={[s.reel, {height}]}>
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, {width: '100%', height: '100%'}]}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{enable: true}}
      />

      <UiElement as={Pressable}
        style={s.videoTapArea}
        onPress={togglePlayback}
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Play video' : 'Pause video'}
      >
        {showPlayIcon && <View style={s.playButton}>
          <Feather
            name={paused ? 'play' : 'pause'}
            size={29}
            color="#FFFFFF"
          />
        </View>}
      </UiElement>

      {/* Cinematic bottom gradient scrim for contrast and legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(8,11,17,0.30)', 'rgba(8,11,17,0.88)']}
        pointerEvents="none"
        style={s.bottomScrim}
      />

      {/* Right-side engagement actions */}
      <View style={s.rightActions}>
        <UiElement as={Pressable} style={s.action} disabled={busy} onPress={()=>void toggleLike()} accessibilityLabel={liked?'Unlike video':'Like video'}>
          <View style={[s.actionCircle, liked && s.actionCircleLiked]}>
            <Feather name="heart" size={21} color={liked ? colors.brandPrimary : '#FFFFFF'} />
          </View>
          <Text style={[s.actionText, tabularNums]}>{likesCount || (liked ? 'Liked' : 'Like')}</Text>
        </UiElement>
        <Pressable style={s.action} onPress={() => {if(!commentsOpen)setCommentsLoading(true);setCommentsOpen(!commentsOpen);}}>
          <View style={s.actionCircle}>
            <Feather name="message-circle" size={21} color="#FFFFFF" />
          </View>
          <Text style={[s.actionText, tabularNums]}>{commentCount || 'Comment'}</Text>
        </Pressable>
        <Pressable style={s.action} onPress={()=>void share()}>
          <View style={s.actionCircle}>
            <Feather name="share-2" size={20} color="#FFFFFF" />
          </View>
          <Text style={s.actionText}><UiText value={"Share"}/></Text>
        </Pressable>
        <Pressable style={s.action} onPress={toggleSound}>
          <View style={s.actionCircle}>
            <Feather name={muted ? 'volume-x' : 'volume-2'} size={20} color="#FFFFFF" />
          </View>
          <Text style={s.actionText}><UiText value={muted ? "Muted" : "Sound"}/></Text>
        </Pressable>
      </View>

      {/* Bottom video details themed to Spotlight cards */}
      <View style={s.details}>
        {/* Spotlight brand pill */}
        <View style={[s.spotlightBadge, {backgroundColor: colors.brandPrimary}]}>
          <Feather name="play" size={10} color="#FFFFFF" />
          <Text numberOfLines={1} style={s.spotlightBadgeText}>
            {reel.account || 'VISTRAH SPOTLIGHT'}
          </Text>
        </View>

        {/* Clean channel identity */}
        <UiElement as={Pressable}
          style={s.accountRow}
          onPress={() => router.push({pathname:'/advertiser-profile',params:{id:reel.advertiser.id}})}
          accessibilityRole="button"
          accessibilityLabel={'Open '+reel.account+' advertiser profile'}
        >
          <View style={s.avatar}>
            <Feather name="video" size={17} color="#FFFFFF" />
          </View>
          <View style={{flex: 1, minWidth: 0, gap: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text numberOfLines={1} style={s.account}>{reel.account}</Text>
              <Feather name="check-circle" size={13} color="#16a34a" />
            </View>
            <Text style={s.adLabel}><UiText value={"Verified Channel"}/></Text>
          </View>
        </UiElement>

        <Text style={s.title}>{reel.title}</Text>
        {Boolean(cleanDescription)&&<Text style={s.description} numberOfLines={3}>{cleanDescription}</Text>}

        {Boolean(playbackError)&&<Pressable onPress={()=>{setPlaybackError('');void player.replaceAsync(reel.url).then(()=>{if(playbackAllowed.current)player.play();}).catch(()=>setPlaybackError('Video could not load. Please retry.'));}}><Text style={s.description}>{playbackError} <UiText value={"Tap to retry."}/></Text></Pressable>}
        {Boolean(error)&&!commentsOpen&&<Pressable onPress={()=>user?setError(''):router.push('/auth')}><Text style={s.description}><UiText value={error}/><UiText value={!user?' Sign in':''}/></Text></Pressable>}

        {/* Explore Product / Explore Brand Action Row */}
        <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:2}}>
          {adMeta.ad_type === 'PRODUCT' ? (
            <UiElement as={Pressable}
              onPress={()=>{setCommentsOpen(false);setProductDetailsOpen(true);}}
              style={({pressed})=>[s.exploreProductBtn, {opacity: pressed ? 0.85 : 1}]}
              accessibilityRole="button"
              accessibilityLabel="Explore Product"
            >
              <Feather name="shopping-bag" size={13} color="#FFFFFF"/>
              <Text style={s.exploreProductText} numberOfLines={1}>
                <UiText value="Explore Product"/>
                {adMeta.product_price ? ` · ${adMeta.product_price}` : ''}
              </Text>
              <Feather name="chevron-right" size={13} color="#FFFFFF"/>
            </UiElement>
          ) : (
            <UiElement as={Pressable}
              onPress={()=>router.push({pathname:'/advertiser-profile',params:{id:reel.advertiser.id}})}
              style={({pressed})=>[s.exploreBrandBtn, {opacity: pressed ? 0.85 : 1}]}
              accessibilityRole="button"
              accessibilityLabel="Explore Brand"
            >
              <Feather name="briefcase" size={13} color="#FFFFFF"/>
              <Text style={s.exploreBrandText} numberOfLines={1}>
                <UiText value="Explore Brand"/>
              </Text>
              <Feather name="arrow-right" size={12} color="#FFFFFF"/>
            </UiElement>
          )}

          <UiElement as={Pressable}
            onPress={()=>router.push({pathname:'/seller/v-ads',params:{from:'v-ads'}})}
            style={({pressed})=>[s.sellerBadge, {opacity: pressed ? 0.8 : 1}]}
            accessibilityRole="button"
            accessibilityLabel="Open V Ads Studio"
          >
            <Feather name="video" size={13} color="#FFFFFF"/>
            <Text style={s.sellerBadgeText}><UiText value={"V Ads Studio"}/></Text>
            <Feather name="arrow-right" size={12} color="#FFFFFF"/>
          </UiElement>
        </View>
      </View>

      {/* Video Progress Bar */}
      <View style={{position:'absolute',bottom:0,left:0,right:0,height:3,backgroundColor:'rgba(255,255,255,0.25)',zIndex:4}}>
        <View style={{height:'100%',width:`${progress}%`,backgroundColor:colors.brandPrimary}}/>
      </View>

      {/* Comments Panel */}
      {commentsOpen && (
        <View style={[s.commentPanel, {backgroundColor: colors.surface, borderColor: colors.borderSubtle}]}>
          <View style={s.commentGrabHandle} />
          <View style={s.commentHeader}>
            <Text style={[s.commentTitle, {color: colors.text}]}><UiText value={"Comments"}/></Text>
            <Pressable onPress={() => setCommentsOpen(false)} hitSlop={8}>
              <Feather name="x" color={colors.text} size={22} />
            </Pressable>
          </View>
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            style={s.commentList}
            ListEmptyComponent={
              <Text style={[s.commentHint, {color: colors.muted}]}><UiText value={"Be the first to comment."}/></Text>
            }
            renderItem={({item}) => <Text style={[s.comment, {color: colors.text}]}>{item.body}</Text>}
            onEndReached={()=>void loadMoreComments()}
          />
          <View style={s.commentInputRow}>
            <UiElement as={TextInput}
              style={[s.commentInput, {backgroundColor: colors.elevated, color: colors.text, borderColor: colors.borderSubtle, borderWidth: 1}]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.muted}
              value={draft}
              onChangeText={setDraft}
              maxLength={300}
            />
            <UiElement as={Pressable} disabled={busy||commentsLoading} onPress={()=>void addComment()} accessibilityLabel="Post comment">
              <Feather name="send" size={22} color={colors.brandPrimary} />
            </UiElement>
          </View>
          {commentsLoading&&<Text style={[s.demoNote, {color: colors.muted}]}><UiText value={"Loading comments…"}/></Text>}
          {Boolean(error)&&<Text style={[s.demoNote, {color: colors.error}]}><UiText value={error}/></Text>}
          {!user&&<Pressable onPress={()=>router.push('/auth')}><Text style={[s.demoNote, {color: colors.accent}]}><UiText value={"Sign in to like or comment."}/></Text></Pressable>}
        </View>
      )}

      {/* Product Details Sheet for Product Ads */}
      {productDetailsOpen && productMeta && (
        <View style={[s.commentPanel, {backgroundColor: colors.surface, borderColor: colors.borderSubtle, height: '70%', maxHeight: 520}]}>
          <View style={s.commentGrabHandle} />
          <View style={s.commentHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
              <View style={{width: 32, height: 32, borderRadius: radii.pill, backgroundColor: colors.brandPrimary + '22', alignItems: 'center', justifyContent: 'center'}}>
                <Feather name="shopping-bag" size={16} color={colors.brandPrimary}/>
              </View>
              <Text numberOfLines={1} style={[s.commentTitle, {color: colors.text, flex: 1}]}>
                <UiText value="Product Details" />
              </Text>
            </View>
            <Pressable onPress={() => setProductDetailsOpen(false)} hitSlop={8}>
              <Feather name="x" color={colors.text} size={22} />
            </Pressable>
          </View>

          <ScrollView style={{flex: 1}} contentContainerStyle={{gap: 14, paddingBottom: 24}}>
            <View style={{gap: 4}}>
              <Text style={{fontSize: 18, fontWeight: '800', color: colors.text}}>
                {productMeta.product_name || reel.title}
              </Text>
              <Pressable
                style={{flexDirection: 'row', alignItems: 'center', gap: 6}}
                onPress={() => {
                  setProductDetailsOpen(false);
                  router.push({pathname:'/advertiser-profile',params:{id:reel.advertiser.id}});
                }}
              >
                <Text style={{fontSize: 13, color: colors.brandPrimary, fontWeight: '600'}}>
                  {reel.account || reel.advertiser.name}
                </Text>
                <Feather name="check-circle" size={13} color="#16a34a" />
                <Text style={{fontSize: 12, color: colors.muted}}>
                  <UiText value="· View Brand Profile" />
                </Text>
              </Pressable>
            </View>

            {/* Price Details */}
            <View style={{padding: 12, borderRadius: radii.surface, backgroundColor: colors.brandPrimary + '18', borderWidth: 1, borderColor: colors.brandPrimary + '45', gap: 4}}>
              <Text style={{fontSize: 11, fontWeight: '700', color: colors.brandPrimary, textTransform: 'uppercase', letterSpacing: 0.5}}>
                <UiText value="Price Details" />
              </Text>
              <Text style={{fontSize: 20, fontWeight: '800', color: colors.brandPrimary, ...tabularNums}}>
                {productMeta.product_price || 'Available on request / order'}
              </Text>
            </View>

            {/* Delivery Options */}
            <View style={{padding: 12, borderRadius: radii.surface, backgroundColor: mode === 'light' ? '#f0fdf4' : '#0f281c', borderWidth: 1, borderColor: '#22c55e55', gap: 4}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Feather name="truck" size={14} color="#16a34a"/>
                <Text style={{fontSize: 11, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5}}>
                  <UiText value="Delivery Options" />
                </Text>
              </View>
              <Text style={{fontSize: 13.5, fontWeight: '600', color: colors.text}}>
                {productMeta.delivery_info || 'Direct delivery & local pickup available from seller'}
              </Text>
            </View>

            {/* Where Product is Used / Video Context */}
            <View style={{padding: 12, borderRadius: radii.surface, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle, gap: 6}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Feather name="play-circle" size={14} color={colors.brandPrimary}/>
                <Text style={{fontSize: 11.5, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5}}>
                  <UiText value="Where Product is Used in this Ad" />
                </Text>
              </View>
              <Text style={{fontSize: 13, lineHeight: 19, color: colors.text}}>
                {cleanDescription || reel.title}
              </Text>
            </View>

            {/* Links */}
            {Boolean(productMeta.product_id) && (
              <UiElement as={Action}
                label="View Full Product Page & Order"
                onPress={() => {
                  setProductDetailsOpen(false);
                  router.push({pathname: '/commerce/[id]', params: {id: productMeta.product_id!}});
                }}
              />
            )}

            <UiElement as={Action}
              secondary
              label="Explore Brand Channel & Available Products"
              onPress={() => {
                setProductDetailsOpen(false);
                router.push({pathname: '/advertiser-profile', params: {id: reel.advertiser.id}});
              }}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function VAds() {
  const params=useLocalSearchParams<{video?:string}>();
  const video=typeof params.video==='string'?params.video:'';
  return <VAdsFeed key={video} video={video}/>;
}
function VAdsFeed({video}:{video:string}) {
  const {styles} = useTheme();
  const {user}=useSession();
  const locationCtx=useOptionalLocation();
  const activeLoc=locationCtx?.location;
  const activeLat=activeLoc&&Number.isFinite(activeLoc.latitude)&&Number.isFinite(activeLoc.longitude)&&Math.abs(activeLoc.latitude)<=90&&Math.abs(activeLoc.longitude)<=180?activeLoc.latitude:undefined;
  const activeLon=activeLat!==undefined?activeLoc?.longitude:undefined;
  const activeRadius=activeLoc?.radius;
  const [reels,setReels]=useState<Reel[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const [page,setPage]=useState(1),[hasMore,setHasMore]=useState(false);
  const paging=useRef(false);
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(()=>{let alive=true;
    const filter:FeedFilter|undefined=activeLat!==undefined&&activeLon!==undefined?{lat:activeLat,lon:activeLon,radius_km:activeRadius}:undefined;
    Promise.all([filter?vAds.feed(1,filter):vAds.feed(),video?vAds.reel(video):Promise.resolve(null)]).then(([feed,selected])=>{
      if(alive){setReels(mergeReels(selected?[selected]:[],feed.items).map(playableReel));setPage(1);setHasMore(feed.has_more);setActiveIndex(0);setError('');}
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
  },[video,version,activeLat,activeLon,activeRadius]);
  async function loadMore(){if(paging.current||loading||!hasMore)return;paging.current=true;try{const filter:FeedFilter|undefined=activeLat!==undefined&&activeLon!==undefined?{lat:activeLat,lon:activeLon,radius_km:activeRadius}:undefined;const feed=await vAds.feed(page+1,filter);setReels(previous=>mergeReels(previous,feed.items).map(playableReel));setPage(feed.page);setHasMore(feed.has_more);setError('');}catch(e){setError((e as Error).message);}finally{paging.current=false;}}
  const onViewableItemsChanged = useCallback(
    ({viewableItems}: {viewableItems: {index: number | null}[]}) => {
      const next = viewableItems.find(item => item.index !== null);
      if (next?.index != null) {
        setActiveIndex(next.index);
      }
    },[]
  );
  function onLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) setHeight(nextHeight);
  }

  return (
    <View key={user?.id??'guest'} style={styles.page} onLayout={onLayout}>
      {loading?<Loading/>:!reels.length?<View style={styles.content}>{Boolean(error)?<ErrorPanel error={new Error(error)} retry={()=>setVersion(v=>v+1)}/>:<Text style={styles.muted}><UiText value={"No approved videos yet."}/></Text>}<UiElement as={Action} label="Refresh V Ads" onPress={()=>setVersion(v=>v+1)}/>{user?.seller_enabled&&<UiElement as={Action} label="Your V Ads" secondary onPress={()=>router.push({pathname:'/seller/v-ads',params:{from:'v-ads'}})}/>}</View>:height > 0 && (
        <FlatList
          data={reels}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
          onEndReached={()=>{if(!error)void loadMore();}}
          onEndReachedThreshold={0.5}
          ListFooterComponent={error?<ErrorPanel error={new Error(error)} retry={()=>void loadMore()}/>:null}
          viewabilityConfig={{itemVisiblePercentThreshold: 60}}
          onViewableItemsChanged={onViewableItemsChanged}
          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          onMomentumScrollEnd={event => {
            const index = Math.round(event.nativeEvent.contentOffset.y / height);
            setActiveIndex(Math.max(0, Math.min(reels.length - 1, index)));
          }}
          renderItem={({item, index}) => (
            <ReelCard reel={item} active={activeIndex === index} height={height} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  reel: {backgroundColor: '#08080D', overflow: 'hidden'},
  videoTapArea: {
    position: 'absolute',
    left: 65,
    right: 65,
    top: '25%',
    bottom: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(8,8,13,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  rightActions: {
    position: 'absolute',
    right: 14,
    bottom: 110,
    gap: 16,
    alignItems: 'center',
  },
  action: {alignItems: 'center', gap: 4, width: 52},
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(8,8,13,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  actionCircleLiked: {
    backgroundColor: 'rgba(255,107,0,0.24)',
    borderColor: 'rgba(255,107,0,0.65)',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  details: {
    position: 'absolute',
    left: 16,
    right: 76,
    bottom: 24,
    gap: 8,
  },
  spotlightBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    maxWidth: '85%',
  },
  spotlightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  exploreProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.action,
    backgroundColor: '#FF6B00',
    marginTop: 2,
  },
  exploreProductText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    ...tabularNums,
  },
  exploreBrandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.action,
    backgroundColor: '#FF6B00',
    marginTop: 2,
  },
  exploreBrandText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(13,33,63,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginTop: 2,
  },
  sellerBadgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: '700'},
  accountRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,107,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.45)',
  },
  account: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  adLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  commentPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopWidth: 1,
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  commentGrabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  commentHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  commentTitle: {fontWeight: '700', fontSize: 16},
  commentList: {flex: 1},
  commentHint: {marginTop: 18, fontSize: 13},
  comment: {marginVertical: 7, fontSize: 13.5, lineHeight: 18},
  commentInputRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  commentInput: {
    flex: 1,
    borderRadius: radii.input,
    paddingHorizontal: 15,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  demoNote: {fontSize: 11},
});
