import type {MarketplaceSelection} from '../../../shared/marketplace';

export function servicesSelectionKey(params:Record<string,unknown>={}){
 return JSON.stringify(['category','subcategory','type','q'].map(key=>typeof params[key]==='string'?params[key]:''));
}

export function servicesNavigationAction(current:MarketplaceSelection,target:MarketplaceSelection){
 if(servicesSelectionKey(current)===servicesSelectionKey(target))return 'none';
 const levels=['category','subcategory','type'] as const;
 const ancestor=levels.every(key=>!target[key]||target[key]===current[key]);
 const currentDepth=levels.filter(key=>current[key]).length;
 const targetDepth=levels.filter(key=>target[key]).length;
 return ancestor&&!target.q&&(targetDepth<currentDepth||Boolean(current.q))?'dismissTo':'push';
}
