import {useEffect,useState} from 'react';
import {api} from './api';
import {directMarketplace,type DirectCatalogue} from '../../../shared/direct-service-types';

export function useDirectMarketplace() {
  const [catalogue,setCatalogue]=useState<DirectCatalogue|null>(null);
  useEffect(()=>{let alive=true;void api<DirectCatalogue>('/marketplace/service-types').then(data=>{if(alive)setCatalogue(data);}).catch(()=>{});return()=>{alive=false;};},[]);
  return directMarketplace(catalogue);
}
