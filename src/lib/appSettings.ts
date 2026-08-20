export type AppSettings = {
  contrast: 'standard' | 'high';
  motion: 'system' | 'reduced';
  mapZoom: 100 | 125 | 150;
  mapDetails: 'legend' | 'cabinets' | 'areas' | 'notes';
};

const KEY = 'iag-app-settings';
const defaults: AppSettings = { contrast: 'standard', motion: 'system', mapZoom: 100, mapDetails: 'legend' };

export function loadAppSettings(): AppSettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return defaults; }
}

export function applyAppSettings(settings = loadAppSettings()) {
  document.documentElement.dataset.iagContrast = settings.contrast;
  document.documentElement.dataset.iagMotion = settings.motion;
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  applyAppSettings(settings);
  window.dispatchEvent(new CustomEvent<AppSettings>('iag-settings-changed', { detail: settings }));
}
