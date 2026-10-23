export const editorImageMaxBytes=400000;
export const editorPageMaxCharacters=850000;
export const editorImageTypes=['image/jpeg','image/png','image/webp','image/gif'];
export function validateEditorImage(type:string,size:number){
 if(!editorImageTypes.includes(type))throw new Error('Choose a JPG, PNG, WebP or GIF photo.');
 if(!Number.isFinite(size)||size<=0||size>editorImageMaxBytes)throw new Error('Choose a photo smaller than 400 KB.');
}
export function validateEditorPageSize(page:unknown){
 // Match the server's escaped JSON accounting, leaving room for metadata.
 const serialized=JSON.stringify(page).replace(/[^\x00-\x7f]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(serialized.length>editorPageMaxCharacters)throw new Error('These photos are too large for this page. Choose a smaller photo or use an image link.');
}
