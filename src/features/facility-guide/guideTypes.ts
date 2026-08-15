export type GuideAnimation = 'idle' | 'enter' | 'talk' | 'point' | 'warning' | 'success' | 'exit' | 'sleep';
export type GuidePage = 'map' | 'assets' | 'relationships' | 'documents' | 'cabinet';
export type GuideActionId = 'show-map' | 'show-assets' | 'show-relationships' | 'show-documents' | 'open-cabinet' | 'start-tour' | 'next-tour';

export interface GuideContext {
  page: GuidePage;
  assetId?: string;
  areaId?: string;
  missingFields?: string[];
  documentationPercent?: number;
  relationshipCount?: number;
}

export interface GuideAction { id: GuideActionId; label: string; primary?: boolean }
export interface GuideMessage { id: string; title: string; body: string; animation?: GuideAnimation; actions?: GuideAction[]; target?: string }
export interface GuideRule { id: string; priority: number; cooldownMs?: number; matches: (context: GuideContext) => boolean; message: (context: GuideContext) => GuideMessage }
export interface GuidePreferences { enabled: boolean; automaticTips: boolean; muted: boolean; animationMode: 'full' | 'reduced' | 'off'; dismissed: string[]; tourComplete: boolean }

