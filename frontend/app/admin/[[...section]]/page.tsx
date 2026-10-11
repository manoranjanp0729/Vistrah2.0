import {redirect} from 'next/navigation';
export default async function AdminRedirect({params}:{params:Promise<{section?:string[]}>}){const {section=[]}=await params;const base=process.env.ADMIN_APP_URL||'http://localhost:3200';redirect(base.replace(/\/$/,'')+'/admin'+(section.length?'/'+section.map(encodeURIComponent).join('/') :''));}
