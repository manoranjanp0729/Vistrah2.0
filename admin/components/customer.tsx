'use client';
import {useState,useEffect} from 'react';
import {api,ApiError} from '@/lib/api';
import type {User} from '@/lib/types';
export function useUser(){const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');useEffect(()=>{let active=true;api<User>('/me').then(value=>{if(active)setUser(value);}).catch(e=>{if(active&&(!(e instanceof ApiError)||e.status!==401))setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);return {user,loading,error};}
export function AuthGate({children}:{children:(user:User)=>React.ReactNode;next?:string}){const {user,loading,error}=useUser();if(loading)return <p role="status">Loading…</p>;if(error)return <p role="alert">{error}</p>;if(!user||user.role!=='ADMIN')return <p>Administrator access required. <a href="/login">Sign in</a></p>;return <>{children(user)}</>;}
