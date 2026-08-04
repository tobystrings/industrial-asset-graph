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
export interface ComponentRecord { id: string; label: string; type: string; parentId: string; verificationStatus: VerificationState; manufacturer?: string; model?: string; evidenceIds: string[]; }
export interface RelationshipRecord { id: string; source: string; target: string; type: RelationshipType; verificationStatus: VerificationState; evidenceIds: string[]; }
export interface RevisionRecord { id: string; entityId: string; fieldPath: string; changedAt: string; changedBy: string; reason: string; evidenceIds: string[]; reviewState: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED'; }
