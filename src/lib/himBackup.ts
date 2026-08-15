export type HimBackup = {
  stored: false;
  message: string;
};

export function himBackupStatus(componentId: string): HimBackup {
  return {
    stored: false,
    message: `No HIM / parameter file stored for ${componentId}. Catalog defaults are not field values.`,
  };
}
