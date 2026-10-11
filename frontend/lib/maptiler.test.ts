import {afterEach,describe,expect,it,vi} from 'vitest';
import {placeLabel,previewTiles,reversePlace} from './maptiler';
const fixture={features:[{id:'address.1',text:'Private street number',context:[{id:'neighbourhood.2',text:'Indiranagar'},{id:'municipality.3',text:'Bengaluru'},{id:'postal_code.4',text:'560038'}]}]};
afterEach(()=>vi.unstubAllGlobals());
describe('MapTiler location boundary',()=>{
 it('labels area and city without copying a street address or inventing a PIN',()=>{expect(placeLabel(fixture)).toEqual({label:'Indiranagar, Bengaluru',city:'Bengaluru',postal_code:'560038'});expect(placeLabel({features:[{id:'municipality.1',text:'Bengaluru'}]})).toEqual({label:'Bengaluru',city:'Bengaluru',postal_code:''});expect(()=>placeLabel({features:[]})).toThrow('manually');});
 it('does not contact the provider for missing configuration or invalid coordinates',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await expect(reversePlace({latitude:91,longitude:0},'key')).rejects.toThrow('Invalid');await expect(reversePlace({latitude:12,longitude:77},'')).rejects.toThrow('configured');expect(fetch).not.toHaveBeenCalled();});
 it('uses longitude then latitude and returns only a label; provider errors do not leak keys',async()=>{const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>fixture});vi.stubGlobal('fetch',fetch);expect(await reversePlace({latitude:12.3,longitude:77.4},'fixture-key')).toEqual(placeLabel(fixture));expect(fetch.mock.calls[0][0]).toContain('/77.4,12.3.json?');fetch.mockResolvedValue({ok:false});await expect(reversePlace({latitude:12.3,longitude:77.4},'fixture-key')).rejects.toThrow('lookup is unavailable');});
 it('wraps preview tiles across the date line and clips polar indices',()=>{for(const longitude of [-180,180]){const tiles=previewTiles({latitude:90,longitude},320,220,4);expect(tiles.length).toBeGreaterThan(0);expect(tiles.every(tile=>tile.x>=0&&tile.x<16&&tile.y>=0&&tile.y<16&&Number.isFinite(tile.left))).toBe(true);}});
});
