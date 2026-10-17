import {useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {ToggleChoice} from '../../components/requirement-form';
import {useResource} from '../../lib/resource';
import {allServices,type Category} from '../../lib/catalogue';
import {api} from '../../lib/api';
import {useTheme} from '../../lib/theme';
import {resolveMarketplaceSelection} from '../../lib/marketplace';

type SelectionMap=Record<number,number[]>;

export default function NewApplication(){
  const params=useLocalSearchParams<{business?:string;categorySlug?:string;subcategorySlug?:string;typeSlug?:string}>();
  return <Page><Heading title="New business / service application"/><SellerGate><NewApplicationForm business={params.business} categorySlug={params.categorySlug} subcategorySlug={params.subcategorySlug} typeSlug={params.typeSlug}/></SellerGate></Page>;
}

function NewApplicationForm({business,categorySlug,subcategorySlug,typeSlug}:{business?:string;categorySlug?:string;subcategorySlug?:string;typeSlug?:string}){
  const {styles}=useTheme();
  const catalogue=useResource<Category[]>('/catalogue');
  const [expanded,setExpanded]=useState<number|null>(null);
  const [selected,setSelected]=useState<SelectionMap>({});
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [createdCount,setCreatedCount]=useState(0);
  const normalize=(value:string)=>value.toLocaleLowerCase().replace(/[^a-z0-9]/g,'');
  const marketplace=resolveMarketplaceSelection({category:categorySlug,subcategory:subcategorySlug,type:typeSlug});

  useEffect(()=>{
    if(!catalogue.data||!categorySlug||!marketplace?.category)return;
    const match=catalogue.data.find(item=>item.slug===categorySlug||normalize(item.title)===normalize(marketplace.category!.title));
    if(!match)return;
    setExpanded(match.id);
    if(marketplace.listingType){
      const candidates=allServices([match]).filter(item=>item.service.slug===marketplace.listingType!.slug||normalize(item.service.title)===normalize(marketplace.listingType!.title));
      if(candidates.length===1)setSelected(previous=>({...previous,[match.id]:Array.from(new Set([...(previous[match.id]??[]),candidates[0].service.id]))}));
    }
  },[catalogue.data,categorySlug,subcategorySlug,typeSlug]);

  const groups=(catalogue.data??[]).filter(category=>(selected[category.id]??[]).length>0);
  const total=groups.reduce((count,category)=>count+(selected[category.id]??[]).length,0);
  const toggleService=(categoryId:number,serviceId:number)=>{
    setSelected(previous=>{
      const chosen=previous[categoryId]??[];
      const next=chosen.includes(serviceId)?chosen.filter(id=>id!==serviceId):chosen.length<15?[...chosen,serviceId]:chosen;
      return {...previous,[categoryId]:next};
    });
    setError('');
  };

  async function create(){
    if(!groups.length){setError('Choose at least one service in one or more categories.');return;}
    setBusy(true);setError('');setCreatedCount(0);
    let created=0;
    let firstId='';
    try{
      for(const category of groups){
        const result=await api<{id:string}>('/provider-applications',{
          method:'POST',
          body:JSON.stringify({category_id:category.id,service_ids:selected[category.id],...(business?{provider_id:Number(business)}:{})})
        });
        if(!firstId)firstId=result.id;
        created++;
        setCreatedCount(created);
      }
      if(groups.length===1)router.replace({pathname:'/provider-applications/[id]',params:{id:firstId}});
      else router.replace('/provider-applications');
    }catch(e){
      // Each category creates a separate draft on the server. Never retry completed groups automatically.
      if(created){
        setSelected(previous=>{
          const pending={...previous};
          for(const category of groups.slice(0,created))delete pending[category.id];
          return pending;
        });
      }
      setError(`${created} draft application(s) created. ${(e as Error).message} Review existing drafts before retrying the remaining selections.`);
    }finally{setBusy(false);}
  }

  return <>
    <Text style={styles.muted}>{business?'Add services to your owned business.':'Select services across multiple categories. Each category creates a separate draft for business details and administrator review.'}</Text>
    {Boolean(error)&&<ErrorPanel error={error}/>}
    {createdCount>0&&<Text style={styles.muted}>{createdCount} draft application(s) created.</Text>}
    {categorySlug&&!catalogue.loading&&catalogue.data&&!catalogue.data.some(item=>item.slug===categorySlug||normalize(item.title)===normalize(marketplace?.category?.title??''))&&
      <Text style={styles.muted}>This marketplace category is not yet mapped to a seller-service category. Select an available category below; nothing has been submitted for the unmatched category.</Text>}
    {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<>
      <Heading title="Select categories and services"/>
      {(catalogue.data??[]).map(category=>{
        const chosen=selected[category.id]??[];
        const open=expanded===category.id;
        return <View key={category.id} style={{gap:8}}>
          <ToggleChoice label={`${category.title}${chosen.length?` (${chosen.length} selected)`:''}`} selected={open} disabled={busy} onPress={()=>setExpanded(open?null:category.id)}/>
          {open&&<View style={{gap:6,paddingLeft:10}}>
            {allServices([category]).filter(item=>item.service.active).map(({service})=><ToggleChoice key={service.id} label={service.title} selected={chosen.includes(service.id)} disabled={busy||(!chosen.includes(service.id)&&chosen.length>=15)} onPress={()=>toggleService(category.id,service.id)}/>)}
            {!allServices([category]).some(item=>item.service.active)&&<Text style={styles.muted}>No active services currently available in this category.</Text>}
          </View>}
        </View>;
      })}
      <Text style={styles.muted}>{groups.length} categories · {total} services selected. Maximum 15 services per category.</Text>
      <Action label={busy?'Creating drafts…':groups.length>1?`Create ${groups.length} draft applications`:'Continue to details form'} disabled={busy||!groups.length} onPress={()=>void create()}/>
      {groups.length>1&&<Text style={styles.muted}>Drafts are saved individually. Complete and submit each one for administrator approval; partial failures may leave some drafts already created.</Text>}
      <Action secondary label="View existing applications" disabled={busy} onPress={()=>router.push('/provider-applications')}/>
    </>}
  </>;
}
