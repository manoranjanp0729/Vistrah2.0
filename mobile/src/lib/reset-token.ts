export function resetToken(value:string){
  let token=value.trim();
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(token)){
    try{const url=new URL(token);token=new URLSearchParams(url.hash.replace(/^#/, '')).get('token')??url.searchParams.get('token')??'';}catch{token='';}
  }
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(token))throw new Error('Paste the single-use reset code or the complete link from your email.');
  return token;
}
