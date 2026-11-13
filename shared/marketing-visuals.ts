import {mixColor} from './theme-appearance';

// Editorial colours echo the main marketing page's blue, paper, photography and creative objects.
export const marketingVisuals={
 'performance-marketing':{paper:'#eff7ff',wash:'#dcebf9',accent:'#245d91',ink:'#14354f',mark:'↗',dark:'#142c40'},
 'branding-creative':{paper:'#f4f6ff',wash:'#e4e9fc',accent:'#3e5f95',ink:'#213b59',mark:'Aa.',dark:'#1c2b40'},
 'outdoor-advertising':{paper:'#eff9f5',wash:'#dcf0e7',accent:'#2c6d5e',ink:'#173b35',mark:'OOH',dark:'#17352f'},
 'mobility-billboard':{paper:'#eff8f9',wash:'#dbeef0',accent:'#2c6574',ink:'#1d3d4d',mark:'→',dark:'#16313b'},
} as const;

export function themedMarketingVisuals(key:keyof typeof marketingVisuals,accent:string){
 const base=marketingVisuals[key];
 return {...base,paper:mixColor(base.paper,accent,.055),wash:mixColor(base.wash,accent,.12),dark:mixColor(base.dark,accent,.08)};
}
