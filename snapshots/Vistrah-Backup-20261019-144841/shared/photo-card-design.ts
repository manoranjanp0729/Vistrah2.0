// One presentation contract for the desktop website and Expo native/phone clients.
export const photoCardDesign={width:148,height:168,imageHeight:86,imageInset:7,radius:16,imageRadius:11,gap:12,titleSize:13,titleLineHeight:18,titleLines:2,rows:2} as const;
export function twoRowColumns<T>(items:T[]):T[][] {
  const columns:T[][]=[];
  for(let index=0;index<items.length;index+=photoCardDesign.rows)columns.push(items.slice(index,index+photoCardDesign.rows));
  return columns;
}
