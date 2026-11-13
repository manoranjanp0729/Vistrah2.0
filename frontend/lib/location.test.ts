import {describe,it,expect} from 'vitest';
import {LatestSearch,locationProviders,providerBlocker,requestGps,resolveAddress,validPoint,wrapPoint,radii} from './location';

describe('location privacy and provider boundary',()=>{
  it('keeps manual fallback when no map key is configured and exposes only the approved radii',()=>{
    expect(locationProviders).toEqual({tiles:null,geocoder:null});expect(radii).toEqual([2,5,10,25]);expect(providerBlocker).toContain('MapTiler API key');
  });
  it('validates ranges, nonfinite values and date-line wrapping',()=>{
    expect(validPoint({latitude:90,longitude:180})).toBe(true);
    for(const point of [{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:NaN,longitude:0},{latitude:0,longitude:Infinity}])expect(validPoint(point)).toBe(false);
    expect(wrapPoint({latitude:0,longitude:181})).toEqual({latitude:0,longitude:-179});
  });
  it('supports a replaceable mock geocoder and preserves manual fallback on error',async()=>{
    const signal=new AbortController().signal;
    await expect(resolveAddress('private address',locationProviders,signal)).rejects.toThrow('MapTiler API key');
    const fixture={latitude:12,longitude:77,locality:'Mock locality',postal_code:'560001',address:'',landmark:''};
    expect(await resolveAddress('fixture',{tiles:null,geocoder:{id:'mock',search:async()=>[fixture,{...fixture,latitude:91}]}},signal)).toEqual([fixture]);
    await expect(resolveAddress('private address',{tiles:null,geocoder:{id:'mock',search:async()=>{throw new Error('private query');}}},signal)).rejects.toThrow('manual pin');
  });
  it('GPS is requested only by invocation, with denied/unavailable recovery',async()=>{
    let calls=0;const denied={getCurrentPosition:(_success:PositionCallback,failure?:PositionErrorCallback|null)=>{calls++;failure?.({code:1} as GeolocationPositionError);}};
    expect(calls).toBe(0);await expect(requestGps(denied)).rejects.toThrow('denied');expect(calls).toBe(1);
    await expect(requestGps(undefined)).rejects.toThrow('unavailable');
  });
  it('retains GPS accuracy for explicit confirmation and rejects invalid fixes',async()=>{
    const gps=(latitude:number,accuracy:number)=>({getCurrentPosition:(success:PositionCallback)=>success({coords:{latitude,longitude:77,accuracy}} as GeolocationPosition)});
    expect(await requestGps(gps(12,1200))).toEqual({point:{latitude:12,longitude:77},accuracy:1200});
    await expect(requestGps(gps(NaN,10))).rejects.toThrow('invalid');
  });
  it('ignores stale filter responses even when the provider ignores abort',async()=>{
    const gate=new LatestSearch();let oldResolve!:(value:string)=>void;let firstSignal!:AbortSignal;
    const old=gate.run(signal=>{firstSignal=signal;return new Promise<string>(resolve=>{oldResolve=resolve;});});
    const current=await gate.run(async()=> 'new radius/location');expect(firstSignal.aborted).toBe(true);
    oldResolve('stale');expect(await old).toEqual({current:false});expect(current).toEqual({current:true,value:'new radius/location'});
  });
  it('clear cancels inflight responses and suppresses their stale errors',async()=>{
    const gate=new LatestSearch();let reject!:(error:Error)=>void;
    const pending=gate.run(()=>new Promise((_,fail)=>{reject=fail;}));gate.cancel();reject(new Error('late provider failure'));
    expect(await pending).toEqual({current:false});
  });
});

