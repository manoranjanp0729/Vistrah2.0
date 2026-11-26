import {Redirect,Unmatched,usePathname} from 'expo-router';
import {membershipRoute} from '../lib/website-routes';

export default function NotFound(){
 const destination=membershipRoute(usePathname());
 return destination?<Redirect href={destination}/>:<Unmatched/>;
}
