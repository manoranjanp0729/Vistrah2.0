import {CatalogueRequestForm} from '@/components/catalogue-request';
export const metadata={title:'Request catalogue addition'};
export default async function CatalogueRequestPage({searchParams}:{searchParams:Promise<{level?:string;parent?:string}>}) {
 const params=await searchParams;
 const level=params.level==='subcategory'||params.level==='service'?params.level:'category';
 return <main className="container page"><h1>Request a new {level}</h1><CatalogueRequestForm level={level} parent={typeof params.parent==='string'?params.parent:''}/></main>;
}
