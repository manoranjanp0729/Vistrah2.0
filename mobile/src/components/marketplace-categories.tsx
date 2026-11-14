import {UiElement} from "./localized-ui";
import {useLanguage} from '../lib/language';
import {View,useWindowDimensions} from 'react-native';
import {router} from 'expo-router';
import {PhotoCard} from './photo-card';
import {useTheme} from '../lib/theme';
import {PhotoCardRail} from './photo-card-rail';
import {marketplaceCategories,marketplaceItemId} from '../lib/marketplace';
import {nativeMarketplacePhoto,nativeMarketplaceAlt} from '../lib/marketplace-photo';
export function MarketplaceCategories({compact=true,exclude=[],homepage=false}:{compact?:boolean;exclude?:readonly string[];homepage?:boolean}){const {label,t}=useLanguage();const {colors}=useTheme();const categories=marketplaceCategories.filter(category=>!exclude.includes(category.slug));const {width}=useWindowDimensions();const cardWidth=homepage&&width<768?(width-32-6-24)/3.5:undefined;return <View style={{gap:8}}><UiElement as={PhotoCardRail} vertical={!homepage} compact={compact} cardWidth={cardWidth} gap={cardWidth?8:undefined} label="Marketplace categories" cards={categories.map(category=><UiElement as={PhotoCard} backgroundColor={colors.surface+'d9'} discovery uniformHomepage={homepage} list={!homepage} compactWidth={cardWidth} key={category.slug} testID={`marketplace-category-${category.slug}`} title={homepage&&category.title==='Home & Everyday Services'?t('catalogue.homeServices'):label(marketplaceItemId(category.slug),category.title)} meta="" source={nativeMarketplacePhoto(marketplaceItemId(category.slug))} imageAlt={nativeMarketplaceAlt(marketplaceItemId(category.slug))} onPress={()=>router.push({pathname:'/services',params:{category:category.slug}})}/>)}/></View>;}
