import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEditorImage,validateEditorPageSize,editorPageMaxCharacters} from '../../shared/editor-image.ts';
test('device photos accept supported formats and reject oversized or unsupported files',()=>{
 for(const type of ['image/jpeg','image/png','image/webp','image/gif'])assert.doesNotThrow(()=>validateEditorImage(type,400000));
 for(const size of [0,-1,400001,Infinity,NaN])assert.throws(()=>validateEditorImage('image/jpeg',size));
 for(const type of ['image/svg+xml','text/html',''])assert.throws(()=>validateEditorImage(type,100));
});
test('embedded photos respect the whole-page budget before replacing saved content',()=>{
 assert.doesNotThrow(()=>validateEditorPageSize({sections:[{images:[{url:'data:image/png;base64,aGVsbG8='}]}]}));
 assert.throws(()=>validateEditorPageSize({images:['A'.repeat(editorPageMaxCharacters)]}));
 // Server serializes non-ASCII as escaped JSON, so byte-sized checks alone undercount.
 assert.throws(()=>validateEditorPageSize({title:'\u0c95'.repeat(150000)}));
});
