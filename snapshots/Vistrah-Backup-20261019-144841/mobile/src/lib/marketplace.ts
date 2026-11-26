import taxonomy from '../../../shared/marketplace-taxonomy.json';
import {createMarketplace} from '../../../shared/marketplace';
export {marketplaceUrl,marketplaceCategoryUrl,marketplaceItemId,type MarketplaceSelection} from '../../../shared/marketplace';
export const {marketplaceCategories,taxonomyCounts,resolveMarketplaceSelection,searchMarketplace,searchMarketplaceEntries}=createMarketplace(taxonomy);