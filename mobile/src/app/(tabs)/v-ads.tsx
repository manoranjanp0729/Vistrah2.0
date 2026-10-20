import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useFocusEffect,router,useLocalSearchParams} from 'expo-router';
import {
  AppState, FlatList, Pressable, Share, StyleSheet, Text,
  TextInput, View, type LayoutChangeEvent,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useVideoPlayer, VideoView} from 'expo-video';
import {useTheme} from '../../lib/theme';
import {useSession} from '../../lib/session';
import {vAds,playableReel,publicVideoLink,type PlayableReel as Reel} from '../../lib/v-ads';
import {mergeReels,sharePath,type Comment} from '../../../../shared/v-ads';
import {Loading,ErrorPanel,Action} from '../../components/ui';
import {api} from '../../lib/api';
import {managementClient,advanceView} from '../../../../shared/v-ads-management';
const management=managementClient(api);

function ReelCard({reel, active, height}: {
  reel: Reel;
  active: boolean;
  height: number;
}) {
  const {colors} = useTheme();
  const {user}=useSession();
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [muted, setMuted] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }, 1500);
  }
  const [paused, setPaused] = useState(false);

  const player = useVideoPlayer(reel.url, instance => {
    instance.loop = true;
    instance.muted = false;
  });
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
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        fullscreenOptions={{enable: true}}
      />

      <Pressable
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
      </Pressable>

      <View style={s.topBar}>
        <Text style={s.heading}>V Ads</Text>
        <View style={s.sponsored}>
          <Text style={s.sponsoredText}>VISTRAH</Text>
        </View>
      </View>

      <View style={s.rightActions}>
        <Pressable style={s.action} disabled={busy} onPress={()=>void toggleLike()} accessibilityLabel={liked?'Unlike video':'Like video'}>
          <Feather name="heart" size={28} color={liked ? '#FF685B' : '#FFFFFF'} />
          <Text style={s.actionText}>{likesCount || (liked ? 'Liked' : 'Like')}</Text>
        </Pressable>
        <Pressable style={s.action} onPress={() => {if(!commentsOpen)setCommentsLoading(true);setCommentsOpen(!commentsOpen);}}>
          <Feather name="message-circle" size={28} color="#FFFFFF" />
          <Text style={s.actionText}>{commentCount || 'Comment'}</Text>
        </Pressable>
        <Pressable style={s.action} onPress={()=>void share()}>
          <Feather name="share-2" size={27} color="#FFFFFF" />
          <Text style={s.actionText}>Share</Text>
        </Pressable>
        <Pressable style={s.action} onPress={toggleSound}>
          <Feather name={muted ? 'volume-x' : 'volume-2'} size={27} color="#FFFFFF" />
          <Text style={s.actionText}>Sound</Text>
        </Pressable>
      </View>

      <View style={s.details}>
        <Pressable
          style={s.accountRow}
          onPress={() => router.push({pathname:'/advertiser-profile',params:{id:reel.advertiser.id}})}
          accessibilityRole="button"
          accessibilityLabel={'Open '+reel.account+' advertiser profile'}
        >
          <View style={s.avatar}>
            <Text style={s.avatarText}>V</Text>
          </View>
          <View>
            <Text style={s.account}>{reel.account}</Text>
            <Text style={s.adLabel}>Advertiser video</Text>
          </View>
        </Pressable>
        <Text style={s.title}>{reel.title}</Text>
        <Text style={s.description}>{reel.description}</Text>
        {Boolean(playbackError)&&<Pressable onPress={()=>{setPlaybackError('');void player.replaceAsync(reel.url).then(()=>{if(playbackAllowed.current)player.play();}).catch(()=>setPlaybackError('Video could not load. Please retry.'));}}><Text style={s.description}>{playbackError} Tap to retry.</Text></Pressable>}
        {Boolean(error)&&!commentsOpen&&<Pressable onPress={()=>user?setError(''):router.push('/auth')}><Text style={s.description}>{error}{!user?' Sign in':''}</Text></Pressable>}
        {user?.seller_enabled&&<Pressable onPress={()=>router.push('/seller/v-ads')}><Text style={s.description}>Your V Ads</Text></Pressable>}
      </View>

      {commentsOpen && (
        <View style={[s.commentPanel, {borderColor: colors.border}]}>
          <View style={s.commentHeader}>
            <Text style={s.commentTitle}>Comments</Text>
            <Pressable onPress={() => setCommentsOpen(false)}>
              <Feather name="x" color="#FFFFFF" size={23} />
            </Pressable>
          </View>
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            style={s.commentList}
            ListEmptyComponent={
              <Text style={s.commentHint}>Be the first to comment.</Text>
            }
            renderItem={({item}) => <Text style={s.comment}>{item.body}</Text>}
            onEndReached={()=>void loadMoreComments()}
          />
          <View style={s.commentInputRow}>
            <TextInput
              style={s.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#B8B8B8"
              value={draft}
              onChangeText={setDraft}
              maxLength={300}
            />
            <Pressable disabled={busy||commentsLoading} onPress={()=>void addComment()} accessibilityLabel="Post comment">
              <Feather name="send" size={22} color="#F9AA45" />
            </Pressable>
          </View>
          {commentsLoading&&<Text style={s.demoNote}>Loading comments…</Text>}
          {Boolean(error)&&<Text style={s.demoNote}>{error}</Text>}
          {!user&&<Pressable onPress={()=>router.push('/auth')}><Text style={s.demoNote}>Sign in to like or comment.</Text></Pressable>}
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
  const [reels,setReels]=useState<Reel[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  const [page,setPage]=useState(1),[hasMore,setHasMore]=useState(false);
  const paging=useRef(false);
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(()=>{let alive=true;
    Promise.all([vAds.feed(),video?vAds.reel(video):Promise.resolve(null)]).then(([feed,selected])=>{
      if(alive){setReels(mergeReels(selected?[selected]:[],feed.items).map(playableReel));setPage(1);setHasMore(feed.has_more);setActiveIndex(0);setError('');}
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
  },[video,version]);
  async function loadMore(){if(paging.current||loading||!hasMore)return;paging.current=true;try{const feed=await vAds.feed(page+1);setReels(previous=>mergeReels(previous,feed.items).map(playableReel));setPage(feed.page);setHasMore(feed.has_more);setError('');}catch(e){setError((e as Error).message);}finally{paging.current=false;}}
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
      {loading?<Loading/>:!reels.length?<View style={styles.content}>{Boolean(error)?<ErrorPanel error={new Error(error)} retry={()=>setVersion(v=>v+1)}/>:<Text style={styles.muted}>No approved videos yet.</Text>}<Action label="Refresh V Ads" onPress={()=>setVersion(v=>v+1)}/>{user?.seller_enabled&&<Action label="Your V Ads" secondary onPress={()=>router.push('/seller/v-ads')}/>}</View>:height > 0 && (
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
  reel: {backgroundColor: '#080B11', overflow: 'hidden'},
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
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute', top: 15, left: 17, right: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heading: {color: '#FFFFFF', fontSize: 20, fontWeight: '700'},
  sponsored: {backgroundColor: '#F9AA45', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5},
  sponsoredText: {color: '#20170C', fontSize: 11, fontWeight: '800'},
  rightActions: {position: 'absolute', right: 12, bottom: 125, gap: 22},
  action: {alignItems: 'center', gap: 5, width: 57},
  actionText: {color: '#FFFFFF', fontSize: 10, fontWeight: '600'},
  details: {position: 'absolute', left: 16, right: 77, bottom: 24, gap: 9},
  accountRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F9AA45', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: '#11243F', fontSize: 24, fontWeight: '800'},
  account: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  adLabel: {color: '#E5E5E5', fontSize: 11},
  title: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  description: {color: '#FFFFFF', fontSize: 13, lineHeight: 19},
  commentPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '55%', backgroundColor: '#171B25',
    borderTopWidth: 1, borderTopLeftRadius: 22,
    borderTopRightRadius: 22, padding: 16, gap: 10,
  },
  commentHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  commentTitle: {color: '#FFFFFF', fontWeight: '700', fontSize: 16},
  commentList: {flex: 1},
  commentHint: {color: '#B8B8B8', marginTop: 18},
  comment: {color: '#FFFFFF', marginVertical: 7},
  commentInputRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  commentInput: {
    flex: 1, backgroundColor: '#303643', borderRadius: 22,
    color: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 10,
  },
  demoNote: {color: '#B8B8B8', fontSize: 10},
});







