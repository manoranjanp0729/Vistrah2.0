"""Authoring utility for the canonical catalogue, never used by website pages."""
import json
from pathlib import Path

preparation = {
    'jobs-careers': ['Prepare your current resume, work history and the roles you are targeting.', 'Bring examples of achievements, certifications and skills you want to highlight.'],
    'real-estate': ['Prepare the property address, requirements and documents you want reviewed.', 'Record your budget, location preferences and questions for the consultation.'],
    'civil-construction': ['Prepare the site location, available drawings and intended project scope.', 'List preferred materials, approximate dimensions and the proposed timeline.'],
    'marketing': ['Prepare your business profile, target audience and campaign objectives.', 'Share existing brand assets and the channels you would like to consider.'],
    'tax-compliance': ['List the filings, registrations or questions for which you need assistance.', 'Prepare a list of relevant documents; discuss secure sharing during consultation.'],
    'it-technology': ['Describe your users, the problem to solve and your current systems.', 'List required features, integrations, approximate budget and desired timeline.'],
    'business-services': ['Prepare a description of your business, current stage and assistance needed.', 'List desired outcomes, constraints and existing process documentation.'],
    'local-professional-services': ['Prepare your address, the issue to resolve and suitable times for a visit.', 'Share approximate dimensions or equipment details when relevant.'],
}
path = Path(__file__).resolve().parents[1] / 'shared' / 'catalogue.json'
catalogue = json.loads(path.read_text(encoding='utf-8'))
for category in catalogue:
    services = category['services'] + [s for sub in category['subcategories'] for s in sub['services']]
    for service in services:
        service['member_information'] = preparation[category['slug']] + [
            f"For {service['title'].lower()}, ask for an itemized scope, deliverables and exclusions before agreeing to proceed.",
            'Confirm the delivery responsibilities, timeline and how changes to scope will be handled.',
            'Do not share passwords, card details or payment PINs in a service requirement.',
        ]
path.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
