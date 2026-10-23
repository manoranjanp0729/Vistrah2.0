import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import Feather from '@expo/vector-icons/Feather';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,AppState,Dimensions,Pressable,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {useVideoPlayer,VideoView,type VideoSource} from 'expo-video';
import {nextHomepageVideo} from '../../../shared/homepage-video';
import {mobileVideoCoordinator} from '../lib/video-coordinator';

const homepageVideoSources:readonly VideoSource[]=[require('../../assets/videos/vistrah-introduction.mp4')];

export function HomepageVideoPlayer({videos=homepageVideoSources}:{videos?:readonly VideoSource[]}={}){
 const index=useRef(0),active=useRef(false);
 const container=useRef<View>(null),view=useRef<VideoView>(null),manualPause=useRef(false),timelineWidth=useRef(0);
 const [visible,setVisible]=useState(true),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[reader,setReader]=useState(false),[activity,setActivity]=useState(0);
 const idRef=useRef('home-video-'+Math.random().toString(36).slice(2));
 const player=useVideoPlayer(videos[0]??null,instance=>{instance.loop=videos.length===1;instance.muted=false;instance.keepScreenOnWhilePlaying=false;instance.staysActiveInBackground=false;instance.timeUpdateEventInterval=.5;});
 const reveal=()=>{setVisible(true);setActivity(value=>value+1);};
 useFocusEffect(useCallback(()=>{
  active.current=true;
  const subscription=AppState.addEventListener('change',state=>{if(state!=='active')player.pause();else if(!manualPause.current)player.play();});
  return()=>{active.current=false;subscription.remove();try{player.pause();}catch{/* Player can be released first. */}};
 },[player]));

 useEffect(()=>{
  const id=idRef.current;
  mobileVideoCoordinator.register({
   id,
   visibleArea:0,
   play:()=>{
    if(!manualPause.current&&active.current&&AppState.currentState==='active'){
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
 },[player]);

 useEffect(()=>{
  const id=idRef.current;
  const interval=setInterval(()=>{
   if(!active.current||AppState.currentState!=='active'){
    mobileVideoCoordinator.updateVisibleArea(id,0);
    return;
   }
   container.current?.measureInWindow((x,y,w,h)=>{
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
 },[]);
 useEffect(()=>{let active=true;void AccessibilityInfo.isScreenReaderEnabled().then(value=>{if(active)setReader(value);});const listener=AccessibilityInfo.addEventListener('screenReaderChanged',setReader);return()=>{active=false;listener.remove();};},[]);
 useEffect(()=>{
  let mounted=true;
  const subscriptions=[player.addListener('playToEnd',()=>{if(videos.length<2)return;index.current=nextHomepageVideo(index.current,videos.length);setTime(0);setDuration(0);setError(false);void player.replaceAsync(videos[index.current]).then(()=>{if(mounted&&active.current&&AppState.currentState==='active'&&!manualPause.current)player.play();}).catch(()=>{if(mounted)setError(true);});}),player.addListener('playingChange',event=>{setPlaying(event.isPlaying);if(!event.isPlaying)setVisible(true);}),player.addListener('statusChange',event=>{setError(event.status==='error');if(event.status==='readyToPlay')setDuration(player.duration);}),player.addListener('timeUpdate',event=>{setTime(event.currentTime);setDuration(player.duration);})];
  return()=>{mounted=false;subscriptions.forEach(subscription=>subscription.remove());};
 },[player,videos]);
 useEffect(()=>{if(!visible||!playing||reader)return;const timer=setTimeout(()=>setVisible(false),1000);return()=>clearTimeout(timer);},[visible,playing,reader,activity]);
 return <View ref={container} style={{gap:8}}><View style={{width:'100%',aspectRatio:16/9,borderRadius:16,overflow:'hidden',backgroundColor:'#000'}}>
  <UiElement as={VideoView} ref={view} player={player} accessibilityLabel="VISTRAH homepage video" style={{width:'100%',height:'100%'}} nativeControls={false} contentFit="contain" fullscreenOptions={{enable:true}}/>
  <UiElement as={Pressable} accessibilityRole="button" accessibilityLabel="Show video controls" onPress={reveal} style={{position:'absolute',top:0,right:0,bottom:0,left:0}}/>
  {(visible||reader)&&<View style={{position:'absolute',bottom:0,left:0,right:0,flexDirection:'row',alignItems:'center',backgroundColor:'#000b',padding:4}}>
   <UiElement as={PlayerButton} label={playing?'Pause video':'Play video'} icon={playing?'pause':'play'} onPress={()=>{manualPause.current=playing;if(playing)player.pause();else player.play();reveal();}}/>
   {/* eslint-disable-next-line react-hooks/immutability -- expo-video exposes muted as an imperative native-player setter. */}
   <UiElement as={PlayerButton} label={muted?'Unmute video':'Mute video'} icon={muted?'volume-x':'volume-2'} onPress={()=>{player.muted=!player.muted;setMuted(player.muted);reveal();}}/>
   {/* eslint-disable-next-line react-hooks/immutability -- Seeking uses the documented mutable expo-video currentTime setter. */}
   <UiElement as={Pressable} accessibilityRole="adjustable" accessibilityLabel="Video position" accessibilityValue={{min:0,max:Math.round(duration),now:Math.round(time)}} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={event=>{player.currentTime=Math.max(0,Math.min(duration,time+(event.nativeEvent.actionName==='increment'?10:-10)));reveal();}} onPress={reveal} style={{flex:1,minWidth:20,height:44,justifyContent:'center'}} onLayout={event=>{timelineWidth.current=event.nativeEvent.layout.width;}} onPressIn={event=>{if(duration&&timelineWidth.current)player.currentTime=duration*Math.max(0,Math.min(1,event.nativeEvent.locationX/timelineWidth.current));}}>
    <View style={{height:3,backgroundColor:'#ffffff60',borderRadius:2}}><View style={{height:3,backgroundColor:'#fff',width:`${duration?Math.min(100,time/duration*100):0}%`}}/></View>
   </UiElement>
   <UiElement as={PlayerButton} label="Fullscreen video" icon="maximize" onPress={()=>{void view.current?.enterFullscreen().catch(()=>{});reveal();}}/>
  </View>}
 </View>{error&&<Text accessibilityRole="alert" style={{color:'#b93c50'}}><UiText value={"Video could not load. Please reopen this page to retry."}/></Text>}</View>;
}

function PlayerButton({label,icon,onPress}:{label:string;icon:'play'|'pause'|'volume-x'|'volume-2'|'maximize';onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Feather name={icon} size={20} color="#fff"/></Pressable>;}
