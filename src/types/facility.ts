export type VerificationState = 'VERIFIED' | 'FIELD_VERIFY' | 'INFERRED' | 'DISPUTED' | 'RETIRED';
export type DocumentationState = 'COMPLETE' | 'REVIEW' | 'IN_PROGRESS' | 'DRAFT' | 'NOT_STARTED';
export type RelationshipType = 'LOCATED_IN' | 'CONTAINS' | 'FEEDS' | 'CONTROLS' | 'SENSES' | 'SUPPLIES' | 'ISOLATES' | 'INTERLOCKS_WITH' | 'UPSTREAM_OF' | 'DOWNSTREAM_OF' | 'HAS_DOCUMENT' | 'SUPPORTED_BY_EVIDENCE';

export interface VerifiedFact<T> { value: T | null; verificationStatus: VerificationState; evidenceIds: string[]; unit?: string; note?: string; }
export interface AreaOverlay { x: number; y: number; width: number; height: number; }
export interface FacilityArea { id: string; name: string; shortName: string; status: DocumentationState; overlay: AreaOverlay; assetIds: string[]; }
export interface EvidenceRecord { id: string; type: 'PHOTO' | 'NAMEPLATE' | 'DRAWING' | 'MANUAL' | 'FIELD_TEST' | 'CMMS_RECORD' | 'OTHER'; title: string; pathOrUrl: string; access: 'PUBLIC_APP' | 'LOCAL_ONLY' | 'RESTRICTED'; }
export interface DocumentRecord { id: string; assetId: string; category: string; title: string; path: string; state: DocumentationState; required: boolean; verificationStatus: VerificationState; evidenceIds: string[]; }
export interface FacilityAsset {
  id: string; name: string; description: string; type: string; facilityId: string; areaId: string; line: string;
  verificationStatus: VerificationState; manufacturer: VerifiedFact<string>; model: VerifiedFact<string>; serialNumber: VerifiedFact<string>;
  facts: { label: string; value: VerifiedFact<string | number> }[];
  componentIds: string[]; unknowns: string[];
}
export interface ComponentRecord { id: string; label: string; type: string; parentId: string; verificationStatus: VerificationState; manufacturer?: string; model?: string; evidenceIds: string[]; productFamilyId?: string; }
export interface RelationshipRecord { id: string; source: string; target: string; type: RelationshipType; verificationStatus: VerificationState; evidenceIds: string[]; }
export type SignalKind = 'ANALOG' | 'DIGITAL' | 'NETWORK' | 'DISCRETE';
export interface ProductParam {
  code: string;
  name: string;
  catalogDefault: string | number | null;
  fieldValue: string | number | null;
  unit?: string;
  verificationStatus: VerificationState;
  note?: string;
}
export interface TerminalLegend {
  silk: string;
  meaning: string;
  note?: string;
}
export interface ProductFamily {
  id: string;
  brand: string;
  model: string;
  kind: 'VFD' | 'SPEED_CONTROL' | 'SERVO';
  installStatus: 'INSTALLED' | 'CATALOG_EXAMPLE';
  params: ProductParam[];
  terminals: TerminalLegend[];
  manualId: string;
}
export type WalkdownField = 'dest' | 'motor' | 'recovery' | 'note' | 'param' | 'serial' | 'unknown';
export type ReviewDecision = 'pending' | 'keep' | 'reject';
export interface WalkdownCapture {
  id: string;
  targetId: string;
  field: WalkdownField;
  value: string;
  capturedBy: string;
  capturedAt: string;
  photoRef?: string;
  photoHash?: string;
  review?: ReviewDecision;
  /** Live dest/motor/recovery overlay only when keep + applied. Keep alone is review-only. */
  applied?: boolean;
}
export interface SerialSource {
  id: string;
  assetId: string;
  label: string;
  value: string;
  evidenceId: string;
  verificationStatus: VerificationState;
}
export interface DriveInstance {
  index: number;
  componentId: string;
  cabinetDeviceId: string;
  drawingLabel: string;
  loadLabel: string | null;
  motorHp: string | null;
  destId: string | null;
}
export interface SilkPair {
  fromSilk: string;
  toSilk: string;
  note: string;
}
export interface SilkMap {
  fromFamilyId: string;
  toFamilyId: string;
  pairs: SilkPair[];
  disclaimer: string;
}
export type SystemKind = 'ALL' | 'VFD' | 'PLC' | 'IO' | 'SERVO' | 'POWER';
export interface ManualRecord {
  id: string;
  familyId: string;
  title: string;
  path: string;
  excerpt: string;
  access: 'PUBLIC_APP' | 'LOCAL_ONLY';
}
export interface IoSignalRecord {
  id: string;
  sourceId: string;
  sourceTerminal: string;
  destId: string | null;
  destTerminal: string | null;
  purpose: string;
  kind: SignalKind;
  verificationStatus: VerificationState;
  evidenceIds: string[];
  note?: string;
}
export interface RevisionRecord { id: string; entityId: string; fieldPath: string; changedAt: string; changedBy: string; reason: string; evidenceIds: string[]; reviewState: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED'; }
