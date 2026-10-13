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
export function CommerceBrowser(){const [packages,setPackages]=useState(false);const {styles}=useTheme();return <><Text style={styles.muted}>Explore products and fixed-price service packages from reviewed businesses. Unpaid test order requests are available when testing is enabled. Services requiring a quote still use enquiries.</Text><Action label="Cart" secondary onPress={()=>router.push('/commerce/cart')}/><Action label="Purchase orders" secondary onPress={()=>router.push('/commerce/orders')}/><View style={styles.row}><Action label="Products" secondary={packages} onPress={()=>setPackages(false)}/><Action label="Service packages" secondary={!packages} onPress={()=>setPackages(true)}/></View>{packages?<MemberGate><PublishedList key="packages" packages/></MemberGate>:<PublishedList key="products" packages={false}/>}</>;}
function PublishedList({packages}:{packages:boolean}){const {styles}=useTheme();const {user}=useSession();const [page,setPage]=useState(1);const result=useResource<ListingPage<CommerceListing>>('/commerce/'+(packages?'service-packages':'products')+'?page='+page,user?.id??null);
 return <>{result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:result.data?<><Heading title={packages?'Service packages':'Products'}/>{result.data.items.length?result.data.items.map(row=><View key={row.id} style={styles.card}><Heading title={row.title}/><Text style={styles.muted}>{row.business}</Text><Text style={styles.heading}>{listingPrice(row.unit_price_paise)} / unit</Text><Text style={styles.text} numberOfLines={3}>{row.description}</Text><Action label="View details" secondary onPress={()=>router.push({pathname:'/commerce/[id]',params:{id:row.id}})}/></View>):<Text style={styles.muted}>No approved {packages?'service packages':'products'} on this page yet.</Text>}<Text style={styles.muted}>Page {page} · {result.data.total} listings</Text></>:null}<View style={styles.row}><Action label="Previous page" secondary disabled={page===1||result.loading} onPress={()=>setPage(p=>p-1)}/><Action label="Next page" secondary disabled={!result.data||page*result.data.page_size>=result.data.total} onPress={()=>setPage(p=>p+1)}/></View></>;
}
export function CommerceDetail({id}:{id:string}){const {styles}=useTheme();const {user}=useSession();const result=useResource<CommerceListing>('/commerce/listings/'+encodeURIComponent(id),user?.id??null);
 if(result.loading)return <Loading/>;
 if(result.error)return <><ErrorPanel error={result.error} retry={result.retry}/>{result.error instanceof ApiError&&[401,403].includes(result.error.status)&&<Action label={user?'View membership':'Sign in'} onPress={()=>router.push(user?'/membership':'/auth')}/>}</>;
 const row=result.data;if(!row)return null;
 return <View style={styles.card}><Heading title={row.title}/><Text style={styles.muted}>{row.business} · {row.kind==='PRODUCT'?'Product':'Service package'}</Text><Text style={styles.heading}>{listingPrice(row.unit_price_paise)} / unit</Text><Text style={styles.text}>{row.description}</Text><AddToCart row={row}/>{row.service_id!==null&&<Action label="Explore this service" secondary onPress={()=>router.push({pathname:'/service/[id]',params:{id:row.service_id!}})}/>}</View>;
}
