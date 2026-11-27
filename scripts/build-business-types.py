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
    legacy_categories={
        'food-and-dining':'restaurants-and-dining',
        'hospitality-restaurants-and-cafes':'restaurants-and-dining',
        'restaurants':'restaurants-and-dining',
        'dining':'restaurants-and-dining',
        'food-beverages':'restaurants-and-dining',
        'cafes-and-restaurants':'restaurants-and-dining',
        'travel-and-stay':'hotels-and-stay',
        'travel-stay-and-experiences':'hotels-and-stay',
        'hospitality-and-stays':'hotels-and-stay',
        'accommodations':'hotels-and-stay',
        'lodging':'hotels-and-stay',
        'automobiles-and-garages':'vehicle-rentals',
        'vehicles':'vehicle-rentals',
        'automobiles':'vehicle-rentals',
        'rental-services':'vehicle-rentals',
        'transport-and-rentals':'vehicle-rentals',
        'car-and-bike-rentals':'vehicle-rentals',
        'events-and-weddings':'event-management',
        'events-weddings-and-media':'event-management',
        'events-and-celebrations':'event-management',
        'weddings-and-events':'event-management',
        'health-and-fitness':'hospitals-and-labs',
        'health-fitness-and-wellness':'hospitals-and-labs',
        'healthcare':'hospitals-and-labs',
        'medical-and-diagnostics':'hospitals-and-labs',
        'hospitals-clinics-and-labs':'hospitals-and-labs',
        'pet-care':'hospitals-and-labs',
        'education-and-coaching':'education-and-skills',
        'overseas-education-and-skill-academies':'education-and-skills',
        'coaching-and-tuitions':'education-and-skills',
        'training-and-skills':'education-and-skills',
        'jobs-and-careers':'education-and-skills',
        'salons-bridal-and-wellness':'salons-and-beauty-parlour',
        'beauty-and-personal-care':'salons-and-beauty-parlour',
        'beauty-fashion-and-lifestyle':'salons-and-beauty-parlour',
        'wellness-and-spas':'salons-and-beauty-parlour',
        'grooming-and-salons':'salons-and-beauty-parlour',
        'civil-construction-and-contractors':'civil-and-construction',
        'property-and-construction':'civil-and-construction',
        'construction-and-materials':'civil-and-construction',
        'real-estate-and-property':'civil-and-construction',
        'interior-design-and-exteriors':'civil-and-construction',
        'home-services':'civil-and-construction',
        'home-and-everyday-services':'civil-and-construction',
        'professional-services':'civil-and-construction',
        'legal-tax-and-business-compliance':'civil-and-construction',
        'it-media-and-printing':'civil-and-construction',
        'shopping-and-local-retail':'civil-and-construction',
        'shops-and-retail':'civil-and-construction',
        'agriculture-and-farming':'civil-and-construction',
        'automobiles-and-ev':'fuel-and-charging-stations',
        'ev-and-fuel':'fuel-and-charging-stations',
        'fuel-stations':'fuel-and-charging-stations',
        'charging-stations':'fuel-and-charging-stations',
        'entertainment-and-nightlife':'vibe-finder',
        'events-and-experiences':'vibe-finder',
        'sports-and-recreation':'vibe-finder',
        'leisure-and-vibes':'vibe-finder',
    }
    raw_type_aliases={
        'restaurants':('restaurants-and-dining','restaurant'),
        'fine-dining':('restaurants-and-dining','restaurant'),
        'mess-and-dhaba':('restaurants-and-dining','restaurant'),
        'darshini':('restaurants-and-dining','restaurant'),
        'hotels-and-restaurants':('restaurants-and-dining','restaurant'),
        'cafe':('restaurants-and-dining','cafes'),
        'coffee-shops':('restaurants-and-dining','cafes'),
        'cafes-and-bakeries':('restaurants-and-dining','cafes'),
        'pub':('restaurants-and-dining','pubs'),
        'bars-and-pubs':('restaurants-and-dining','pubs'),
        'lounges-and-pubs':('restaurants-and-dining','pubs'),
        'microbreweries':('restaurants-and-dining','pubs'),
        'street-food-and-quick-bites':('restaurants-and-dining','street-food'),
        'fast-food':('restaurants-and-dining','street-food'),
        'chaat-and-snacks':('restaurants-and-dining','street-food'),
        'bakery':('restaurants-and-dining','bakeries-and-desserts'),
        'bakeries':('restaurants-and-dining','bakeries-and-desserts'),
        'desserts':('restaurants-and-dining','bakeries-and-desserts'),
        'cloud-kitchens':('restaurants-and-dining','cloud-kitchens-and-tiffins'),
        'tiffin-services':('restaurants-and-dining','cloud-kitchens-and-tiffins'),
        'tiffins':('restaurants-and-dining','cloud-kitchens-and-tiffins'),
        'juice-bars':('restaurants-and-dining','juice-and-ice-cream-bars'),
        'ice-cream-parlours':('restaurants-and-dining','juice-and-ice-cream-bars'),
        'hotel':('hotels-and-stay','hotels'),
        'business-hotels':('hotels-and-stay','hotels'),
        'homestay':('hotels-and-stay','homestays'),
        'villas-and-homestays':('hotels-and-stay','homestays'),
        'resort':('hotels-and-stay','resorts'),
        'nature-resorts':('hotels-and-stay','resorts'),
        'pg':('hotels-and-stay','pgs-and-hostels'),
        'pgs':('hotels-and-stay','pgs-and-hostels'),
        'hostels':('hotels-and-stay','pgs-and-hostels'),
        'paying-guest':('hotels-and-stay','pgs-and-hostels'),
        'serviced-apartments':('hotels-and-stay','service-apartments'),
        'lodges':('hotels-and-stay','guest-houses-and-lodges'),
        'guest-houses':('hotels-and-stay','guest-houses-and-lodges'),
        'car-rentals':('vehicle-rentals','cars'),
        'self-drive-cars':('vehicle-rentals','cars'),
        'car-hire':('vehicle-rentals','cars'),
        'bike-rentals':('vehicle-rentals','bikes'),
        'two-wheeler-rentals':('vehicle-rentals','bikes'),
        'scooter-rentals':('vehicle-rentals','bikes'),
        'tempo-travellers':('vehicle-rentals','tempo-travellers-and-vans'),
        'van-rentals':('vehicle-rentals','tempo-travellers-and-vans'),
        'cabs':('vehicle-rentals','outstation-cabs-and-taxis'),
        'taxis':('vehicle-rentals','outstation-cabs-and-taxis'),
        'airport-taxi':('vehicle-rentals','outstation-cabs-and-taxis'),
        'outstation-cabs':('vehicle-rentals','outstation-cabs-and-taxis'),
        'mini-trucks':('vehicle-rentals','goods-and-mini-trucks'),
        'packers-and-movers':('vehicle-rentals','goods-and-mini-trucks'),
        'goods-transport':('vehicle-rentals','goods-and-mini-trucks'),
        'weddings':('event-management','wedding'),
        'wedding-planners':('event-management','wedding'),
        'wedding-planning':('event-management','wedding'),
        'birthday-parties':('event-management','birthday'),
        'birthday-planners':('event-management','birthday'),
        'party-planners':('event-management','birthday'),
        'banquet-halls':('event-management','banquet-and-event-venues'),
        'marriage-halls':('event-management','banquet-and-event-venues'),
        'convention-halls':('event-management','banquet-and-event-venues'),
        'event-venues':('event-management','banquet-and-event-venues'),
        'catering':('event-management','catering-and-live-counters'),
        'caterers':('event-management','catering-and-live-counters'),
        'photographers':('event-management','photography-and-videography'),
        'event-photography':('event-management','photography-and-videography'),
        'videography':('event-management','photography-and-videography'),
        'hospital':('hospitals-and-labs','hospitals'),
        'multispeciality-hospitals':('hospitals-and-labs','hospitals'),
        'clinic':('hospitals-and-labs','clinics'),
        'general-physicians':('hospitals-and-labs','clinics'),
        'polyclinics':('hospitals-and-labs','clinics'),
        'clinics-and-polyclinics':('hospitals-and-labs','clinics'),
        'diagnostic-labs':('hospitals-and-labs','laboratory'),
        'diagnostics':('hospitals-and-labs','laboratory'),
        'pathology-labs':('hospitals-and-labs','laboratory'),
        'labs':('hospitals-and-labs','laboratory'),
        'medical-labs':('hospitals-and-labs','laboratory'),
        'dentists':('hospitals-and-labs','dental-clinics'),
        'dental-care':('hospitals-and-labs','dental-clinics'),
        'dental':('hospitals-and-labs','dental-clinics'),
        'physiotherapy':('hospitals-and-labs','physiotherapy-and-rehab'),
        'physio':('hospitals-and-labs','physiotherapy-and-rehab'),
        'rehab-centres':('hospitals-and-labs','physiotherapy-and-rehab'),
        'eye-clinics':('hospitals-and-labs','eye-and-skin-clinics'),
        'skin-clinics':('hospitals-and-labs','eye-and-skin-clinics'),
        'dermatology':('hospitals-and-labs','eye-and-skin-clinics'),
        'ophthalmology':('hospitals-and-labs','eye-and-skin-clinics'),
        'school':('education-and-skills','schools'),
        'cbse-icse-schools':('education-and-skills','schools'),
        'college':('education-and-skills','colleges'),
        'degree-colleges':('education-and-skills','colleges'),
        'pu-colleges':('education-and-skills','colleges'),
        'university':('education-and-skills','universities'),
        'coaching-institutes':('education-and-skills','institutes'),
        'skill-institutes':('education-and-skills','institutes'),
        'training-centres':('education-and-skills','institutes'),
        'tuition':('education-and-skills','tuitions'),
        'home-tuitions':('education-and-skills','tuitions'),
        'tutoring':('education-and-skills','tuitions'),
        'exam-coaching':('education-and-skills','competitive-exam-coaching'),
        'ias-neet-jee-coaching':('education-and-skills','competitive-exam-coaching'),
        'music-classes':('education-and-skills','music-dance-and-arts'),
        'dance-classes':('education-and-skills','music-dance-and-arts'),
        'art-classes':('education-and-skills','music-dance-and-arts'),
        'preschools':('education-and-skills','preschools-and-daycare'),
        'daycare':('education-and-skills','preschools-and-daycare'),
        'play-schools':('education-and-skills','preschools-and-daycare'),
        'kindergarten':('education-and-skills','preschools-and-daycare'),
        'salon':('salons-and-beauty-parlour','salons'),
        'unisex-salons':('salons-and-beauty-parlour','salons'),
        'hair-salons':('salons-and-beauty-parlour','salons'),
        'beauty-parlours':('salons-and-beauty-parlour','beauty-parlour'),
        'ladies-parlour':('salons-and-beauty-parlour','beauty-parlour'),
        'spa':('salons-and-beauty-parlour','spas'),
        'wellness-spas':('salons-and-beauty-parlour','spas'),
        'ayurvedic-spa':('salons-and-beauty-parlour','spas'),
        'saunas':('salons-and-beauty-parlour','sauna'),
        'steam-and-sauna':('salons-and-beauty-parlour','sauna'),
        'bridal-makeup':('salons-and-beauty-parlour','bridal-makeup-and-mehendi'),
        'mehendi-artists':('salons-and-beauty-parlour','bridal-makeup-and-mehendi'),
        'barbers':('salons-and-beauty-parlour','mens-grooming-and-barbers'),
        'barber-shops':('salons-and-beauty-parlour','mens-grooming-and-barbers'),
        'mens-salon':('salons-and-beauty-parlour','mens-grooming-and-barbers'),
        'nail-studios':('salons-and-beauty-parlour','nail-and-lash-studios'),
        'lash-studios':('salons-and-beauty-parlour','nail-and-lash-studios'),
        'nail-art':('salons-and-beauty-parlour','nail-and-lash-studios'),
        'residential-construction':('civil-and-construction','residential'),
        'civil-contractors':('civil-and-construction','residential'),
        'home-builders':('civil-and-construction','residential'),
        'commercial-construction':('civil-and-construction','commercial'),
        'commercial-contractors':('civil-and-construction','commercial'),
        'plumbers':('civil-and-construction','plumbing-and-electrical-repairs'),
        'electricians':('civil-and-construction','plumbing-and-electrical-repairs'),
        'plumbing':('civil-and-construction','plumbing-and-electrical-repairs'),
        'electrical-repairs':('civil-and-construction','plumbing-and-electrical-repairs'),
        'handyman':('civil-and-construction','plumbing-and-electrical-repairs'),
        'painting':('civil-and-construction','waterproofing-and-painting'),
        'painters':('civil-and-construction','waterproofing-and-painting'),
        'waterproofing':('civil-and-construction','waterproofing-and-painting'),
        'architects':('civil-and-construction','architecture-and-interiors'),
        'interior-designers':('civil-and-construction','architecture-and-interiors'),
        'architecture-and-structural':('civil-and-construction','architecture-and-interiors'),
        'interiors':('civil-and-construction','architecture-and-interiors'),
        'petrol-bunks':('fuel-and-charging-stations','petrol-pumps'),
        'fuel-pumps':('fuel-and-charging-stations','petrol-pumps'),
        'lpg-cng':('fuel-and-charging-stations','auto-gas'),
        'cng-stations':('fuel-and-charging-stations','auto-gas'),
        'auto-lpg':('fuel-and-charging-stations','auto-gas'),
        'ev-charging-stations':('fuel-and-charging-stations','ev-charging'),
        'ev-charging-and-service-stations':('fuel-and-charging-stations','ev-charging'),
        'car-wash':('fuel-and-charging-stations','car-and-bike-wash-detailing'),
        'bike-wash':('fuel-and-charging-stations','car-and-bike-wash-detailing'),
        'auto-detailing':('fuel-and-charging-stations','car-and-bike-wash-detailing'),
        'tyre-shops':('fuel-and-charging-stations','tyre-battery-and-puncture-care'),
        'battery-shops':('fuel-and-charging-stations','tyre-battery-and-puncture-care'),
        'puncture-repair':('fuel-and-charging-stations','tyre-battery-and-puncture-care'),
        'ev-service':('fuel-and-charging-stations','ev-service-and-battery-swap'),
        'battery-swap':('fuel-and-charging-stations','ev-service-and-battery-swap'),
        'cinemas':('vibe-finder','theatres'),
        'movie-theatres':('vibe-finder','theatres'),
        'multiplexes':('vibe-finder','theatres'),
        'events':('vibe-finder','social-events'),
        'meetups':('vibe-finder','social-events'),
        'workshops':('vibe-finder','social-events'),
        'gaming-zones':('vibe-finder','gaming-and-bowling-zones'),
        'bowling-alleys':('vibe-finder','gaming-and-bowling-zones'),
        'arcade':('vibe-finder','gaming-and-bowling-zones'),
        'sports-turfs':('vibe-finder','turf-and-sports-arenas'),
        'badminton-courts':('vibe-finder','turf-and-sports-arenas'),
        'cricket-turf':('vibe-finder','turf-and-sports-arenas'),
        'box-cricket':('vibe-finder','turf-and-sports-arenas'),
        'comedy-clubs':('vibe-finder','live-music-and-comedy-clubs'),
        'live-music':('vibe-finder','live-music-and-comedy-clubs'),
    }
    legacy_subcategories={
        alias:[cat_slug,type_slug,type_slug,type_slug]
        for alias,(cat_slug,type_slug) in raw_type_aliases.items()
    }
    outputs={
        SHARED/'marketplace-taxonomy.json':dict(version=source.get('version',6),categories=taxonomy),
        SHARED/'business-types.json':dict(version=source.get('version',6),regulations=regulations,categories=business),
        SHARED/'marketplace-imagery.json':json.loads((SHARED/'final-service-imagery.json').read_text(encoding='utf-8')),
        SHARED/'marketplace-legacy-map.json':dict(version=source.get('version',6),categories=legacy_categories,subcategories=legacy_subcategories,triples={},catalogue_services={},retained_catalogue_categories=[]),
        SHARED/'final-sector-presets.json':presets,
    }
    return {p:json.dumps(d,ensure_ascii=False,indent=2)+'\n' for p,d in outputs.items()}

def main():
    stale=[]
    built=build()
    for path,content in built.items():
        if not path.exists() or path.read_text(encoding='utf-8')!=content:
            stale.append(str(path.relative_to(ROOT)))
            if '--check' not in sys.argv:path.write_text(content,encoding='utf-8')
    if '--check' in sys.argv and stale:raise SystemExit('Stale generated taxonomy: '+', '.join(stale))
    tax=json.loads(built[SHARED/'marketplace-taxonomy.json'])
    total_types=sum(len(c['subcategories']) for c in tax['categories'])
    print(f"{len(tax['categories'])} categories / {total_types} direct service types; no database changes")

if __name__=='__main__':main()
