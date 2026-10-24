import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const cell = (c: unknown) => '"' + String(c).replace(/"/g, '""') + '"';

/** Writes a CSV file to the app cache and opens the share sheet (replaces the browser download). */
export async function shareCsv(name: string, rows: (string | number)[][]): Promise<boolean> {
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n');
  const uri = (FileSystem.cacheDirectory ?? '') + name;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: name });
    return true;
  }
  return false;
}

/** Plain text file (document summaries, receipts). */
export async function shareText(name: string, text: string, mimeType = 'text/plain'): Promise<boolean> {
  const uri = (FileSystem.cacheDirectory ?? '') + name;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType, dialogTitle: name }); return true; }
  return false;
}
