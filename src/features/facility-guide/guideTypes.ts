import type { PageId } from '../../navigation/pages';
import type { VerificationState } from '../../types/facility';

export type GuideAnimation = 'idle' | 'enter' | 'talk' | 'think' | 'point' | 'warning' | 'success' | 'exit' | 'sleep';
export type GuidePage = PageId;
export type GuidePersonality = 'professional' | 'crew' | 'full';
export type GuideActionId = 'show-map' | 'show-assets' | 'show-relationships' | 'show-documents' | 'open-cabinet' | 'start-tour' | 'next-tour' | 'capture-note' | 'attach-evidence' | 'capture-electrical' | 'link-asset' | 'review' | 'service' | 'reports';
export interface GuideContext {
  page: GuidePage; routePage?: GuidePage; facilityId?: string; facilityName?: string;
  assetId?: string; assetName?: string; areaId?: string; areaName?: string;
  connectionId?: string; editingMap?: boolean;
  missingFields?: string[]; documentationPercent?: number; requiredDocuments?: number;
  relationshipCount?: number; verifiedRelationships?: number; upstreamCount?: number; downstreamCount?: number;
  evidenceCount?: number; disputedCount?: number; verification?: VerificationState; electricalGaps?: string[];
  facts?: { label: string; value: string; state: VerificationState | 'UNVERIFIED'; source: string }[];
  links?: { id: string; label: string; state: VerificationState; evidenceCount: number }[];
}
export interface GuideAction { id: GuideActionId; label: string; primary?: boolean }
export interface GuideMessage { id: string; title: string; body: string; animation?: GuideAnimation; actions?: GuideAction[]; target?: string }
export interface GuideRule { id: string; priority: number; cooldownMs?: number; matches: (context: GuideContext) => boolean; message: (context: GuideContext) => GuideMessage }
export interface GuidePreferences {
  enabled: boolean; automaticTips: boolean; muted: boolean;
  animationMode: 'full' | 'reduced' | 'off'; personality: GuidePersonality;
  reminderFrequency: 'occasional' | 'rare'; snoozedUntil: number; lastReminderAt: number;
  dismissed: string[]; tourComplete: boolean;
}
