'use client';
import {UiText,UiSection} from "./localized-ui";
import {useState,type FormEvent} from 'react';
import {api} from '@/lib/api';
import {MapFirstLocationPicker} from './vistrah-google-maps';
import {SELLER_COVERAGE_RADII,type SelectedLocation} from '../../shared/selected-location';

export function BusinessLocationEditor({businessId,latitude,longitude,grants,onSaved}:{businessId:number;latitude?:number|null;longitude?:number|null;grants:{service_id:number;approval_status:string;coverage_radius_km?:number|null}[];onSaved:()=>Promise<void>}){
  const [selected,setSelected]=useState<SelectedLocation>({
    latitude:latitude??12.9716,
    longitude:longitude??77.5946,
    formattedAddress:latitude&&longitude?`Pinned at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`:'Bengaluru, Karnataka',
    locality:'Business Location',
    city:'Bengaluru',
    state:'Karnataka',
    pincode:'',
    landmark:'',
    radiusKm:grants[0]?.coverage_radius_km??10,
    source:'manual',
  });
  const [serviceId,setServiceId]=useState<number>(grants[0]?.service_id??0);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function saveBusinessPin(confirmed:SelectedLocation){
    setBusy(true);
    setMessage('');
    try{
      await api(`/seller/businesses/${businessId}/publication-drafts`,{
        method:'POST',
        body:JSON.stringify({business_pin:{latitude:confirmed.latitude,longitude:confirmed.longitude}}),
      });
      await onSaved();
      setMessage('Business pin draft saved. Submit it for independent review before publication.');
    }catch(e){
      setMessage((e as Error).message);
    }finally{
      setBusy(false);
    }
  }

  async function saveCoverage(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!serviceId)return;
    setBusy(true);
    setMessage('');
    try{
      await api(`/seller/businesses/${businessId}/publication-drafts`,{
        method:'POST',
        body:JSON.stringify({service_id:serviceId,coverage:{coverage_radius_km:selected.radiusKm}}),
      });
      await onSaved();
      setMessage('Service coverage radius draft saved.');
    }catch(e){
      setMessage((e as Error).message);
    }finally{
      setBusy(false);
    }
  }

  return (
    <UiSection aria-label="Business location drafts">
      <h4><UiText value={"Business pin and service coverage"}/></h4>
      <p><UiText value={"Search your business address, tap a Karnataka city chip, or pan the map pin to set your physical business location and coverage radius."}/></p>
      {message&&<p className="notice" role="status"><UiText value={message}/></p>}

      <MapFirstLocationPicker
        mode="seller"
        value={selected}
        onChange={setSelected}
        onConfirm={confirmed=>void saveBusinessPin(confirmed)}
        confirmLabel="Confirm & Save Business Pin Draft"
        radiusOptions={SELLER_COVERAGE_RADII}
        disabled={busy}
        busy={busy}
        preferBackendDetails
        secondaryActions={
          grants.length>0?(
            <form className="form" onSubmit={event=>void saveCoverage(event)} style={{paddingTop:10,borderTop:'1px solid var(--hairline, var(--border))'}}>
              <label>
                <UiText value={"Apply selected coverage radius ("}/>{selected.radiusKm} <UiText value={"km) to service listing"}/>
                <select name="service_id" value={serviceId} onChange={e=>setServiceId(Number(e.target.value))} required>
                  {grants.map(grant=>(
                    <option value={grant.service_id} key={grant.service_id}>
                      Service #{grant.service_id} · {grant.approval_status}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" disabled={busy}>
                <UiText value={"Save service coverage draft"}/>
              </button>
            </form>
          ):undefined
        }
      />
    </UiSection>
  );
}
