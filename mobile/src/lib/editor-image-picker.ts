import {Image,Platform} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {validateEditorImage} from '../../../shared/editor-image';

export async function pickEditorImage(onReading?:()=>void){
 const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp','image/gif'],multiple:false,copyToCacheDirectory:true,base64:false});
 if(result.canceled)return null;
 onReading?.();
 const asset=result.assets[0];
 const extension=asset.name.split('.').pop()?.toLowerCase()??'';
 const mime=asset.mimeType||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'} as Record<string,string>)[extension]||'';
 try{
  let url:string;
  if(Platform.OS==='web'){
   if(!asset.file)throw new Error('Could not read this photo. Please choose it again.');
   validateEditorImage(mime,asset.file.size);
   url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read this photo.'));reader.readAsDataURL(asset.file!);});
  }else{
   const info=await FileSystem.getInfoAsync(asset.uri);
   validateEditorImage(mime,info.exists&&!info.isDirectory?info.size:0);
   url=`data:${mime};base64,${await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64})}`;
  }
  const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Could not preview this photo. Choose another image.')),15000);
   Image.getSize(url,(width,height)=>{clearTimeout(timer);resolve({width,height});},()=>{clearTimeout(timer);reject(new Error('This photo could not be opened. Choose another image.'));});
  });
  return {url,title:asset.name.replace(/\.[^.]+$/,''),...dimensions};
 }finally{
  if(Platform.OS!=='web'&&FileSystem.cacheDirectory&&asset.uri.startsWith(FileSystem.cacheDirectory))await FileSystem.deleteAsync(asset.uri,{idempotent:true}).catch(()=>{});
 }
}
