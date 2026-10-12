import {Platform} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {File,Paths} from 'expo-file-system';
import {evidenceMeta,evidenceLimit} from './evidence-validation';
export async function pickEvidence(){
  const result=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png'],copyToCacheDirectory:true,multiple:false,base64:true});
  if(result.canceled)return null;
  const asset=result.assets[0];const file=Platform.OS==='web'?null:new File(asset.uri);
  try{
    const meta=evidenceMeta(asset.name,asset.size??file?.size??0);
    const raw=Platform.OS==='web'?asset.base64:await file!.base64();
    if(!raw)throw new Error('The selected document could not be read. Please choose it again.');
    const content_base64=raw.replace(/^data:[^,]*;base64,/,'');
    if(content_base64.length>Math.ceil(evidenceLimit/3)*4)throw new Error('Choose a document of at most 2 MB.');
    return {...meta,content_base64};
  }finally{
    if(file&&file.uri.startsWith(Paths.cache.uri)&&file.exists){try{file.delete();}catch{}}
    if(Platform.OS==='web'&&asset.uri.startsWith('blob:'))URL.revokeObjectURL(asset.uri);
  }
}
