import type { SavedParameterRecord } from '../equipmentImages/model';
export type HimBackup = { stored: boolean; message: string };
export function himBackupStatus(componentId: string, records: SavedParameterRecord[] = []): HimBackup {
  return records.length ? {stored:true,message:`${records.length} saved parameter record(s) for ${componentId}. Saved records are not live values.`} : {stored:false,message:`No HIM / parameter file stored for ${componentId}. Catalog defaults are not field values.`};
}
