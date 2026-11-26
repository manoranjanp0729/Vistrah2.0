import {describe,it,expect,vi} from 'vitest';
import {categoryFeeds,exploreListings} from './explore';
import type {Vacancy} from './discovery';
describe('Category Explore integration',()=>{
  it('never calls an external or jobs source for disabled and unknown categories',async()=>{
    const read=vi.fn();
    for(const slug of [...Object.keys(categoryFeeds),'new-category']) {
      const result=await exploreListings(slug,read);
      expect(result.status).toBe('unavailable');expect(result.vacancies).toEqual([]);
      expect(result.note).toContain('No authorized feed');
    }
    expect(Object.values(categoryFeeds).every(feed=>!feed.enabled&&feed.permissionEvidence===null)).toBe(true);
    expect(read).not.toHaveBeenCalled();
  });
  it('reuses cache records without changing provenance, publication or retrieval time',async()=>{
    const items=Array.from({length:4},(_,i)=>({id:String(i),published_at:'2026-09-01',retrieved_at:'2026-09-03T12:00:00Z',provenance:[{source:'remotive',source_record_id:String(i),source_url:`https://remotive.com/remote-jobs/${i}`,retrieved_at:'2026-09-03T12:00:00Z',attribution:'Remotive'}]})) as Vacancy[];
    const read=vi.fn().mockResolvedValue({items,total:19,note:'Source open status unconfirmed.'});
    const result=await exploreListings('jobs-careers',read);
    expect(read).toHaveBeenCalledTimes(1);expect(result.status).toBe('available');
    expect(result.total).toBe(19);expect(result.vacancies).toHaveLength(3);
    expect(result.vacancies[0]).toBe(items[0]);expect(result.vacancies[0].provenance).toBe(items[0].provenance);
  });
  it('distinguishes a successful empty cache from an unavailable cache',async()=>{
    const empty=await exploreListings('jobs-careers',async()=>({items:[],total:0,note:'No cached records'}));
    expect(empty.status).toBe('empty');
    const failure=await exploreListings('jobs-careers',async()=>{throw new Error('Timeout');});
    expect(failure.status).toBe('unavailable');expect(failure.note).toContain('temporarily unavailable');
    expect(failure.vacancies).toEqual([]);
  });
});
