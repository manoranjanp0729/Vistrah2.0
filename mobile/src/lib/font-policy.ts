import {
  compensateFontSize,
  fontChoices,
  fontOpticalScale,
  fontPreferenceKey,
  isFontChoice,
  spatialRhythm,
  typographyMetrics,
  type FontChoice,
  type FontLocale,
  type FontWeight,
} from '../../../shared/fonts.ts';

export {
  compensateFontSize,
  fontChoices,
  fontOpticalScale,
  fontPreferenceKey,
  isFontChoice,
  spatialRhythm,
  typographyMetrics,
  type FontChoice,
  type FontLocale,
  type FontWeight,
};
export const fontFamilies={en:'Montserrat',kn:'NotoSansKannada',hi:'NotoSansDevanagari'} as const;
export const weightNames={400:'Regular',500:'Medium',600:'SemiBold',700:'Bold'} as const;
export const fontLoadingCopy={
 en:{error:'VISTRAH could not load its fonts.',retry:'Retry',loading:'Loading fonts'},
 kn:{error:'ಫಾಂಟ್ ಲೋಡ್ ಆಗಲಿಲ್ಲ.',retry:'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',loading:'ಫಾಂಟ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ'},
 hi:{error:'फ़ॉन्ट लोड नहीं हो सके।',retry:'फिर से कोशिश करें',loading:'फ़ॉन्ट लोड हो रहे हैं'},
};
export function standardWeight(value:string|number|undefined,inherited:FontWeight=400):FontWeight {
 if(value===undefined)return inherited;
 if(value==='bold')return 700;
 if(value==='normal')return 400;
 const numeric=Number(value);
 return numeric>=650?700:numeric>=550?600:numeric>=450?500:400;
}
export function fontFace(locale:FontLocale,weight:FontWeight,choice:FontChoice='montserrat'){
 const family=locale==='en'?(fontChoices.find(font=>font.id===choice)?.family??fontFamilies.en):fontFamilies[locale];
 return `${family}_${weight}${weightNames[weight]}`;
}
export function isStandardFamily(family:string|undefined){return !family||['System','sans-serif','serif'].includes(family);}
