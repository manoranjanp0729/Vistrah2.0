import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import catalogue from '../../shared/catalogue.json';
import {photos,categoryPhoto,servicePhoto,subcategoryPhoto,imageRegistry,imageFor,adminPhoto,accountPhoto} from './imagery';
import type {Category,ServiceContext} from './types';

describe('bundled photography and catalogue coverage',()=>{
  it('decodes every local WebP and verifies its dimensions, hash and source provenance',async()=>{
    for(const asset of Object.values(photos)){
      expect(asset.src).toMatch(/^\/images\/photos\/[a-z-]+\.webp$/);
      const file=await readFile(new URL(`../public${asset.src}`,import.meta.url));
      const metadata=await sharp(file).metadata();
      expect(metadata.format).toBe('webp');
      expect([metadata.width,metadata.height]).toEqual([asset.width,asset.height]);
      expect(createHash('sha256').update(file).digest('hex')).toBe(asset.sha256);
      expect(['unsplash.com','www.pexels.com']).toContain(new URL(asset.source).hostname);
      expect(asset.alt.length).toBeGreaterThan(20);
      expect(asset.position).toMatch(/^\d+% \d+%$/);
    }
  });
  it('covers all 8 categories, 1 subcategory and 59 services, with 57 unique photos and 2 explicit gaps',()=>{
    const categories=catalogue as unknown as Category[];
    expect(new Set(categories.map(c=>categoryPhoto(c).photo)).size).toBe(8);
    const selections=[];
    let count=0,subcategories=0;
    for(const category of categories){
      for(const context of [...category.services.map(service=>({category,service})),...category.subcategories.flatMap(subcategory=>subcategory.services.map(service=>({category,subcategory,service})))]){
        const entry=servicePhoto(context);
        expect(imageRegistry[entry.id]).toBe(entry);
        if(entry.photo){expect(photos[entry.photo]).toBeDefined();selections.push(entry.photo);}
        else expect(entry.missingReason).toContain('specialist product');
        count++;
      }
      for(const sub of category.subcategories){expect(subcategoryPhoto(category,sub).photo).toBe('outdoor');subcategories++;}
    }
    expect(count).toBe(59);
    expect(subcategories).toBe(1);
    expect(selections.length).toBe(57);
    expect(new Set(selections).size).toBe(57);
  });
  it('resolves stable composite identifiers despite title, numeric ID or legacy image changes',()=>{
    const category={...catalogue[5],image:'/images/technology.svg'} as unknown as Category;
    const service={...category.services[0],image:'/images/finance.svg'};
    const context={category,service} as ServiceContext;
    expect(servicePhoto(context).photo).toBe('technology');
    expect(servicePhoto({...context,service:{...service,id:999,title:'Changed title',image:'https://untrusted.invalid/private.png'}})).toBe(servicePhoto(context));
    expect(categoryPhoto({...category,image:'https://untrusted.invalid/private.png'}).photo).toBe('technology');
    expect(categoryPhoto({slug:'custom-assistance',image:'/images/property.svg'}).photo).toBeNull();
    expect(servicePhoto({...context,category:{...category,slug:'different-category'}}).photo).toBeNull();
  });
  it('never substitutes a generic photograph for an unknown subject or operational section',()=>{
    for(const entry of [imageFor('toString'),imageFor('service/unknown'),adminPhoto('new-section'),accountPhoto('new-section')]){
      expect(entry.photo).toBeNull();expect(entry.missingReason).toBeTruthy();
    }
    expect(adminPhoto('workflows').photo).toBe('development-operations');
    expect(adminPhoto('').photo).toBe('market-analysis');
  });
});
