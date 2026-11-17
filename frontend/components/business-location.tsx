'use client';
import {UiText,UiSection} from "./localized-ui";
import {useState,type FormEvent} from 'react';
import {api} from '@/lib/api';
import {PlaceAutocompleteInput,VistrahMap} from './vistrah-google-maps';
import {providerBlocker,type Point} from '@/lib/location';

export function BusinessLocationEditor({businessId,latitude,longitude,grants,onSaved}:{businessId:number;latitude?:number|null;longitude?:number|null;grants:{service_id:number;approval_status:string;coverage_radius_km?:number|null}[];onSaved:()=>Promise<void>}){
  const [pin,setPin]=useState<Point>({latitude:latitude??12.9716,longitude:longitude??77.5946});
  const [previewRadiusKm,setPreviewRadiusKm]=useState<number>(grants[0]?.coverage_radius_km??10);
  const [resolvedAddress,setResolvedAddress]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function save(event:FormEvent<HTMLFormElement>,coverage=false){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    setBusy(true);
    setMessage('');
    try{
      await api(`/seller/businesses/${businessId}/publication-drafts`,{
        method:'POST',
        body:JSON.stringify(coverage?{service_id:Number(form.get('service_id')),coverage:{coverage_radius_km:Number(form.get('coverage_radius_km'))}}:{business_pin:pin}),
      });
      await onSaved();
      setMessage('Location draft saved. Submit it for independent review before publication.');
    }catch(e){
      setMessage((e as Error).message);
    }finally{
      setBusy(false);
    }
  }

  return (
    <UiSection aria-label="Business location drafts">
      <h4><UiText value={"Business pin and service coverage"}/></h4>
      <p>{providerBlocker}</p>
      <p><UiText value={"Search your business address or drag the gold pin to set your exact physical location. Each service has its own reviewed circular coverage radius around that pin."}/></p>
      <p role="status"><UiText value={message}/></p>

      <div style={{display:'grid',gap:12,marginBottom:12}}>
        <PlaceAutocompleteInput
          label="Search business address or landmark"
          placeholder="Search street, area, or PIN code in India"
          disabled={busy}
          preferBackendDetails
          onSelectPlace={place=>{
            setPin({latitude:Number(place.latitude.toFixed(6)),longitude:Number(place.longitude.toFixed(6))});
            setResolvedAddress(place.formattedAddress||place.locality);
          }}
        />
        {resolvedAddress&&<small className="tabular-nums">Selected address: {resolvedAddress}</small>}
        <VistrahMap
          center={pin}
          radiusKm={previewRadiusKm>0?previewRadiusKm:undefined}
          editable
          disabled={busy}
          height={320}
          autoReverseGeocode
          onPinChange={setPin}
          onResolvedAddress={place=>setResolvedAddress(place.formattedAddress||place.locality)}
          ariaLabel="Business pin picker map"
        />
      </div>

      <form className="form" onSubmit={event=>void save(event)}>
        <label><UiText value={"Business latitude"}/><input type="number" step="any" min={-90} max={90} value={pin.latitude} required onChange={event=>setPin(previous=>({...previous,latitude:Number(event.target.value)}))}/></label>
        <label><UiText value={"Business longitude"}/><input type="number" step="any" min={-180} max={180} value={pin.longitude} required onChange={event=>setPin(previous=>({...previous,longitude:Number(event.target.value)}))}/></label>
        <button className="button" disabled={busy}><UiText value={"Save business pin draft"}/></button>
      </form>
      {!!grants.length&&(
        <form className="form" onSubmit={event=>void save(event,true)}>
          <label><UiText value={"Service coverage listing"}/><select name="service_id" required>{grants.map(grant=><option value={grant.service_id} key={grant.service_id}><UiText value={"Service #"}/>{grant.service_id} · {grant.approval_status}</option>)}</select></label>
          <label><UiText value={"Coverage radius from business pin (km)"}/><input name="coverage_radius_km" type="number" step="any" min={0.001} max={500} value={previewRadiusKm} onChange={e=>setPreviewRadiusKm(Number(e.target.value)||0)} required/></label>
          <button className="button" disabled={busy}><UiText value={"Save service coverage draft"}/></button>
        </form>
      )}
    </UiSection>
  );
}
