import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {PhotoCard} from '../components/photo-card';
import {photoCardDesign,twoRowColumns} from '../../shared/photo-card-design';
import imagery from '../../shared/marketplace-imagery.json';
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
describe('One premium photo-card design',()=>{
  it('renders the exact same card shell and dimensions for every discovery level',()=>{
    const html=(['category','subcategory','type','service'] as const).map(kind=>renderToStaticMarkup(createElement(PhotoCard,{kind,slug:'fixture',title:'A complete classification title',meta:'Classification',href:'/services',photo:{src:'/images/marketplace/pet-care.webp',alt:'Two puppies'}})));
    const shells=html.map(source=>source.match(/class="([^"]+)"/g));
    for(const shell of shells)expect(shell).toEqual(shells[0]);
    for(const source of html){expect(source).toContain('--card-width:148px');expect(source).toContain('--card-height:168px');expect(source).toContain('--image-height:86px');expect(source).toContain('aria-label="A complete classification title"');}
  });
  it('preserves canonical item photo coverage and avoids a universal parent fallback',()=>{
    expect(Object.keys(imagery.items)).toHaveLength(889);
    for(const [id,item] of Object.entries(imagery.items)){if(item.photo===null)expect(id).toContain('/agriculture-and-farming');else expect(Object.hasOwn(imagery.assets,item.photo)).toBe(true);}
  });
  it('renders unavailable imagery without a broken image',()=>{const html=renderToStaticMarkup(createElement(PhotoCard,{kind:'category',slug:'agriculture-and-farming',title:'Agriculture & Farming',meta:'9 subcategories',href:'/services?category=agriculture-and-farming',photo:null}));expect(html).toContain('Photograph unavailable');expect(html).not.toContain('<img');});
  it('keeps odd rail items and defines two title lines and two shared rows',()=>{
    expect(twoRowColumns([1,2,3,4,5])).toEqual([[1,2],[3,4],[5]]);
    expect(photoCardDesign.titleLines).toBe(2);expect(photoCardDesign.rows).toBe(2);
  });
});
