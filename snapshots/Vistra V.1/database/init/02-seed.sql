INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
('Jobs & Careers','jobs-careers','💼','Jobs, resumes, applications and career support',1),
('Real Estate','real-estate','🏠','Property search, marketing and real-estate assistance',2),
('Civil & Construction','civil-construction','🏗️','Construction, civil works, estimation, BOQ and tender assistance',3),
('Digital Marketing','digital-marketing','📣','Social media, advertising, SEO and digital growth',4),
('Tax & Compliance','tax-compliance','🧾','Tax filing, GST, registrations and compliance support',5),
('IT & Technology','it-technology','💻','Web, software, cloud, DevOps and technology services',6),
('Business Services','business-services','🏢','Business setup, accounting, documentation and consulting',7),
('Local & Professional Services','local-professional-services','🛠️','Local and professional service assistance',8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'New Building Construction','new-building-construction','Plan and coordinate residential or commercial construction requirements',NULL,TRUE FROM categories WHERE slug='civil-construction'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'Construction Estimate / BOQ','construction-estimate-boq','Construction cost estimate and BOQ assistance',NULL,TRUE FROM categories WHERE slug='civil-construction'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'Income Tax Return Filing','income-tax-return','Income tax return filing assistance',99900,FALSE FROM categories WHERE slug='tax-compliance'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'GST Registration','gst-registration','GST registration assistance',149900,FALSE FROM categories WHERE slug='tax-compliance'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'Website Development','website-development','Business website design and development',NULL,TRUE FROM categories WHERE slug='it-technology'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'Social Media Marketing','social-media-marketing','Social media management and content marketing',NULL,TRUE FROM categories WHERE slug='digital-marketing'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (category_id,name,slug,description,base_price_paise,quote_required)
SELECT id,'Resume & Job Application Assistance','resume-job-assistance','Resume improvement and job application assistance',49900,FALSE FROM categories WHERE slug='jobs-careers'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO requirement_fields (service_id,field_key,label,field_type,required,options_json,sort_order)
SELECT id,'location','Project Location','text',TRUE,NULL,1 FROM services WHERE slug='new-building-construction'
ON CONFLICT DO NOTHING;

INSERT INTO requirement_fields (service_id,field_key,label,field_type,required,options_json,sort_order)
SELECT id,'site_area','Site Area','text',TRUE,NULL,2 FROM services WHERE slug='new-building-construction'
ON CONFLICT DO NOTHING;

INSERT INTO requirement_fields (service_id,field_key,label,field_type,required,options_json,sort_order)
SELECT id,'property_type','Property Type','select',TRUE,'["Residential","Commercial","Industrial"]',3 FROM services WHERE slug='new-building-construction'
ON CONFLICT DO NOTHING;

INSERT INTO requirement_fields (service_id,field_key,label,field_type,required,options_json,sort_order)
SELECT id,'budget','Estimated Budget','text',FALSE,NULL,4 FROM services WHERE slug='new-building-construction'
ON CONFLICT DO NOTHING;

INSERT INTO requirement_fields (service_id,field_key,label,field_type,required,options_json,sort_order)
SELECT id,'details','Additional Information','textarea',FALSE,NULL,5 FROM services WHERE slug='new-building-construction'
ON CONFLICT DO NOTHING;
