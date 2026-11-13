import type {Locale} from './i18n';
import {officialContact} from './public-contact';

type Copy=Record<Locale,string>;
const c=(en:string,kn:string,hi:string):Copy=>({en,kn,hi});
export const marketingPageLabels={
 back:c('All marketing solutions','ಎಲ್ಲ ಮಾರುಕಟ್ಟೆ ಪರಿಹಾರಗಳು','सभी मार्केटिंग समाधान'),
 capabilities:c('Made for your next move.','ನಿಮ್ಮ ಮುಂದಿನ ಹೆಜ್ಜೆಗಾಗಿ.','आपके अगले कदम के लिए।'),
 includes:c('What we can shape together','ನಾವು ಒಟ್ಟಿಗೆ ರೂಪಿಸಬಹುದಾದದ್ದು','हम साथ क्या तैयार कर सकते हैं'),
 process:c('From first idea to launch.','ಮೊದಲ ಕಲ್ಪನೆಯಿಂದ ಬಿಡುಗಡೆವರೆಗೆ.','पहले विचार से शुरुआत तक।'),
 brief:c('Bring your ambition. Start with a brief.','ನಿಮ್ಮ ಗುರಿಯೊಂದಿಗೆ ಬನ್ನಿ. ವಿವರಗಳಿಂದ ಪ್ರಾರಂಭಿಸಿ.','अपना लक्ष्य लाएँ। विवरण से शुरू करें।'),
 discuss:c('Discuss my project','ನನ್ನ ಯೋಜನೆಯ ಬಗ್ಗೆ ಚರ್ಚಿಸಿ','मेरी परियोजना पर चर्चा करें'),
 explore:c('Explore the possibilities','ಸಾಧ್ಯತೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ','संभावनाएँ देखें'),
 related:c('One brand. More possibilities.','ಒಂದು ಬ್ರ್ಯಾಂಡ್. ಹಲವು ಸಾಧ್ಯತೆಗಳು.','एक ब्रांड। अनेक संभावनाएँ।'),
 note:c('Scope, availability, production costs and media spend are confirmed after reviewing your brief. Sending an email does not confirm a booking.','ನಿಮ್ಮ ವಿವರಗಳ ಪರಿಶೀಲನೆಯ ನಂತರ ವ್ಯಾಪ್ತಿ, ಲಭ್ಯತೆ, ನಿರ್ಮಾಣ ವೆಚ್ಚ ಮತ್ತು ಮಾಧ್ಯಮ ವೆಚ್ಚ ಖಚಿತಪಡಿಸಲಾಗುತ್ತದೆ. ಇಮೇಲ್ ಕಳುಹಿಸುವುದರಿಂದ ಬುಕಿಂಗ್ ಖಚಿತವಾಗುವುದಿಲ್ಲ.','विवरण की समीक्षा के बाद कार्यक्षेत्र, उपलब्धता, निर्माण लागत और मीडिया खर्च तय होंगे। ईमेल भेजने से बुकिंग की पुष्टि नहीं होती।'),
 emailError:c('Could not open your email app. Write to info@vistrah.in.','ಇಮೇಲ್ ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯಲಾಗಲಿಲ್ಲ. info@vistrah.in ಗೆ ಬರೆಯಿರಿ.','ईमेल ऐप नहीं खुल सका। info@vistrah.in पर लिखें।'),
 steps:[
  c('Discover your goal','ನಿಮ್ಮ ಗುರಿಯನ್ನು ತಿಳಿಯೋಣ','आपका लक्ष्य समझें'),
  c('Shape the direction','ದಿಕ್ಕನ್ನು ರೂಪಿಸೋಣ','दिशा तय करें'),
  c('Create & approve','ರಚಿಸಿ ಮತ್ತು ಅನುಮೋದಿಸಿ','तैयार करें और स्वीकृति लें'),
  c('Launch & review','ಬಿಡುಗಡೆ ಮಾಡಿ ಮತ್ತು ಪರಿಶೀಲಿಸಿ','शुरू करें और समीक्षा करें'),
 ],
 stepCopy:[
  c('Share your audience, objective, location, timeline and budget.','ಪ್ರೇಕ್ಷಕರು, ಉದ್ದೇಶ, ಸ್ಥಳ, ಸಮಯ ಮತ್ತು ಬಜೆಟ್ ತಿಳಿಸಿ.','दर्शक, उद्देश्य, स्थान, समय और बजट बताएँ।'),
  c('Agree on the approach, deliverables and a clear estimate.','ವಿಧಾನ, ಒದಗಿಸಬೇಕಾದ ಕೆಲಸ ಮತ್ತು ವೆಚ್ಚದ ಅಂದಾಜನ್ನು ಒಪ್ಪಿಕೊಳ್ಳಿ.','तरीके, दिए जाने वाले काम और लागत के अनुमान पर सहमति बनाएँ।'),
  c('Review the concepts and approve the final work before release.','ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಬಿಡುಗಡೆಗೂ ಮೊದಲು ಅಂತಿಮ ಕೆಲಸವನ್ನು ಅನುಮೋದಿಸಿ.','विचारों की समीक्षा करें और जारी करने से पहले अंतिम काम स्वीकृत करें।'),
  c('Coordinate delivery and review the agreed reporting or handover.','ವಿತರಣೆಯನ್ನು ಸಂಯೋಜಿಸಿ, ಒಪ್ಪಿದ ವರದಿ ಅಥವಾ ಹಸ್ತಾಂತರವನ್ನು ಪರಿಶೀಲಿಸಿ.','वितरण का समन्वय करें और तय रिपोर्ट या हस्तांतरण की समीक्षा करें।'),
 ],
};

export const marketingServicePages=[
 {
  slug:'digital-marketing',key:'performance-marketing',accent:'#7dd3fc',photo:'performance-marketing.webp',
  title:c('Digital Marketing','ಡಿಜಿಟಲ್ ಮಾರ್ಕೆಟಿಂಗ್','डिजिटल मार्केटिंग'),
  headline:c('Turn attention into your next opportunity.','ಗಮನವನ್ನು ನಿಮ್ಮ ಮುಂದಿನ ಅವಕಾಶವಾಗಿಸಿ.','लोगों के ध्यान को नए अवसर में बदलें।'),
  intro:c('Connect search, social, content and paid campaigns around one clear business goal. Build a digital presence that gives people a reason to discover, trust and contact you.','ಒಂದು ಸ್ಪಷ್ಟ ವ್ಯವಹಾರದ ಗುರಿಗಾಗಿ ಹುಡುಕಾಟ, ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ, ವಿಷಯ ಮತ್ತು ಪಾವತಿಸಿದ ಅಭಿಯಾನಗಳನ್ನು ಜೋಡಿಸಿ. ಜನರು ನಿಮ್ಮನ್ನು ಕಂಡುಕೊಳ್ಳಲು, ನಂಬಲು ಮತ್ತು ಸಂಪರ್ಕಿಸಲು ಕಾರಣ ನೀಡುವ ಡಿಜಿಟಲ್ ಉಪಸ್ಥಿತಿ ಬೆಳೆಸಿ.','खोज, सोशल मीडिया, कंटेंट और पेड अभियानों को एक स्पष्ट व्यावसायिक लक्ष्य से जोड़ें। ऐसी डिजिटल उपस्थिति बनाएँ जिससे लोग आपको खोजें, भरोसा करें और संपर्क करें।'),
  concept:c('Discover. Connect. Convert.','ಅನ್ವೇಷಿಸಿ. ಸಂಪರ್ಕಿಸಿ. ಬೆಳೆಸಿ.','खोज। जुड़ाव। परिणाम।'),
  capabilities:[
   [c('Search & local discovery','ಹುಡುಕಾಟ ಮತ್ತು ಸ್ಥಳೀಯ ಅನ್ವೇಷಣೆ','खोज और स्थानीय पहचान'),c('SEO, website audits, useful content and local business presence so the right people can find you.','ಸರಿಯಾದ ಜನರು ನಿಮ್ಮನ್ನು ಕಂಡುಕೊಳ್ಳಲು SEO, ವೆಬ್‌ಸೈಟ್ ಪರಿಶೀಲನೆ, ಉಪಯುಕ್ತ ವಿಷಯ ಮತ್ತು ಸ್ಥಳೀಯ ವ್ಯವಹಾರದ ಉಪಸ್ಥಿತಿ.','सही लोगों तक पहुँचने के लिए SEO, वेबसाइट समीक्षा, उपयोगी कंटेंट और स्थानीय व्यवसाय की पहचान।')],
   [c('Paid campaigns','ಪಾವತಿಸಿದ ಅಭಿಯಾನಗಳು','पेड अभियान'),c('Search and social ad planning, audience selection, creative variants and budget allocation.','ಹುಡುಕಾಟ ಮತ್ತು ಸಾಮಾಜಿಕ ಜಾಹೀರಾತು ಯೋಜನೆ, ಪ್ರೇಕ್ಷಕರ ಆಯ್ಕೆ, ಸೃಜನಾತ್ಮಕ ರೂಪಾಂತರಗಳು ಮತ್ತು ಬಜೆಟ್ ಹಂಚಿಕೆ.','सर्च और सोशल विज्ञापन योजना, दर्शक चयन, क्रिएटिव विकल्प और बजट आवंटन।')],
   [c('Social & content','ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ಮತ್ತು ವಿಷಯ','सोशल मीडिया और कंटेंट'),c('Content calendars, posts, reels, campaign copy and a consistent voice across your channels.','ವಿಷಯ ಕ್ಯಾಲೆಂಡರ್‌ಗಳು, ಪೋಸ್ಟ್‌ಗಳು, ರೀಲ್ಸ್, ಅಭಿಯಾನದ ಬರಹ ಮತ್ತು ಎಲ್ಲ ಚಾನೆಲ್‌ಗಳಲ್ಲಿ ಒಂದೇ ಬ್ರ್ಯಾಂಡ್ ಧ್ವನಿ.','कंटेंट कैलेंडर, पोस्ट, रील, अभियान की कॉपी और सभी चैनलों पर एक जैसी ब्रांड आवाज़।')],
   [c('Landing pages & measurement','ಲ್ಯಾಂಡಿಂಗ್ ಪುಟಗಳು ಮತ್ತು ಮೌಲ್ಯಮಾಪನ','लैंडिंग पेज और मापन'),c('Clear calls to action, enquiry journeys and agreed measurement of reach, clicks and leads.','ಸ್ಪಷ್ಟ ಕ್ರಿಯಾ ಸೂಚನೆಗಳು, ವಿಚಾರಣೆಯ ಹಾದಿಗಳು ಮತ್ತು ತಲುಪುವಿಕೆ, ಕ್ಲಿಕ್‌ಗಳು ಹಾಗೂ ವಿಚಾರಣೆಗಳ ಒಪ್ಪಿದ ಮೌಲ್ಯಮಾಪನ.','स्पष्ट कार्रवाई बटन, पूछताछ का रास्ता और पहुँच, क्लिक व लीड का तय मापन।')],
  ],
  outputs:[c('Audience and channel plan','ಪ್ರೇಕ್ಷಕರು ಮತ್ತು ಚಾನೆಲ್ ಯೋಜನೆ','दर्शक और चैनल योजना'),c('Campaign creatives and content calendar','ಅಭಿಯಾನದ ವಿನ್ಯಾಸಗಳು ಮತ್ತು ವಿಷಯ ಕ್ಯಾಲೆಂಡರ್','अभियान क्रिएटिव और कंटेंट कैलेंडर'),c('Agreed reporting and optimisation plan','ಒಪ್ಪಿದ ವರದಿ ಮತ್ತು ಸುಧಾರಣಾ ಯೋಜನೆ','तय रिपोर्टिंग और सुधार योजना')],
  brief:[c('Your business, offer and target audience','ನಿಮ್ಮ ವ್ಯವಹಾರ, ಕೊಡುಗೆ ಮತ್ತು ಗುರಿ ಪ್ರೇಕ್ಷಕರು','आपका व्यवसाय, ऑफ़र और लक्षित दर्शक'),c('Website, social channels and current challenges','ವೆಬ್‌ಸೈಟ್, ಸಾಮಾಜಿಕ ಚಾನೆಲ್‌ಗಳು ಮತ್ತು ಪ್ರಸ್ತುತ ಸವಾಲುಗಳು','वेबसाइट, सोशल चैनल और मौजूदा चुनौतियाँ'),c('Campaign goal, timeline and media budget','ಅಭಿಯಾನದ ಗುರಿ, ಸಮಯ ಮತ್ತು ಮಾಧ್ಯಮ ಬಜೆಟ್','अभियान का लक्ष्य, समय और मीडिया बजट')],
 },
 {
  slug:'branding-creative-production',key:'branding-creative',accent:'#f9a8d4',photo:'branding-creative.webp',
  title:c('Branding & Creative Production','ಬ್ರ್ಯಾಂಡಿಂಗ್ ಮತ್ತು ಸೃಜನಾತ್ಮಕ ನಿರ್ಮಾಣ','ब्रांडिंग और क्रिएटिव प्रोडक्शन'),
  headline:c('A brand people recognise. A story they remember.','ಜನರು ಗುರುತಿಸುವ ಬ್ರ್ಯಾಂಡ್. ನೆನಪಿನಲ್ಲಿಡುವ ಕಥೆ.','ऐसा ब्रांड जिसे लोग पहचानें। ऐसी कहानी जो याद रहे।'),
  intro:c('Bring your identity, visuals and message into one expressive world. From your first logo to your next campaign film, give every customer touchpoint a consistent personality.','ನಿಮ್ಮ ಗುರುತು, ದೃಶ್ಯಗಳು ಮತ್ತು ಸಂದೇಶವನ್ನು ಒಂದೇ ಅಭಿವ್ಯಕ್ತಿಯ ಜಗತ್ತಿಗೆ ತನ್ನಿ. ಮೊದಲ ಲೋಗೋದಿಂದ ಮುಂದಿನ ಅಭಿಯಾನದ ಚಿತ್ರವರೆಗೆ ಗ್ರಾಹಕರ ಪ್ರತಿ ಸಂಪರ್ಕಕ್ಕೂ ಒಂದೇ ವ್ಯಕ್ತಿತ್ವ ನೀಡಿ.','अपनी पहचान, दृश्यों और संदेश को एक अभिव्यक्तिपूर्ण दुनिया में लाएँ। पहले लोगो से अगले अभियान वीडियो तक हर ग्राहक अनुभव में एक जैसा व्यक्तित्व रखें।'),
  concept:c('Identity. Expression. Impact.','ಗುರುತು. ಅಭಿವ್ಯಕ್ತಿ. ಪ್ರಭಾವ.','पहचान। अभिव्यक्ति। प्रभाव।'),
  capabilities:[
   [c('Brand identity','ಬ್ರ್ಯಾಂಡ್ ಗುರುತು','ब्रांड पहचान'),c('Logo direction, colour palettes, typography and a visual language that fits your business.','ನಿಮ್ಮ ವ್ಯವಹಾರಕ್ಕೆ ಹೊಂದುವ ಲೋಗೋ ದಿಕ್ಕು, ಬಣ್ಣಗಳು, ಅಕ್ಷರ ವಿನ್ಯಾಸ ಮತ್ತು ದೃಶ್ಯ ಭಾಷೆ.','आपके व्यवसाय के अनुरूप लोगो की दिशा, रंग, टाइपोग्राफ़ी और दृश्य भाषा।')],
   [c('Campaign design','ಅಭಿಯಾನದ ವಿನ್ಯಾಸ','अभियान डिज़ाइन'),c('Key visuals, social creatives, launch concepts and promotional artwork across formats.','ಮುಖ್ಯ ದೃಶ್ಯಗಳು, ಸಾಮಾಜಿಕ ವಿನ್ಯಾಸಗಳು, ಬಿಡುಗಡೆ ಪರಿಕಲ್ಪನೆಗಳು ಮತ್ತು ವಿವಿಧ ರೂಪದ ಪ್ರಚಾರ ಕಲೆ.','मुख्य दृश्य, सोशल क्रिएटिव, लॉन्च विचार और अलग-अलग प्रारूपों में प्रचार डिज़ाइन।')],
   [c('Photo & video production','ಚಿತ್ರ ಮತ್ತು ವೀಡಿಯೊ ನಿರ್ಮಾಣ','फ़ोटो और वीडियो प्रोडक्शन'),c('Concepts, scripts, product imagery, filming, editing and short-form content for your story.','ನಿಮ್ಮ ಕಥೆಗಾಗಿ ಪರಿಕಲ್ಪನೆಗಳು, ಚಿತ್ರಕಥೆ, ಉತ್ಪನ್ನ ಚಿತ್ರಗಳು, ಚಿತ್ರೀಕರಣ, ಸಂಕಲನ ಮತ್ತು ಕಿರು ವಿಷಯ.','आपकी कहानी के लिए विचार, स्क्रिप्ट, उत्पाद फ़ोटो, शूटिंग, संपादन और छोटे वीडियो।')],
   [c('Everyday brand essentials','ದೈನಂದಿನ ಬ್ರ್ಯಾಂಡ್ ಅಗತ್ಯಗಳು','ब्रांड की रोज़मर्रा की ज़रूरतें'),c('Packaging, brochures, business stationery and brand guidelines for consistent use.','ಸ್ಥಿರ ಬಳಕೆಗಾಗಿ ಪ್ಯಾಕೇಜಿಂಗ್, ಕರಪತ್ರಗಳು, ವ್ಯವಹಾರದ ಮುದ್ರಿತ ಸಾಮಗ್ರಿ ಮತ್ತು ಬ್ರ್ಯಾಂಡ್ ಮಾರ್ಗಸೂಚಿಗಳು.','एक जैसी पहचान के लिए पैकेजिंग, ब्रोशर, व्यवसाय स्टेशनरी और ब्रांड दिशानिर्देश।')],
  ],
  outputs:[c('Creative direction and approved concepts','ಸೃಜನಾತ್ಮಕ ದಿಕ್ಕು ಮತ್ತು ಅನುಮೋದಿತ ಪರಿಕಲ್ಪನೆಗಳು','क्रिएटिव दिशा और स्वीकृत विचार'),c('Agreed artwork, edits and export formats','ಒಪ್ಪಿದ ಕಲೆ, ಸಂಕಲನ ಮತ್ತು ರಫ್ತು ರೂಪಗಳು','तय डिज़ाइन, संपादन और निर्यात प्रारूप'),c('Usage guidelines and asset handover','ಬಳಕೆಯ ಮಾರ್ಗಸೂಚಿಗಳು ಮತ್ತು ಕಡತಗಳ ಹಸ್ತಾಂತರ','उपयोग दिशानिर्देश और फ़ाइल हस्तांतरण')],
  brief:[c('Your brand story and audience','ನಿಮ್ಮ ಬ್ರ್ಯಾಂಡ್ ಕಥೆ ಮತ್ತು ಪ್ರೇಕ್ಷಕರು','आपके ब्रांड की कहानी और दर्शक'),c('Existing logo, references and required formats','ಈಗಿನ ಲೋಗೋ, ಉಲ್ಲೇಖಗಳು ಮತ್ತು ಅಗತ್ಯ ರೂಪಗಳು','मौजूदा लोगो, संदर्भ और ज़रूरी प्रारूप'),c('Launch date, deliverables and production budget','ಬಿಡುಗಡೆ ದಿನಾಂಕ, ಅಗತ್ಯ ಕೆಲಸ ಮತ್ತು ನಿರ್ಮಾಣ ಬಜೆಟ್','लॉन्च की तारीख, ज़रूरी काम और प्रोडक्शन बजट')],
 },
 {
  slug:'outdoor-advertising-signage',key:'outdoor-advertising',accent:'#fcd34d',photo:'outdoor-signage.jpg',
  title:c('Outdoor Advertising & Signage','ಹೊರಾಂಗಣ ಜಾಹೀರಾತು ಮತ್ತು ಫಲಕಗಳು','आउटडोर विज्ञापन और साइनेज'),
  headline:c('Make your presence part of the city.','ನಿಮ್ಮ ಉಪಸ್ಥಿತಿಯನ್ನು ನಗರದ ಭಾಗವಾಗಿಸಿ.','अपनी मौजूदगी को शहर का हिस्सा बनाएँ।'),
  intro:c('Take your message beyond the screen. Plan location-aware outdoor campaigns and storefront signage with clear design, readable messaging and production suited to the setting.','ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಪರದೆಯಾಚೆಗೆ ಕೊಂಡೊಯ್ಯಿರಿ. ಸ್ಪಷ್ಟ ವಿನ್ಯಾಸ, ಓದಲು ಸುಲಭ ಸಂದೇಶ ಮತ್ತು ಸ್ಥಳಕ್ಕೆ ತಕ್ಕ ನಿರ್ಮಾಣದೊಂದಿಗೆ ಹೊರಾಂಗಣ ಅಭಿಯಾನಗಳು ಹಾಗೂ ಅಂಗಡಿ ಫಲಕಗಳನ್ನು ಯೋಜಿಸಿ.','अपने संदेश को स्क्रीन से बाहर ले जाएँ। स्पष्ट डिज़ाइन, आसानी से पढ़े जाने वाले संदेश और स्थान के अनुरूप निर्माण के साथ आउटडोर अभियान व दुकान के साइनबोर्ड की योजना बनाएँ।'),
  concept:c('The right place. A stronger presence.','ಸರಿಯಾದ ಸ್ಥಳ. ಬಲವಾದ ಉಪಸ್ಥಿತಿ.','सही जगह। दमदार मौजूदगी।'),
  capabilities:[
   [c('Billboards & hoardings','ಬಿಲ್‌ಬೋರ್ಡ್‌ಗಳು ಮತ್ತು ಹೋರ್ಡಿಂಗ್‌ಗಳು','बिलबोर्ड और होर्डिंग'),c('Location shortlisting, format selection, artwork and campaign scheduling, subject to site availability.','ಸ್ಥಳದ ಲಭ್ಯತೆಗೆ ಒಳಪಟ್ಟು ಸ್ಥಳದ ಆಯ್ಕೆ, ರೂಪದ ಆಯ್ಕೆ, ವಿನ್ಯಾಸ ಮತ್ತು ಅಭಿಯಾನದ ವೇಳಾಪಟ್ಟಿ.','स्थल की उपलब्धता के अनुसार जगह, प्रारूप, डिज़ाइन और अभियान समय का चयन।')],
   [c('Storefront signage','ಅಂಗಡಿ ಫಲಕಗಳು','दुकान के साइनबोर्ड'),c('Shop boards, illuminated lettering, fascia design and a recognisable street-facing identity.','ಅಂಗಡಿ ಫಲಕಗಳು, ಬೆಳಕಿನ ಅಕ್ಷರಗಳು, ಮುಂಭಾಗದ ವಿನ್ಯಾಸ ಮತ್ತು ರಸ್ತೆಯಿಂದ ಗುರುತಿಸಬಹುದಾದ ಗುರುತು.','दुकान के बोर्ड, रोशन अक्षर, सामने का डिज़ाइन और सड़क से पहचानी जाने वाली पहचान।')],
   [c('Print & display','ಮುದ್ರಣ ಮತ್ತು ಪ್ರದರ್ಶನ','प्रिंट और डिस्प्ले'),c('Banners, standees, directional signs and event displays designed for their viewing distance.','ನೋಡುವ ದೂರಕ್ಕೆ ತಕ್ಕ ಬ್ಯಾನರ್‌ಗಳು, ಸ್ಟ್ಯಾಂಡಿಗಳು, ದಿಕ್ಕು ಸೂಚನೆಗಳು ಮತ್ತು ಕಾರ್ಯಕ್ರಮ ಪ್ರದರ್ಶನಗಳು.','देखने की दूरी के अनुसार बैनर, स्टैंडी, दिशा संकेत और कार्यक्रम डिस्प्ले।')],
   [c('Production & installation planning','ನಿರ್ಮಾಣ ಮತ್ತು ಅಳವಡಿಕೆ ಯೋಜನೆ','निर्माण और स्थापना योजना'),c('Discuss dimensions, materials, lighting, installation access and the permissions needed before execution.','ಕಾರ್ಯಗತಗೊಳಿಸುವ ಮೊದಲು ಅಳತೆ, ಸಾಮಗ್ರಿ, ಬೆಳಕು, ಅಳವಡಿಕೆಯ ಪ್ರವೇಶ ಮತ್ತು ಅಗತ್ಯ ಅನುಮತಿಗಳನ್ನು ಚರ್ಚಿಸಿ.','काम शुरू करने से पहले आकार, सामग्री, रोशनी, स्थापना की पहुँच और ज़रूरी अनुमतियों पर चर्चा करें।')],
  ],
  outputs:[c('Site and format recommendations','ಸ್ಥಳ ಮತ್ತು ರೂಪದ ಶಿಫಾರಸುಗಳು','स्थल और प्रारूप सुझाव'),c('Production-ready artwork and specifications','ನಿರ್ಮಾಣಕ್ಕೆ ಸಿದ್ಧ ವಿನ್ಯಾಸ ಮತ್ತು ವಿವರಗಳು','निर्माण के लिए तैयार डिज़ाइन और विवरण'),c('Agreed installation and display schedule','ಒಪ್ಪಿದ ಅಳವಡಿಕೆ ಮತ್ತು ಪ್ರದರ್ಶನ ವೇಳಾಪಟ್ಟಿ','तय स्थापना और प्रदर्शन समय')],
  brief:[c('City, preferred locations and campaign dates','ನಗರ, ಆದ್ಯತೆಯ ಸ್ಥಳಗಳು ಮತ್ತು ಅಭಿಯಾನದ ದಿನಾಂಕಗಳು','शहर, पसंदीदा स्थान और अभियान की तारीखें'),c('Approximate dimensions, message and brand assets','ಅಂದಾಜು ಅಳತೆ, ಸಂದೇಶ ಮತ್ತು ಬ್ರ್ಯಾಂಡ್ ಕಡತಗಳು','अनुमानित आकार, संदेश और ब्रांड फ़ाइलें'),c('Budget, site access and permission requirements','ಬಜೆಟ್, ಸ್ಥಳದ ಪ್ರವೇಶ ಮತ್ತು ಅನುಮತಿಯ ಅಗತ್ಯಗಳು','बजट, स्थल की पहुँच और अनुमति आवश्यकताएँ')],
 },
 {
  slug:'mobility-billboard-advertising',key:'mobility-billboard',accent:'#a7f3d0',photo:'mobility-billboard.jpg',
  title:c('Mobility Billboard Advertising','ಚಲಿಸುವ ಬಿಲ್‌ಬೋರ್ಡ್ ಜಾಹೀರಾತು','मोबिलिटी बिलबोर्ड विज्ञापन'),
  headline:c('Your message. A city in motion.','ನಿಮ್ಮ ಸಂದೇಶ. ಚಲನೆಯಲ್ಲಿರುವ ನಗರ.','आपका संदेश। चलता हुआ शहर।'),
  intro:c('Bring your campaign closer to the places your audience spends time. Explore vehicle-led displays, branded mobility and route-based promotions with a plan for every stop.','ನಿಮ್ಮ ಪ್ರೇಕ್ಷಕರು ಸಮಯ ಕಳೆಯುವ ಸ್ಥಳಗಳಿಗೆ ಅಭಿಯಾನವನ್ನು ಹತ್ತಿರ ತಂದುಕೊಳ್ಳಿ. ಪ್ರತಿ ನಿಲುಗಡೆಗೂ ಯೋಜನೆಯೊಂದಿಗೆ ವಾಹನ ಪ್ರದರ್ಶನಗಳು, ಬ್ರ್ಯಾಂಡ್ ವಾಹನಗಳು ಮತ್ತು ಮಾರ್ಗಾಧಾರಿತ ಪ್ರಚಾರಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.','अपना अभियान उन जगहों के करीब लाएँ जहाँ आपके दर्शक समय बिताते हैं। हर पड़ाव की योजना के साथ वाहन डिस्प्ले, ब्रांडेड वाहन और मार्ग आधारित प्रचार देखें।'),
  concept:c('Move the message. Meet your audience.','ಸಂದೇಶವನ್ನು ಚಲಿಸಿ. ಪ್ರೇಕ್ಷಕರನ್ನು ತಲುಪಿ.','संदेश आगे बढ़ाएँ। दर्शकों तक पहुँचें।'),
  capabilities:[
   [c('Mobile display campaigns','ಚಲಿಸುವ ಪ್ರದರ್ಶನ ಅಭಿಯಾನಗಳು','मोबाइल डिस्प्ले अभियान'),c('Explore LED or static vehicle displays based on availability, format suitability and approved operating conditions.','ಲಭ್ಯತೆ, ಸೂಕ್ತ ರೂಪ ಮತ್ತು ಅನುಮೋದಿತ ಕಾರ್ಯಾಚರಣೆ ಷರತ್ತುಗಳಿಗೆ ಅನುಗುಣವಾಗಿ LED ಅಥವಾ ಸ್ಥಿರ ವಾಹನ ಪ್ರದರ್ಶನಗಳನ್ನು ಅನ್ವೇಷಿಸಿ.','उपलब्धता, उपयुक्त प्रारूप और स्वीकृत संचालन शर्तों के अनुसार LED या स्थिर वाहन डिस्प्ले देखें।')],
   [c('Routes & audience moments','ಮಾರ್ಗಗಳು ಮತ್ತು ಪ್ರೇಕ್ಷಕರ ಸಮಯ','मार्ग और दर्शकों का समय'),c('Discuss neighbourhoods, catchment areas, time windows and a route aligned with your campaign objective.','ನಿಮ್ಮ ಅಭಿಯಾನದ ಉದ್ದೇಶಕ್ಕೆ ಹೊಂದುವ ಬಡಾವಣೆಗಳು, ವ್ಯಾಪ್ತಿಯ ಪ್ರದೇಶಗಳು, ಸಮಯ ಮತ್ತು ಮಾರ್ಗವನ್ನು ಚರ್ಚಿಸಿ.','अभियान के उद्देश्य के अनुसार मोहल्लों, आसपास के क्षेत्रों, समय और मार्ग पर चर्चा करें।')],
   [c('Creative built for movement','ಚಲನೆಗೆ ತಕ್ಕ ಸೃಜನಾತ್ಮಕ ವಿನ್ಯಾಸ','चलते प्रदर्शन के लिए क्रिएटिव'),c('Bold layouts, concise messages and display-ready artwork or video that works at a glance.','ಒಂದು ನೋಟದಲ್ಲೇ ಅರ್ಥವಾಗುವ ಸ್ಪಷ್ಟ ವಿನ್ಯಾಸ, ಸಂಕ್ಷಿಪ್ತ ಸಂದೇಶ ಮತ್ತು ಪ್ರದರ್ಶನಕ್ಕೆ ಸಿದ್ಧ ಕಲೆ ಅಥವಾ ವೀಡಿಯೊ.','एक नज़र में समझ आने वाले स्पष्ट लेआउट, छोटे संदेश और डिस्प्ले के लिए तैयार डिज़ाइन या वीडियो।')],
   [c('Activation & coordination','ಕಾರ್ಯಗತಗೊಳಿಸುವಿಕೆ ಮತ್ತು ಸಂಯೋಜನೆ','सक्रियकरण और समन्वय'),c('Plan vehicle access, stops, timing, permissions and agreed execution updates before the campaign starts.','ಅಭಿಯಾನ ಆರಂಭಕ್ಕೂ ಮೊದಲು ವಾಹನ ಪ್ರವೇಶ, ನಿಲುಗಡೆಗಳು, ಸಮಯ, ಅನುಮತಿಗಳು ಮತ್ತು ಒಪ್ಪಿದ ಕಾರ್ಯಾಚರಣೆಯ ಮಾಹಿತಿ ಯೋಜಿಸಿ.','अभियान से पहले वाहन पहुँच, पड़ाव, समय, अनुमतियाँ और तय संचालन अपडेट की योजना बनाएँ।')],
  ],
  outputs:[c('Route and timing proposal','ಮಾರ್ಗ ಮತ್ತು ಸಮಯದ ಪ್ರಸ್ತಾವನೆ','मार्ग और समय का प्रस्ताव'),c('Vehicle/display creative specifications','ವಾಹನ ಮತ್ತು ಪ್ರದರ್ಶನ ವಿನ್ಯಾಸದ ವಿವರಗಳು','वाहन और डिस्प्ले क्रिएटिव का विवरण'),c('Agreed execution updates and campaign wrap-up','ಒಪ್ಪಿದ ಕಾರ್ಯಾಚರಣೆಯ ಮಾಹಿತಿ ಮತ್ತು ಅಭಿಯಾನದ ಸಾರಾಂಶ','तय संचालन अपडेट और अभियान सारांश')],
  brief:[c('Target city, neighbourhoods and audience','ಗುರಿ ನಗರ, ಬಡಾವಣೆಗಳು ಮತ್ತು ಪ್ರೇಕ್ಷಕರು','लक्षित शहर, मोहल्ले और दर्शक'),c('Campaign dates, routes and display preference','ಅಭಿಯಾನದ ದಿನಾಂಕಗಳು, ಮಾರ್ಗಗಳು ಮತ್ತು ಪ್ರದರ್ಶನದ ಆದ್ಯತೆ','अभियान की तारीखें, मार्ग और डिस्प्ले पसंद'),c('Creative assets, budget and on-ground needs','ವಿನ್ಯಾಸ ಕಡತಗಳು, ಬಜೆಟ್ ಮತ್ತು ಸ್ಥಳೀಯ ಅಗತ್ಯಗಳು','क्रिएटिव फ़ाइलें, बजट और ज़मीनी ज़रूरतें')],
 },
] as const;
export type MarketingServicePage=(typeof marketingServicePages)[number];
export function getMarketingService(slug:string){return marketingServicePages.find(page=>page.slug===slug);}
export const marketingServiceHref=(slug:string)=>`/marketing-services/${slug}`;
export function marketingEnquiryHref(page:MarketingServicePage,locale:Locale){
 const body=[page.title[locale],'',...page.brief.map(item=>item[locale]+': ')].join('\n');
 return `mailto:${officialContact.email}?subject=${encodeURIComponent('VISTRAH — '+page.title[locale])}&body=${encodeURIComponent(body)}`;
}
