"""Build the final two-level business taxonomy without database writes.

Subcategory wrappers are an internal compatibility shape: every wrapper contains
one identically named type. They never introduce another user navigation step.
Add new initial types in shared/final-service-taxonomy.json; approved custom
database service types are handled by the runtime catalogue.
"""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
SHARED=ROOT/'shared'

def build():
    source=json.loads((SHARED/'final-service-taxonomy.json').read_text(encoding='utf-8'))
    categories=source['categories']
    assert len(categories)==10
    assert len({c['slug'] for c in categories})==10
    assert all(c['types'] for c in categories)
    taxonomy=[]
    business=[]
    presets=[]
    icons=['coffee','home','truck','camera','heart','book','scissors','tool','truck','layers']
    seen=set()
    for cat in categories:
        types=[]
        children=[]
        for order, item in enumerate(cat['types'],1):
            assert item['slug'] not in seen
            seen.add(item['slug'])
            children.append(dict(slug=item['slug'],title=item['title'],order=order,listing_types=[item]))
            types.append(dict(slug=item['slug'],listing_type_slug=item['slug'],subcategory_slug=None,subcategory_title=item['title'],title=item['title'],description=f"{item['title']} in {cat['title']}.",keywords=[item['title'],cat['title']]))
            if cat['slug'] in ('restaurants-and-dining', 'hospitals-and-labs'):
                types[-1]['regulated']='fssai' if cat['slug']=='restaurants-and-dining' else 'medical'
        taxonomy.append(dict(slug=cat['slug'],title=cat['title'],description=cat['description'],order=cat['order'],subcategories=children))
        business.append(dict(slug=cat['slug'],title=cat['title'],description=cat['description'],types=types))
        website=cat['website']
        presets.append(dict(order=cat['order'],slug=cat['slug'],title=cat['title'],shortTitle=cat['title'],description=cat['description'],icon=icons[cat['order']-1],heroImage='/images/category-heroes/'+cat['hero']+'.webp',defaultSubcategorySlug=cat['types'][0]['slug'],defaultTypeSlug=cat['types'][0]['slug'],serviceTypes=cat['types'],website_pattern=dict(pattern_id=cat['slug']+'-website',pattern_title='Sample Website Made for Your Business: '+website['title'],layout_archetype=website['description'],hero_headline_template='{business_name} in {city}',key_sections=website['sections'],conversion_cta=website['cta']),vertical_strategy=dict(plan_heading='Simple 3-Step Plan to Get More Customers',summary=cat['description'],funnel_steps=['Show '+website['sections'][0].lower()+' with accurate business details and your map location.','Share '+website['sections'][1].lower()+' on your website and free local V Ads.','Invite customers to '+website['cta'].lower()+' and follow up on their enquiries.'],recommended_pillar_ids=['vistrah_presence','hyperlocal_v_ads','dedicated_website'])))
    regulations=source['regulations']
    outputs={
        SHARED/'marketplace-taxonomy.json':dict(version=5,categories=taxonomy),
        SHARED/'business-types.json':dict(version=5,regulations=regulations,categories=business),
        SHARED/'marketplace-imagery.json':json.loads((SHARED/'final-service-imagery.json').read_text(encoding='utf-8')),
        SHARED/'marketplace-legacy-map.json':dict(version=5,categories={},subcategories={},triples={},catalogue_services={},retained_catalogue_categories=[]),
        SHARED/'final-sector-presets.json':presets,
    }
    return {p:json.dumps(d,ensure_ascii=False,indent=2)+'\n' for p,d in outputs.items()}

def main():
    stale=[]
    for path,content in build().items():
        if not path.exists() or path.read_text(encoding='utf-8')!=content:
            stale.append(str(path.relative_to(ROOT)))
            if '--check' not in sys.argv:path.write_text(content,encoding='utf-8')
    if '--check' in sys.argv and stale:raise SystemExit('Stale generated taxonomy: '+', '.join(stale))
    print('10 categories / 30 direct service types; no database changes')

if __name__=='__main__':main()
