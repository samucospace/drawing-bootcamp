import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { validateBackupPayload } from '../domain/progressStats';
import { BackupPayloadV1 } from '../repositories/types';

export async function shareBackupJsonFile(payload: BackupPayloadV1): Promise<void> {
  const filename = `drawing-bootcamp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create({ intermediates: true, overwrite: true });
  await file.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export 30-Day Drawing Course Backup',
    UTI: 'public.json',
  });
}

export async function pickAndParseBackupJsonFile(): Promise<BackupPayloadV1 | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.[0]?.uri) {
    return null;
  }

  const file = new File(picked.assets[0].uri);
  const text = await file.text();
  const parsed = JSON.parse(text);
  return validateBackupPayload(parsed);
}
