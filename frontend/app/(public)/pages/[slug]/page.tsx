import {EditVistrahContent} from '@/components/edit-vistrah-content';
import {Suspense} from 'react';
export default async function ContentPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 return <Suspense><EditVistrahContent slug={slug} required/></Suspense>;
}
