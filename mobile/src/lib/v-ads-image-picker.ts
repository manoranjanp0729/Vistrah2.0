import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Pick an image and convert it to a base64 data URI for video compilation.
 * Works seamlessly on Web, iOS, and Android.
 */
export async function pickImageForVideo(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || !result.assets.length) {
    return null;
  }

  const asset = result.assets[0];

  if (Platform.OS === 'web') {
    if (asset.file) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file. Please try another image.'));
        reader.readAsDataURL(asset.file!);
      });
    }
    return asset.uri;
  }

  let uri = asset.uri;
  try {
    if (uri.startsWith('content://')) {
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (cacheDir) {
        const ext = asset.name?.split('.').pop() || 'jpg';
        const tempPath = `${cacheDir}vad-img-${Date.now()}.${ext}`;
        await FileSystem.copyAsync({ from: uri, to: tempPath });
        uri = tempPath;
      }
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const mime = asset.mimeType || (asset.name?.endsWith('.png') ? 'image/png' : 'image/jpeg');
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    throw new Error('Could not read image file: ' + (err as Error).message);
  }
}

