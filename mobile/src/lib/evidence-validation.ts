export const evidenceLimit=2*1024*1024;
export function evidenceMeta(name:string,size:number){
  const extension=name.toLowerCase().split('.').pop();
  const media_type=extension==='pdf'?'application/pdf':extension==='png'?'image/png':['jpg','jpeg'].includes(extension??'')?'image/jpeg':null;
  if(!media_type||!name||name.length>180)throw new Error('Choose a PDF, JPEG or PNG document.');
  if(!Number.isFinite(size)||size<1||size>evidenceLimit)throw new Error('Choose a document of at most 2 MB.');
  return {filename:name,media_type};
}
