import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {AddToCart} from './commerce-orders';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Action,Heading,Loading,ErrorPanel,MemberGate} from './ui';
import {useResource} from '../lib/resource';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
import {ApiError} from '../lib/api';
import {listingPrice,type CommerceListing,type ListingPage} from '../../../shared/commerce';
export function CommerceBrowser(){const [packages,setPackages]=useState(false);const {styles}=useTheme();return <><Text style={styles.muted}><UiText value={"Explore products and fixed-price service packages from reviewed businesses. Unpaid test order requests are available when testing is enabled. Services requiring a quote still use enquiries."}/></Text><UiElement as={Action} label="Cart" secondary onPress={()=>router.push('/commerce/cart')}/><UiElement as={Action} label="Purchase orders" secondary onPress={()=>router.push('/commerce/orders')}/><View style={styles.row}><UiElement as={Action} label="Products" secondary={packages} onPress={()=>setPackages(false)}/><UiElement as={Action} label="Service packages" secondary={!packages} onPress={()=>setPackages(true)}/></View>{packages?<MemberGate><PublishedList key="packages" packages/></MemberGate>:<PublishedList key="products" packages={false}/>}</>;}
function PublishedList({packages}:{packages:boolean}){const {styles}=useTheme();const {user}=useSession();const [page,setPage]=useState(1);const result=useResource<ListingPage<CommerceListing>>('/commerce/'+(packages?'service-packages':'products')+'?page='+page,user?.id??null);
 return <>{result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:result.data?<><UiElement as={Heading} title={packages?'Service packages':'Products'}/>{result.data.items.length?result.data.items.map(row=><View key={row.id} style={styles.card}><Heading title={row.title}/><Text style={styles.muted}>{row.business}</Text><Text style={styles.heading}>{listingPrice(row.unit_price_paise)} / unit</Text><Text style={styles.text} numberOfLines={3}>{row.description}</Text><UiElement as={Action} label="View details" secondary onPress={()=>router.push({pathname:'/commerce/[id]',params:{id:row.id}})}/></View>):<Text style={styles.muted}><UiText value={"No approved "}/><UiText value={packages?'service packages':'products'}/> <UiText value={"on this page yet."}/></Text>}<Text style={styles.muted}><UiText value={"Page "}/>{page} · {result.data.total} <UiText value={"listings"}/></Text></>:null}<View style={styles.row}><UiElement as={Action} label="Previous page" secondary disabled={page===1||result.loading} onPress={()=>setPage(p=>p-1)}/><UiElement as={Action} label="Next page" secondary disabled={!result.data||page*result.data.page_size>=result.data.total} onPress={()=>setPage(p=>p+1)}/></View></>;
}
export function CommerceDetail({id}:{id:string}){const {styles}=useTheme();const {user}=useSession();const result=useResource<CommerceListing>('/commerce/listings/'+encodeURIComponent(id),user?.id??null);
 if(result.loading)return <Loading/>;
 if(result.error)return <><ErrorPanel error={result.error} retry={result.retry}/>{result.error instanceof ApiError&&[401,403].includes(result.error.status)&&<UiElement as={Action} label={user?'View membership':'Sign in'} onPress={()=>router.push(user?'/membership':'/auth')}/>}</>;
 const row=result.data;if(!row)return null;
 return <View style={styles.card}><Heading title={row.title}/><Text style={styles.muted}>{row.business} · <UiText value={row.kind==='PRODUCT'?'Product':'Service package'}/></Text><Text style={styles.heading}>{listingPrice(row.unit_price_paise)} / unit</Text><Text style={styles.text}>{row.description}</Text><AddToCart row={row}/>{row.service_id!==null&&<UiElement as={Action} label="Explore this service" secondary onPress={()=>router.push({pathname:'/service/[id]',params:{id:row.service_id!}})}/>}</View>;
}

export {ClassifiedServices} from './customer-listing-results';
