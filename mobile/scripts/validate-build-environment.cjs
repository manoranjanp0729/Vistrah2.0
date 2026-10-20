// Configuration-only guard; never contacts endpoints or reads private files.
const {isIP}=require('node:net');
const testOrigins={API:'https://api.vistrah.in',WEB:'https://vistrah.in',ADMIN:'https://admin.vistrah.in'};
function publicOrigin(value){
  try{
    const url=new URL(value),host=url.hostname.toLowerCase();
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&
      url.pathname==='/'&&!url.port&&!isIP(host)&&!host.includes(':')&&host.includes('.')&&
      !host.endsWith('.localhost')&&!host.endsWith('.local')&&!host.endsWith('.internal')&&
      !host.endsWith('.invalid')&&!host.endsWith('.example')&&!host.includes('*');
  }catch{return false;}
}
function validateBuildEnvironment(env=process.env){
  const profile=env.EAS_BUILD_PROFILE;
  if(!profile||profile==='development')return;
  if(!['preview','aws-test','production'].includes(profile))throw new Error('Unreviewed EAS profile: configure an explicit environment boundary.');
  const production=profile==='production';
  if(env.EXPO_PUBLIC_APP_ENV!==(production?'production':'testing'))throw new Error('Build profile and EXPO_PUBLIC_APP_ENV must match.');
  if(env.EXPO_PUBLIC_WEB_SESSION_MODE)throw new Error('Native release builds must not use browser cookie transport.');
  for(const kind of ['API','WEB','ADMIN']){
    const key=`EXPO_PUBLIC_${kind}_URL`,value=env[key];
    if(!publicOrigin(value))throw new Error(`${key} must be a public HTTPS origin, never a laptop or emulator address.`);
    const origin=new URL(value).origin;
    if(!production&&origin!==testOrigins[kind])throw new Error(`${key} must use the reviewed AWS test origin.`);
    if(production&&[...Object.values(testOrigins),'https://www.vistrah.in'].includes(origin))throw new Error(`${key} cannot use an AWS test origin in a production build.`);
  }
}
module.exports={validateBuildEnvironment};
