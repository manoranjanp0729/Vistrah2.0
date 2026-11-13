/** Local, allowlisted return paths. Reject normalization tricks and unknown queries. */
const unsafeCharacters=(value:string)=>[...value].some(char=>char==='\\'||char.charCodeAt(0)<32||char.charCodeAt(0)===127);
export function safeDestination(value:unknown,fallback='/account',depth=0):string {
  if(typeof value!=='string'||value.length>2048||depth>2||!value.startsWith('/')||value.startsWith('//')||unsafeCharacters(value)||/\s/.test(value))return fallback;
  try {
    const decoded=decodeURIComponent(value);
    if(unsafeCharacters(decoded))return fallback;
    const url=new URL(value,'https://vistrah.invalid');
    const path=value.split(/[?#]/,1)[0];
    if(url.origin!=='https://vistrah.invalid'||url.hash||url.pathname!==path||path.includes('%')||path.includes('//'))return fallback;
    const slug='[a-z0-9]+(?:-[a-z0-9]+)*';
    const service=new RegExp(`^/service/${slug}(?:/${slug}){0,5}$`).test(path);
    const account=/^\/account(?:\/(?:profile|membership|orders|requests|payments|provider-applications|finds(?:\/[0-9a-f-]{36})?))?$/.test(path);
    const admin=/^\/admin(?:\/(?:requests|providers|provider-services|catalogue|offers|payments|audit|workflows|job-sources|provider-applications|provider-requirements|ownership-claims|publication-drafts))?$/.test(path);
    const seller=path==='/seller'||path==='/seller/v-ads'||path==='/seller/add-service'||/^\/seller\/(?:business|commerce)\/[1-9]\d*$/.test(path);
    const commerce=/^\/commerce(?:\/(?:cart|orders|[0-9a-f-]{36}))?$/.test(path);
    if(!service&&!account&&!admin&&!seller&&!commerce&&!['/','/services','/membership','/sandbox-checkout','/provide-service','/jobs','/call-vistrah'].includes(path)&&!/^\/jobs\/[0-9a-f-]{36}$/.test(path))return fallback;
    const keys=[...url.searchParams.keys()];
    if(new Set(keys).size!==keys.length)return fallback;
    if(path==='/services'&&((url.searchParams.has('type')&&(!url.searchParams.has('category')||!url.searchParams.has('subcategory')))||(url.searchParams.has('subcategory')&&!url.searchParams.has('category'))))return fallback;
    if(path==='/seller/add-service'&&(['category','subcategory','type'].some(key=>!url.searchParams.has(key))))return fallback;
    for(const key of keys) {
      const v=url.searchParams.get(key)!;
      if(path==='/services'&&['category','subcategory','type'].includes(key)&&v.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))continue;
      if(/^\/seller\/commerce\/[1-9]\d*$/.test(path)&&key==='focus'&&/^[0-9a-f-]{36}$/.test(v))continue;
      if(path==='/seller/add-service'&&['category','subcategory','type'].includes(key)&&v.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))continue;
      if(service&&key==='intent'&&['enquiry','contact','recommendations','in-house'].includes(v))continue;
      if(service&&key==='tab'&&new RegExp(`^/service/${slug}/(?:${slug}/)?service/${slug}$`).test(path)&&['providers','recommendations','in-house'].includes(v))continue;
      if(['/membership','/sandbox-checkout'].includes(path)&&key==='next'&&safeDestination(v,'',depth+1)&&!/^\/(membership|sandbox-checkout)(?:\?|$)/.test(v))continue;
      if(path==='/provide-service'&&((['category','business','service'].includes(key)&&/^[1-9]\d*$/.test(v))||(key==='application'&&/^[0-9a-f-]{36}$/.test(v))))continue;
      if(path==='/jobs'&&((key==='q'&&v.length<=150)||(key==='page'&&/^[1-9]\d*$/.test(v))))continue;
      return fallback;
    }
    return value;
  } catch {return fallback;}
}
export function destinationLink(path:'/login'|'/register'|'/membership'|'/sandbox-checkout',next:unknown) {
  return `${path}?next=${encodeURIComponent(safeDestination(next))}`;
}
