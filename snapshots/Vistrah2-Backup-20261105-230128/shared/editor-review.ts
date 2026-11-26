import type {VistrahPage} from './edit-vistrah';

/** Human-readable changes from the last loaded or saved draft. */
export function editorChanges(before:VistrahPage,after:VistrahPage):string[]{
 const changes:string[]=[];
 if(before.name!==after.name)changes.push('Page name updated');
 if(before.description!==after.description)changes.push('Page description updated');
 if(before.target_platform!==after.target_platform)changes.push('Publishing audience updated');
 const original=new Map(before.sections.map(section=>[section.id,section]));
 const next=new Set(after.sections.map(section=>section.id));
 for(const section of before.sections)if(!next.has(section.id))changes.push('Removed: '+section.name);
 for(const section of after.sections){
  const old=original.get(section.id);
  if(!old){changes.push('Added: '+section.name);continue;}
  if(old.enabled!==section.enabled)changes.push((section.enabled?'Shown: ':'Hidden: ')+section.name);
  if(old.order!==section.order)changes.push('Moved: '+section.name);
  const editable=['name','variation','content','images','features','action_href','video_urls'] as const;
  if(editable.some(key=>JSON.stringify(old[key])!==JSON.stringify(section[key])))changes.push('Edited: '+section.name);
 }
 return changes;
}
