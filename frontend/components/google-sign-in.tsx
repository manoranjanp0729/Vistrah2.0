'use client';
import {UiText} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {loadGoogleIdentity} from '../../shared/google-web';

const TARGET_HEIGHT=48,BASE_HEIGHT=40,SCALE=TARGET_HEIGHT/BASE_HEIGHT;

export function GoogleSignIn({disabled,onCredential}:{disabled:boolean;onCredential:(credential:string)=>void}){
 const wrap=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),latest=useRef({disabled,onCredential}),initialized=useRef(false);
 const [error,setError]=useState(''),[boxWidth,setBoxWidth]=useState(0);
 useEffect(()=>{latest.current={disabled,onCredential};},[disabled,onCredential]);
 const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
 useEffect(()=>{
  const el=wrap.current;if(!clientId||!el)return;
  const measure=()=>setBoxWidth(Math.round(el.getBoundingClientRect().width));
  measure();
  if(typeof ResizeObserver==='undefined')return;
  const ro=new ResizeObserver(measure);ro.observe(el);
  return()=>ro.disconnect();
 },[clientId]);
 const effectiveWidth=boxWidth||480;
 const gsiWidth=Math.min(400,Math.max(200,Math.ceil((effectiveWidth+4)/SCALE)));
 useEffect(()=>{
  let active=true;if(!clientId)return;
  void loadGoogleIdentity().then(api=>{
   if(!active||!host.current)return;
   if(!initialized.current){
    api.initialize({client_id:clientId,auto_select:false,callback:response=>{if(!latest.current.disabled)latest.current.onCredential(response.credential);}});
    initialized.current=true;
   }
   host.current.innerHTML='';
   api.renderButton(host.current,{theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width:gsiWidth,logo_alignment:'center'});
  }).catch(err=>{if(active)setError((err as Error).message);});
  return()=>{active=false;};
 },[clientId,gsiWidth]);
 if(!clientId)return <p role="status"><UiText value={"Google sign-in is not configured yet. Use email and password."}/></p>;
 const clipWidth=Math.min(effectiveWidth,Math.max(200,Math.round(gsiWidth*SCALE)-4));
 return <div aria-disabled={disabled} style={{width:'100%',opacity:disabled?.5:1,pointerEvents:disabled?'none':undefined,marginBottom:16}}>
  <div ref={wrap} style={{width:'100%',minHeight:TARGET_HEIGHT,height:TARGET_HEIGHT,borderRadius:'var(--radius-control, 8px)',backgroundColor:'#ffffff',border:'1px solid var(--border, #dbe2ee)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxSizing:'border-box'}}>
   <div style={{width:clipWidth,height:TARGET_HEIGHT-4,overflow:'hidden'}}>
    <div ref={host} style={{width:gsiWidth,height:BASE_HEIGHT,transform:`translate(-2px,-2px) scale(${SCALE})`,transformOrigin:'0 0'}}/>
   </div>
  </div>
  {error&&<p role="alert"><UiText value={error}/></p>}
 </div>;
}
