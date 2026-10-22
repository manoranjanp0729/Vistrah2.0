'use client';
import {UiText} from "./localized-ui";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import {pagePhoto} from '@/lib/imagery';
import {Visual} from './visual';

export function PasswordRecovery({reset=false}:{reset?:boolean}) {
  const [token,setToken]=useState('');
  const [ready,setReady]=useState(!reset);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [mailConfigured,setMailConfigured]=useState<boolean|null>(null);
  useEffect(()=>{let active=true;api<{configured:boolean}>('/auth/recovery-status').then(status=>{if(active)setMailConfigured(status.configured);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(!reset)return;
    const timer=window.setTimeout(()=>{
      const value=new URLSearchParams(window.location.hash.slice(1)).get('token')||'';
      setToken(/^[A-Za-z0-9_-]{43,128}$/.test(value)?value:'');
      // Tokens arrive in fragments, never in a server request or React server payload.
      window.history.replaceState(null,'','/reset-password');setReady(true);
    },0);
    return()=>window.clearTimeout(timer);
  },[reset]);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    const element=event.currentTarget;const form=new FormData(element);
    const password=String(form.get('new_password')||'');
    const confirmation=String(form.get('confirm_password')||'');
    if(reset&&password!==confirmation){setError('Passwords must match.');return;}
    setBusy(true);
    try {
      const result=await api<{message:string}>(reset?'/auth/reset-password':'/auth/forgot-password',{
        method:'POST',body:JSON.stringify(reset?{token,new_password:password,confirm_password:confirmation}:{email:form.get('email')})
      });
      setMessage(result.message);setToken('');element.reset();
    } catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="auth-page"><div className="auth-story"><p className="eyebrow"><UiText value={"YOUR VISTRAH ACCOUNT"}/></p><h1><UiText value={"A fresh"}/><br/><UiText value={"start."}/></h1><p><UiText value={"Recover access securely and continue your journey."}/></p><Visual photo={pagePhoto('login')} className="auth-visual"/></div><div className="auth-form-wrap"><h2><UiText value={reset?'Choose a new password':'Forgot your password?'}/></h2>
    <p><UiText value={reset?'Choose a unique password or passphrase with at least 15 characters.':'Enter your registered email address to request a reset link.'}/></p>
    {mailConfigured===false&&<p className="notice" role="status"><UiText value={"Email recovery is not configured on this development server. Ask the administrator to configure SMTP delivery."}/></p>}
    <div aria-live="polite" aria-atomic="true">{message&&<p role="status"><UiText value={message}/></p>}</div>
    {error&&<p className="notice error" role="alert" id="recovery-error"><UiText value={error}/></p>}
    {!ready?<p role="status"><UiText value={"Checking reset link..."}/></p>:reset&&!token&&!message?<p role="alert"><UiText value={"This reset link is missing or invalid. "}/><Link href="/forgot-password"><UiText value={"Request a new link"}/></Link>.</p>:!message&&<form onSubmit={submit} className="form" aria-busy={busy}>
      {reset?<><label><UiText value={"New password"}/><input name="new_password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required aria-describedby="password-guidance"/></label><small id="password-guidance"><UiText value={"Use a unique passphrase of at least 15 characters; avoid common passwords."}/></small><label><UiText value={"Confirm password"}/><input name="confirm_password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required/></label></>:<label><UiText value={"Email address"}/><input name="email" type="email" autoComplete="email" maxLength={254} required/></label>}
      <button className="button" disabled={busy} type="submit"><UiText value={busy?'Please wait...':reset?'Reset password':'Send reset link'}/></button>
    </form>}
    {reset&&error&&<p><Link className="text-link" href="/forgot-password"><UiText value={"Request a new reset link"}/></Link></p>}
    <p><Link className="text-link" href="/login"><UiText value={"Back to sign in"}/></Link></p>
  </div></div>;
}
