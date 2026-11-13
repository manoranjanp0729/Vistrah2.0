type GoogleIdentityApi={initialize:(options:{client_id:string;callback:(response:{credential:string})=>void;auto_select:boolean})=>void;renderButton:(element:HTMLElement,options:{theme:string;size:string;text:string;shape:string;width?:number;logo_alignment?:string})=>void};
let loading:Promise<GoogleIdentityApi>|undefined;
export function loadGoogleIdentity():Promise<GoogleIdentityApi>{
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
  script.onload=()=>{const api=(window as unknown as {google?:{accounts?:{id?:GoogleIdentityApi}}}).google?.accounts?.id;if(api)resolve(api);else reject(new Error('Google sign-in could not load. Use email and password.'));};
  script.onerror=()=>{script.remove();loading=undefined;reject(new Error('Google sign-in could not load. Use email and password.'));};
  document.head.appendChild(script);
 });return loading;
}
