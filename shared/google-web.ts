export type GoogleIdentityInitOptions={
 client_id:string;
 callback:(response:{credential:string})=>void;
 auto_select:boolean;
 button_auto_select?:boolean;
 cancel_on_tap_outside?:boolean;
};
export type GoogleIdentityApi={
 initialize:(options:GoogleIdentityInitOptions)=>void;
 renderButton:(element:HTMLElement,options:{theme:string;size:string;text:string;shape:string;width?:number;logo_alignment?:string})=>void;
 disableAutoSelect?:()=>void;
 cancel?:()=>void;
};
export type GoogleOAuth2TokenResponse={
 access_token?:string;
 error?:string;
 error_description?:string;
};
export type GoogleOAuth2Api={
 initTokenClient:(config:{
  client_id:string;
  scope:string;
  prompt?:string;
  callback:(response:GoogleOAuth2TokenResponse)=>void;
  error_callback?:(error:{type?:string;message?:string})=>void;
 })=>{requestAccessToken:(overrideConfig?:{prompt?:string})=>void};
};
type GoogleWindow={google?:{accounts?:{id?:GoogleIdentityApi;oauth2?:GoogleOAuth2Api}}};

let loading:Promise<GoogleIdentityApi>|undefined;

export function disableGoogleAutoSelect():void{
 if(typeof window==='undefined')return;
 try{
  const idApi=(window as unknown as GoogleWindow).google?.accounts?.id;
  idApi?.disableAutoSelect?.();
  idApi?.cancel?.();
 }catch{
  // Ignore Google Identity teardown errors during sign-out.
 }
}

export function getGoogleOAuth2():GoogleOAuth2Api|undefined{
 if(typeof window==='undefined')return undefined;
 return (window as unknown as GoogleWindow).google?.accounts?.oauth2;
}

export function loadGoogleIdentity():Promise<GoogleIdentityApi>{
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
  script.onload=()=>{const api=(window as unknown as GoogleWindow).google?.accounts?.id;if(api)resolve(api);else reject(new Error('Google sign-in could not load. Use email and password.'));};
  script.onerror=()=>{script.remove();loading=undefined;reject(new Error('Google sign-in could not load. Use email and password.'));};
  document.head.appendChild(script);
 });return loading;
}
