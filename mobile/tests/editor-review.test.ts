import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editorChanges} from '../../shared/editor-review.ts';
import type {VistrahPage,PageSection} from '../../shared/edit-vistrah.ts';

const section:PageSection={id:'one',name:'Welcome',type:'custom',variation:'content_grid',available_variations:[],features:[],images:[],order:1,enabled:true,content:{en:{title:'Hello'}}};
const page:VistrahPage={id:'page-home',slug:'home',name:'Home',path:'/',description:'',target_platform:'all',status:'DRAFT',revision:1,sections:[section]};
test('review names edited, hidden, moved, removed and added sections',()=>{
 const before={...page,sections:[section,{...section,id:'removed',name:'Removed section',order:2}]};
 const after={...page,sections:[{...section,order:2,enabled:false,content:{en:{title:'New heading'}}},{...section,id:'added',name:'New section',order:1}]};
 assert.deepEqual(editorChanges(before,after),['Removed: Removed section','Hidden: Welcome','Moved: Welcome','Edited: Welcome','Added: New section']);
 assert.equal(before.sections[0].enabled,true);
});
test('saved draft has no unsaved changes; audience and translated/media edits are included',()=>{
 assert.deepEqual(editorChanges(page,structuredClone(page)),[]);
 assert.deepEqual(editorChanges(page,{...page,target_platform:'mobile',sections:[{...section,content:{en:{title:'Hello'},kn:{title:'ನಮಸ್ಕಾರ'}},images:[{url:'/image.png'}]}]}),['Publishing audience updated','Edited: Welcome']);
});
