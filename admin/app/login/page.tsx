'use client';
import {useState,type FormEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense} from 'react';
import {api} from '@/lib/api';
function Login(){const router=useRouter(),params=useSearchParams();const [error,setError]=useState(''),[busy,setBusy]=useState(false);
async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError('');try{await api('/auth/login',{method:'POST',body:JSON.stringify({email:form.get('email'),password:form.get('password')})});const requested=params.get('next')||'/admin';const next=/^\/admin(?:\/[a-z-]+)?$/.test(requested)?requested:'/admin';router.replace(next);router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
return <main className="container page" style={{maxWidth:480}}><p className="eyebrow">VISTRAH ADMIN</p><h1>Administrator sign in</h1><p>Use your existing administrator account.</p>{error&&<p role="alert" className="notice">{error}</p>}<form className="form" onSubmit={submit}><label>Email address<input type="email" name="email" autoComplete="email" maxLength={254} required/></label><label>Password<input type="password" name="password" autoComplete="current-password" maxLength={128} required/></label><button className="button" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></main>;}
export default function LoginPage(){return <Suspense fallback={<main className="container page">Loading…</main>}><Login/></Suspense>;}
