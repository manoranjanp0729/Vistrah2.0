import taxonomy from '../../../shared/marketplace-taxonomy.json';
import legacy from '../../../shared/marketplace-legacy-map.json';
import {createMarketplace,type MarketplaceLegacyMap} from '../../../shared/marketplace';
export {marketplaceUrl,marketplaceCategoryUrl,marketplaceItemId,isSingleTypeSubcategory,type MarketplaceSelection} from '../../../shared/marketplace';
export const {marketplaceCategories,taxonomyCounts,resolveMarketplaceSelection,legacyMarketplaceSelection,searchMarketplace,searchMarketplaceEntries}=createMarketplace(taxonomy,legacy as MarketplaceLegacyMap);
