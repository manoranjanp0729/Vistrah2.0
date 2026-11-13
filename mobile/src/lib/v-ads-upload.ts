import {Platform} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {api,getToken,getApiBase} from './api';
import {validateVideoFile} from '../../../shared/v-ads';

export async function pickAndUploadVideo(advertiserId:string) {
  const picked=await DocumentPicker.getDocumentAsync({
    type:'video/mp4',
    copyToCacheDirectory:Platform.OS==='ios',
    multiple:false,
  });
  if(picked.canceled)return null;
  const asset=picked.assets[0];
  const endpoint='/v-ads/advertisers/'+encodeURIComponent(advertiserId)+'/uploads';

  if(Platform.OS==='web'){
    const body=asset.file;
    if(!body)throw new Error('Could not read the selected video. Choose it again.');
    const size=asset.size??body.size??0;
    validateVideoFile(asset.name,size);
    return await api<{id:string;status:string;size_bytes:number}>(
      endpoint,
      {method:'POST',body,headers:{'Content-Type':'video/mp4'}},
      {timeoutMs:90000}
    );
  }

  const url=getApiBase()+endpoint;
  const token=getToken('seller');
  let uploadUri=asset.uri;
  let tempFile:string|null=null;

  try {
    // On Android, DocumentPicker returns a content:// SAF URI.
    // FileSystem.uploadAsync requires a file:// URI because it converts uri.toFile() in native code.
    // FileSystem.copyAsync supports reading from content:// via Android's ContentResolver,
    // streaming the content into the app's scoped cache directory where FileSystem has read permissions.
    if(uploadUri.startsWith('content://')){
      const cacheDir=FileSystem.cacheDirectory||FileSystem.documentDirectory;
      if(!cacheDir){
        throw new Error('Unable to access device cache directory for upload.');
      }
      tempFile=`${cacheDir}v-ads-${Date.now()}.mp4`;
      await FileSystem.copyAsync({
        from:uploadUri,
        to:tempFile,
      });
      uploadUri=tempFile;
    }

    const info=await FileSystem.getInfoAsync(uploadUri);
    const initialSize=asset.size??asset.file?.size??0;
    const resolvedSize=(info.exists&&!info.isDirectory&&typeof info.size==='number'&&info.size>0)
      ?info.size
      :initialSize;

    validateVideoFile(asset.name,resolvedSize);

    const response=await FileSystem.uploadAsync(url,uploadUri,{
      httpMethod:'POST',
      uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers:{
        'Content-Type':'video/mp4',
        'Content-Length':String(resolvedSize),
        ...(token?{'Authorization':'Bearer '+token}:{}),
      },
    });

    if(response.status>=200&&response.status<300){
      return JSON.parse(response.body) as {id:string;status:string;size_bytes:number};
    }
    let msg='Upload failed ('+response.status+').';
    try{
      const parsed=JSON.parse(response.body);
      if(parsed?.detail)msg=typeof parsed.detail==='string'?parsed.detail:JSON.stringify(parsed.detail);
    }catch{}
    throw new Error(msg);
  } finally {
    if(tempFile){
      await FileSystem.deleteAsync(tempFile,{idempotent:true}).catch(()=>{});
    }
  }
}
