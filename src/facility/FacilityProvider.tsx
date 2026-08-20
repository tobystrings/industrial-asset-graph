import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import activeFacilityPackage from './activeFacility';
import type { FacilityIdentity, FacilityMapMarker, FacilityPackage } from './types';
import type { FacilityArea, FacilityAsset, RelationshipRecord } from '../types/facility';
import { syncFacilityData } from '../facilityData';
import {
  deleteAttachment as removeAttachmentRecord,
  ensurePlantSeed,
  exportPlantArchive,
  exportPlantBackup,
  importPlantArchive,
  importPlantBackup,
  listAttachments,
  listObservations,
  putAttachment,
  putObservation,
  resetPlant,
  savePlant,
  type AttachmentRecord,
  type ObservationRecord,
  type PlantBackup,
} from './runtimeDb';
import {
  hasAdminCredential,
  loadCurrentUser,
  loadAuditEvents,
  loadPendingChanges,
  saveAuditEvents,
  saveCurrentUser,
  savePendingChanges,
  setAdminPassphrase,
  verifyAdminPassphrase,
  type IagUser,
  type AuditEvent,
  type PendingChange,
} from './changeControl';

const FacilityContext = createContext<FacilityPackage | null>(null);

export interface FacilityEditorApi {
  ready: boolean;
  currentUser: IagUser | null;
  pendingChanges: PendingChange[];
  auditLog: AuditEvent[];
  adminCredentialConfigured: boolean;
  identifyTechnician(name: string): void;
  configureAdmin(passphrase: string): Promise<void>;
  signInAdmin(passphrase: string): Promise<boolean>;
  signOut(): void;
  approveChange(id: string): Promise<void>;
  rejectChange(id: string): void;
  saveFacility(facility: FacilityIdentity): Promise<void>;
  saveArea(area: FacilityArea): Promise<void>;
  deleteArea(areaId: string): Promise<void>;
  saveAsset(asset: FacilityAsset, marker?: { x: number; y: number }): Promise<void>;
  deleteAsset(assetId: string): Promise<void>;
  saveRelationship(relationship: RelationshipRecord): Promise<void>;
  deleteRelationship(relationshipId: string): Promise<void>;
  saveMarker(marker: FacilityMapMarker): Promise<void>;
  deleteMarker(markerId: string): Promise<void>;
  addAttachment(assetId: string, file: File, verificationStatus?: 'VERIFIED' | 'FIELD_VERIFY'): Promise<AttachmentRecord>;
  deleteAttachment(id: string): Promise<void>;
  attachments(assetId?: string): Promise<AttachmentRecord[]>;
  addObservation(input: Omit<ObservationRecord, 'id' | 'createdAt'>): Promise<ObservationRecord>;
  observations(assetId?: string): Promise<ObservationRecord[]>;
  exportArchive(): Promise<Blob>;
  importArchive(file: Blob, mode: 'replace' | 'merge'): Promise<void>;
  exportBackup(): Promise<PlantBackup>;
  importBackup(backup: PlantBackup, mode: 'replace' | 'merge'): Promise<void>;
  resetToBaseline(): Promise<void>;
}

const EditorContext = createContext<FacilityEditorApi | null>(null);

function stampRevision(pkg: FacilityPackage, entityId: string, reason: string, changedBy: string, reviewState: 'DRAFT' | 'APPROVED' = 'DRAFT'): FacilityPackage {
  return {
    ...pkg,
    revisions: [
      ...pkg.revisions,
      {
        id: crypto.randomUUID(),
        entityId,
        fieldPath: '*',
        changedAt: new Date().toISOString(),
        changedBy,
        reason,
        evidenceIds: [],
        reviewState,
      },
    ],
  };
}

export function FacilityProvider({
  children,
  value = activeFacilityPackage,
}: {
  children: ReactNode;
  value?: FacilityPackage;
}) {
  const [pkg, setPkg] = useState<FacilityPackage>(value);
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<IagUser | null>(() => loadCurrentUser());
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => loadPendingChanges());
  const [auditLog, setAuditLog] = useState<AuditEvent[]>(() => loadAuditEvents());
  const [adminCredentialConfigured, setAdminCredentialConfigured] = useState(() => hasAdminCredential());

  useEffect(() => {
    let alive = true;
    ensurePlantSeed(value)
      .then((stored) => {
        if (!alive) return;
        syncFacilityData(stored);
        setPkg(stored);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        syncFacilityData(value);
        setPkg(value);
        setReady(true);
      });
    return () => { alive = false; };
  }, [value]);

  const commit = useCallback(async (next: FacilityPackage) => {
    syncFacilityData(next);
    setPkg(next);
    await savePlant(next);
  }, []);

  const savePending = useCallback((next: PendingChange[]) => {
    setPendingChanges(next);
    savePendingChanges(next);
  }, []);

  const appendAudit = useCallback((actor: string, action: string, detail: string) => {
    const next = [{ id: crypto.randomUUID(), actor, action, detail, at: new Date().toISOString() }, ...auditLog];
    setAuditLog(next);
    saveAuditEvents(next);
  }, [auditLog]);

  const recordChange = useCallback(async (next: FacilityPackage, entityId: string, reason: string) => {
    if (!currentUser?.name) throw new Error('Identify yourself before proposing a change.');
    if (currentUser.role === 'admin') {
      await commit(stampRevision(next, entityId, reason, currentUser.name, 'APPROVED'));
      return;
    }
    savePending([...pendingChanges, {
      id: crypto.randomUUID(), entityId, reason, proposedBy: currentUser.name,
      proposedAt: new Date().toISOString(), next: structuredClone(next),
    }]);
    appendAudit(currentUser.name, 'Proposed change', `${reason} · ${entityId}`);
  }, [appendAudit, commit, currentUser, pendingChanges, savePending]);

  const editor = useMemo<FacilityEditorApi>(() => ({
    ready,
    currentUser,
    pendingChanges,
    auditLog,
    adminCredentialConfigured,
    identifyTechnician(name) {
      const user: IagUser = { name: name.trim(), role: 'technician' };
      setCurrentUser(user);
      saveCurrentUser(user);
      appendAudit(user.name, 'Identified as technician', 'Ready to submit changes for review');
    },
    async configureAdmin(passphrase) {
      await setAdminPassphrase(passphrase);
      const user: IagUser = { name: 'Administrator', role: 'admin' };
      setAdminCredentialConfigured(true);
      setCurrentUser(user);
      saveCurrentUser(user);
      appendAudit(user.name, 'Created administrator credential', 'Local browser credential created');
    },
    async signInAdmin(passphrase) {
      if (!await verifyAdminPassphrase(passphrase)) return false;
      const user: IagUser = { name: 'Administrator', role: 'admin' };
      setCurrentUser(user);
      saveCurrentUser(user);
      appendAudit(user.name, 'Administrator signed in', 'Opened local review access');
      return true;
    },
    signOut() { if (currentUser) appendAudit(currentUser.name, 'Signed out', 'Ended local session'); setCurrentUser(null); saveCurrentUser(null); },
    async approveChange(id) {
      if (currentUser?.role !== 'admin') throw new Error('Administrator sign-in is required to approve changes.');
      const change = pendingChanges.find((item) => item.id === id);
      if (!change) return;
      await commit(stampRevision(change.next, change.entityId, `${change.reason} (proposed by ${change.proposedBy}; approved)`, currentUser.name, 'APPROVED'));
      savePending(pendingChanges.filter((item) => item.id !== id));
      appendAudit(currentUser.name, 'Approved change', `${change.reason} · ${change.entityId} · proposed by ${change.proposedBy}`);
    },
    rejectChange(id) {
      if (currentUser?.role !== 'admin') throw new Error('Administrator sign-in is required to reject changes.');
      const change = pendingChanges.find((item) => item.id === id);
      savePending(pendingChanges.filter((item) => item.id !== id));
      if (change) appendAudit(currentUser.name, 'Rejected change', `${change.reason} · ${change.entityId} · proposed by ${change.proposedBy}`);
    },
    async saveFacility(facility) {
      await recordChange({ ...pkg, facility }, facility.id, 'Facility identity saved in application');
    },
    async saveArea(area) {
      const areas = pkg.areas.some((item) => item.id === area.id)
        ? pkg.areas.map((item) => item.id === area.id ? area : item)
        : [...pkg.areas, area];
      await recordChange({ ...pkg, areas }, area.id, 'Facility area saved in application');
    },
    async deleteArea(areaId) {
      if (pkg.assets.some((asset) => asset.areaId === areaId)) throw new Error('Move or delete assets assigned to this area before deleting it.');
      await recordChange({ ...pkg, areas: pkg.areas.filter((area) => area.id !== areaId) }, areaId, 'Facility area deleted in application');
    },
    async saveAsset(asset, markerPosition) {
      const assets = pkg.assets.some((item) => item.id === asset.id)
        ? pkg.assets.map((item) => item.id === asset.id ? asset : item)
        : [...pkg.assets, asset];
      const areas = pkg.areas.map((area) => {
        const ids = area.assetIds.filter((id) => id !== asset.id);
        return area.id === asset.areaId ? { ...area, assetIds: [...ids, asset.id] } : { ...area, assetIds: ids };
      });
      const markers = [...(pkg.mapConfig?.markers ?? [])] as FacilityMapMarker[];
      const existingMarker = markers.find((item) => item.assetId === asset.id);
      if (markerPosition || existingMarker) {
        const marker: FacilityMapMarker = {
          id: existingMarker?.id ?? `PIN-${asset.id}`,
          label: asset.name,
          x: markerPosition?.x ?? existingMarker?.x ?? 50,
          y: markerPosition?.y ?? existingMarker?.y ?? 50,
          tone: asset.type.toLowerCase().includes('cabinet') || asset.type.toLowerCase().includes('panel') ? 'cabinet' : asset.type.toLowerCase().includes('machine') || asset.type.toLowerCase().includes('conveyor') ? 'machine' : 'power',
          state: asset.verificationStatus === 'FIELD_VERIFY' ? 'FIELD_VERIFY' : 'LIVE',
          assetId: asset.id,
        };
        const index = markers.findIndex((item) => item.assetId === asset.id || item.id === marker.id);
        if (index >= 0) markers[index] = { ...markers[index], ...marker };
        else markers.push(marker);
      }
      await recordChange({ ...pkg, assets, areas, mapConfig: { ...(pkg.mapConfig ?? {}), markers } }, asset.id, 'Asset saved in application');
    },
    async deleteAsset(assetId) {
      const next: FacilityPackage = {
        ...pkg,
        assets: pkg.assets.filter((item) => item.id !== assetId),
        components: pkg.components.filter((item) => item.parentId !== assetId),
        relationships: pkg.relationships.filter((item) => item.source !== assetId && item.target !== assetId),
        documents: pkg.documents.filter((item) => item.assetId !== assetId),
        evidence: pkg.evidence.filter((item) => !item.pathOrUrl.includes(`/attachment/`) || !item.title.startsWith(`${assetId} · `)),
        areas: pkg.areas.map((area) => ({ ...area, assetIds: area.assetIds.filter((id) => id !== assetId) })),
        mapConfig: { ...(pkg.mapConfig ?? {}), markers: ((pkg.mapConfig?.markers ?? []) as FacilityMapMarker[]).filter((item) => item.assetId !== assetId) },
      };
      const attached = await listAttachments(assetId);
      for (const attachment of attached) await removeAttachmentRecord(attachment.id);
      await recordChange(next, assetId, 'Asset deleted in application');
    },
    async saveRelationship(relationship) {
      const relationships = pkg.relationships.some((item) => item.id === relationship.id)
        ? pkg.relationships.map((item) => item.id === relationship.id ? relationship : item)
        : [...pkg.relationships, relationship];
      await recordChange({ ...pkg, relationships }, relationship.id, 'Relationship saved in application');
    },
    async deleteRelationship(relationshipId) {
      await recordChange({ ...pkg, relationships: pkg.relationships.filter((item) => item.id !== relationshipId) }, relationshipId, 'Relationship deleted in application');
    },
    async saveMarker(marker) {
      const markers = [...(pkg.mapConfig?.markers ?? [])] as FacilityMapMarker[];
      const index = markers.findIndex((item) => item.id === marker.id);
      if (index >= 0) markers[index] = marker;
      else markers.push(marker);
      await recordChange({ ...pkg, mapConfig: { ...(pkg.mapConfig ?? {}), markers } }, marker.id, 'Map record saved in application');
    },
    async deleteMarker(markerId) {
      await recordChange({ ...pkg, mapConfig: { ...(pkg.mapConfig ?? {}), markers: ((pkg.mapConfig?.markers ?? []) as FacilityMapMarker[]).filter((item) => item.id !== markerId) } }, markerId, 'Map record deleted in application');
    },
    async addAttachment(assetId, file, verificationStatus = 'FIELD_VERIFY') {
      const lower = file.name.toLowerCase();
      const category: AttachmentRecord['category'] = file.type.startsWith('image/') ? 'PHOTO' : file.type === 'application/pdf' || lower.endsWith('.pdf') ? 'PDF' : lower.match(/\.(dwg|dxf|svg)$/) ? 'DRAWING' : 'OTHER';
      const record: AttachmentRecord = {
        id: crypto.randomUUID(), assetId, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size,
        blob: file, category, verificationStatus, createdAt: new Date().toISOString(),
      };
      await putAttachment(record);
      const evidenceId = `EV-${record.id}`;
      const evidence = [...pkg.evidence, {
        id: evidenceId,
        type: category === 'PHOTO' ? 'PHOTO' as const : category === 'DRAWING' ? 'DRAWING' as const : category === 'PDF' ? 'MANUAL' as const : 'OTHER' as const,
        title: `${assetId} · ${file.name}`,
        pathOrUrl: `indexeddb://attachment/${record.id}`,
        access: 'LOCAL_ONLY' as const,
      }];
      const documents = category === 'PDF' || category === 'DRAWING' ? [...pkg.documents, {
        id: `DOC-${record.id}`,
        assetId,
        category: category === 'PDF' ? 'Field document' : 'Drawing',
        title: file.name,
        path: `indexeddb://attachment/${record.id}`,
        state: 'DRAFT' as const,
        required: false,
        verificationStatus,
        evidenceIds: [evidenceId],
      }] : pkg.documents;
      await recordChange({ ...pkg, evidence, documents }, record.id, 'Local evidence attached in application');
      return record;
    },
    async deleteAttachment(id) {
      await removeAttachmentRecord(id);
      const uri = `indexeddb://attachment/${id}`;
      await recordChange({
        ...pkg,
        evidence: pkg.evidence.filter((item) => item.pathOrUrl !== uri),
        documents: pkg.documents.filter((item) => item.path !== uri),
      }, id, 'Local evidence removed in application');
    },
    attachments: listAttachments,
    async addObservation(input) {
      const record: ObservationRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      await putObservation(record);
      return record;
    },
    observations: listObservations,
    exportArchive: exportPlantArchive,
    async importArchive(file, mode) {
      const next = await importPlantArchive(file, mode);
      syncFacilityData(next);
      setPkg(next);
    },
    exportBackup: exportPlantBackup,
    async importBackup(backup, mode) {
      const next = await importPlantBackup(backup, mode);
      syncFacilityData(next);
      setPkg(next);
    },
    async resetToBaseline() {
      await resetPlant(value);
      const next = structuredClone(value);
      syncFacilityData(next);
      setPkg(next);
    },
  }), [ready, pkg, value, commit, currentUser, pendingChanges, auditLog, adminCredentialConfigured, appendAudit, recordChange, savePending]);

  return (
    <FacilityContext.Provider value={pkg}>
      <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
    </FacilityContext.Provider>
  );
}

export function useFacility(): FacilityPackage {
  const value = useContext(FacilityContext);
  if (!value) throw new Error('useFacility must be used within FacilityProvider');
  return value;
}

export function useFacilityEditor(): FacilityEditorApi {
  const value = useContext(EditorContext);
  if (!value) throw new Error('useFacilityEditor must be used within FacilityProvider');
  return value;
}
