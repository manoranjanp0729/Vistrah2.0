import {Platform} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {File,Paths} from 'expo-file-system';
import {fetch as expoFetch} from 'expo/fetch';
import {api} from './api';
import {validateVideoFile} from '../../../shared/v-ads';

export async function pickAndUploadVideo(advertiserId:string) {
  const picked=await DocumentPicker.getDocumentAsync({type:'video/mp4',copyToCacheDirectory:true,multiple:false,base64:false});
  if(picked.canceled)return null;
  const asset=picked.assets[0];
  const file=Platform.OS==='web'?null:new File(asset.uri);
  try {
    const size=asset.size??file?.size??asset.file?.size??0;
    validateVideoFile(asset.name,size);
    // expo/fetch derives Content-Type from Blob.type on native platforms.
    const body=Platform.OS==='web'?asset.file:file?.slice(0,size,'video/mp4');
    if(!body)throw new Error('Could not read the selected video. Choose it again.');
    return await api<{id:string;status:string;size_bytes:number}>(
      '/v-ads/advertisers/'+encodeURIComponent(advertiserId)+'/uploads',
      {method:'POST',body,headers:{'Content-Type':'video/mp4',...(Platform.OS==='web'?{}:{'Content-Length':String(size)})}},
      {timeoutMs:90000,fetcher:expoFetch as typeof fetch});
  } finally {
    if(file&&file.uri.startsWith(Paths.cache.uri)&&file.exists){try{file.delete();}catch{}}
    if(Platform.OS==='web'&&asset.uri.startsWith('blob:'))URL.revokeObjectURL(asset.uri);
  }
}
