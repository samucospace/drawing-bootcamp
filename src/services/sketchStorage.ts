import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

function getSketchesDir(): Directory {
  const dir = new Directory(Paths.document, 'sketches');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

async function compressAndPersistImage(sourceUri: string, dayNumber: number): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );

  const sketchesDir = getSketchesDir();
  const fileName = `day_${String(dayNumber).padStart(2, '0')}_${Date.now()}.jpg`;
  const destFile = new File(sketchesDir, fileName);
  const tempFile = new File(manipulated.uri);
  tempFile.copySync(destFile);

  return destFile.uri;
}

export async function pickAndSaveSketchFromCamera(dayNumber: number): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Camera permission is required to photograph your sketchbook.');
  }

  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: false,
  });

  if (res.canceled || !res.assets?.[0]?.uri) {
    return null;
  }

  return compressAndPersistImage(res.assets[0].uri, dayNumber);
}

export async function pickAndSaveSketchFromLibrary(dayNumber: number): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photo library permission is required to select a sketch.');
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: false,
  });

  if (res.canceled || !res.assets?.[0]?.uri) {
    return null;
  }

  return compressAndPersistImage(res.assets[0].uri, dayNumber);
}
