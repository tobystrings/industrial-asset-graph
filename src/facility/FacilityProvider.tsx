import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  listQueuedMutations,
  queueMutation,
  putAttachment,
  putObservation,
  resetPlant,
  replaceQueuedMutations,
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
  ensureInitialAdminPin,
  savePendingChanges,
  setAdminPassphrase,
  verifyAdminPassphrase,
  clientIdentity,
  type IagUser,
  type AuditEvent,
  type PendingChange,
} from './changeControl';
import type { MutationOperation, SyncEntityType } from './syncContract';
import { applyCanonicalEntities, HttpSyncTransport, syncMutationQueue, type SyncSummary } from './syncClient';

const FacilityContext = createContext<FacilityPackage | null>(null);

export interface FacilityEditorApi {
  ready: boolean;
  currentUser: IagUser | null;
  pendingChanges: PendingChange[];
  auditLog: AuditEvent[];
  adminCredentialConfigured: boolean;
  sync: SyncSummary;
  queuedMutationCount: number;
  syncNow(): Promise<void>;
  resolveConflict(mutationId: string, action: 'KEEP_CANONICAL' | 'APPLY_PROPOSED'): Promise<void>;
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

type ChangeDescriptor = { entityType: SyncEntityType; operation: MutationOperation; value?: Record<string, unknown> };

function descriptorForPackage(pkg: FacilityPackage, entityId: string): ChangeDescriptor {
  if (pkg.facility.id === entityId) return { entityType: 'facility', operation: 'UPSERT', value: pkg.facility as unknown as Record<string, unknown> };
  for (const [entityType, rows] of [['area', pkg.areas], ['asset', pkg.assets], ['component', pkg.components], ['relationship', pkg.relationships], ['document', pkg.documents], ['evidence', pkg.evidence]] as const) {
    const value = rows.find((item) => item.id === entityId);
    if (value) return { entityType, operation: 'UPSERT', value: value as unknown as Record<string, unknown> };
  }
  const marker = ((pkg.mapConfig?.markers ?? []) as FacilityMapMarker[]).find((item) => item.id === entityId);
  if (marker) return { entityType: 'map_marker', operation: 'UPSERT', value: marker as unknown as Record<string, unknown> };
  return { entityType: 'asset', operation: 'DELETE' };
}

export function applyReviewedChange(current: FacilityPackage, proposed: FacilityPackage, entityId: string, descriptor: ChangeDescriptor): FacilityPackage {
  const upsert = <T extends { id: string }>(rows: T[], value: T) => rows.some((item) => item.id === value.id) ? rows.map((item) => item.id === value.id ? value : item) : [...rows, value];
  if (descriptor.entityType === 'facility' && descriptor.operation === 'UPSERT') return { ...current, facility: proposed.facility };
  if (descriptor.entityType === 'area') return { ...current, areas: descriptor.operation === 'DELETE' ? current.areas.filter((item) => item.id !== entityId) : upsert(current.areas, proposed.areas.find((item) => item.id === entityId)!) };
  if (descriptor.entityType === 'asset') {
    if (descriptor.operation === 'DELETE') return { ...current, assets: current.assets.filter((item) => item.id !== entityId), components: current.components.filter((item) => item.parentId !== entityId), relationships: current.relationships.filter((item) => item.source !== entityId && item.target !== entityId), documents: current.documents.filter((item) => item.assetId !== entityId), areas: current.areas.map((area) => ({ ...area, assetIds: area.assetIds.filter((id) => id !== entityId) })), mapConfig: { ...(current.mapConfig ?? {}), markers: ((current.mapConfig?.markers ?? []) as FacilityMapMarker[]).filter((item) => item.assetId !== entityId) } };
    const asset = proposed.assets.find((item) => item.id === entityId)!;
    const proposedMarker = ((proposed.mapConfig?.markers ?? []) as FacilityMapMarker[]).find((item) => item.assetId === entityId);
    let markers = [...((current.mapConfig?.markers ?? []) as FacilityMapMarker[])];
    if (proposedMarker) markers = upsert(markers, proposedMarker);
    return { ...current, assets: upsert(current.assets, asset), areas: current.areas.map((area) => ({ ...area, assetIds: area.id === asset.areaId ? [...new Set([...area.assetIds.filter((id) => id !== entityId), entityId])] : area.assetIds.filter((id) => id !== entityId) })), mapConfig: { ...(current.mapConfig ?? {}), markers } };
  }
  if (descriptor.entityType === 'relationship') return { ...current, relationships: descriptor.operation === 'DELETE' ? current.relationships.filter((item) => item.id !== entityId) : upsert(current.relationships, proposed.relationships.find((item) => item.id === entityId)!) };
  if (descriptor.entityType === 'map_marker') {
    const markers = [...((current.mapConfig?.markers ?? []) as FacilityMapMarker[])];
    const next = descriptor.operation === 'DELETE' ? markers.filter((item) => item.id !== entityId) : upsert(markers, ((proposed.mapConfig?.markers ?? []) as FacilityMapMarker[]).find((item) => item.id === entityId)!);
    return { ...current, mapConfig: { ...(current.mapConfig ?? {}), markers: next } };
  }
  if (descriptor.entityType === 'component') return { ...current, components: descriptor.operation === 'DELETE' ? current.components.filter((item) => item.id !== entityId) : upsert(current.components, proposed.components.find((item) => item.id === entityId)!) };
  if (descriptor.entityType === 'document') return { ...current, documents: descriptor.operation === 'DELETE' ? current.documents.filter((item) => item.id !== entityId) : upsert(current.documents, proposed.documents.find((item) => item.id === entityId)!) };
  if (descriptor.entityType === 'evidence') {
    if (descriptor.operation === 'DELETE') return { ...current, evidence: current.evidence.filter((item) => item.id !== entityId), documents: current.documents.filter((item) => !item.evidenceIds.includes(entityId)) };
    const evidence = proposed.evidence.find((item) => item.id === entityId)!;
    const linked = proposed.documents.filter((item) => item.evidenceIds.includes(entityId));
    return { ...current, evidence: upsert(current.evidence, evidence), documents: linked.reduce((rows, item) => upsert(rows, item), current.documents) };
  }
  return current;
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
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => loadPendingChanges(value.facility.id));
  const [auditLog, setAuditLog] = useState<AuditEvent[]>(() => loadAuditEvents(value.facility.id));
  const [adminCredentialConfigured, setAdminCredentialConfigured] = useState(() => hasAdminCredential());
  const [sync, setSync] = useState<SyncSummary>({ phase: 'LOCAL_ONLY', accepted: [], conflicts: [], retained: [] });
  const [queuedMutationCount, setQueuedMutationCount] = useState(0);
  const pkgRef = useRef(pkg);
  const pendingRef = useRef(pendingChanges);

  const apiUrl = ((import.meta as ImportMeta & { env?: { VITE_IAG_API_URL?: string } }).env?.VITE_IAG_API_URL ?? '').trim();

  useEffect(() => {
    void ensureInitialAdminPin().then(() => setAdminCredentialConfigured(true));
  }, []);

  useEffect(() => {
    let alive = true;
    ensurePlantSeed(value)
      .then((stored) => {
        if (!alive) return;
        syncFacilityData(stored);
        setPkg(stored);
        pkgRef.current = stored;
        setReady(true);
        void listQueuedMutations(value.facility.id).then((items) => {
          const conflicts = items.filter((item) => item.reviewState === 'CONFLICT' && item.conflict).map((item) => ({ status: 'conflict' as const, mutationId: item.mutationId, entityId: item.entityId, ...item.conflict! }));
          setQueuedMutationCount(items.length);
          setSync((state) => ({ ...state, phase: conflicts.length ? 'CONFLICT' : apiUrl ? items.some((item) => item.reviewState !== 'LOCAL_DRAFT') ? 'PENDING' : 'SYNCED' : 'LOCAL_ONLY', conflicts, retained: items }));
        });
      })
      .catch(() => {
        if (!alive) return;
        syncFacilityData(value);
        setPkg(value);
        setReady(true);
      });
    return () => { alive = false; };
  }, [apiUrl, value]);

  const commit = useCallback(async (next: FacilityPackage) => {
    syncFacilityData(next);
    pkgRef.current = next;
    setPkg(next);
    await savePlant(next, next.facility.id);
  }, []);

  const savePending = useCallback((next: PendingChange[]) => {
    pendingRef.current = next;
    setPendingChanges(next);
    savePendingChanges(pkg.facility.id, next);
  }, [pkg.facility.id]);

  const appendAudit = useCallback((actor: string, action: string, detail: string) => {
    const next = [{ id: crypto.randomUUID(), actor, action, detail, at: new Date().toISOString() }, ...auditLog];
    setAuditLog(next);
    saveAuditEvents(pkg.facility.id, next);
  }, [auditLog, pkg.facility.id]);

  const commitCanonical = useCallback(async (next: FacilityPackage, entityId: string, reason: string, actor: IagUser, descriptor: ChangeDescriptor) => {
    const latest = pkgRef.current;
    const baseVersion = latest.entityVersions[entityId] ?? 0;
    const versioned = stampRevision({ ...next, packageRevision: latest.packageRevision + 1, entityVersions: { ...latest.entityVersions, [entityId]: baseVersion + 1 } }, entityId, reason, actor.name, 'APPROVED');
    await commit(versioned);
    const evidenceIds = Array.isArray(descriptor.value?.evidenceIds) ? descriptor.value.evidenceIds.filter((id): id is string => typeof id === 'string') : [];
    const evidenceAccess = descriptor.entityType === 'evidence' && typeof descriptor.value?.access === 'string'
      ? [descriptor.value.access as 'PUBLIC_APP' | 'LOCAL_ONLY' | 'RESTRICTED']
      : evidenceIds.map((id) => latest.evidence.find((item) => item.id === id)?.access ?? 'RESTRICTED');
    await queueMutation({ mutationId: crypto.randomUUID(), entityId, entityType: descriptor.entityType, actorId: actor.id, clientId: clientIdentity(), baseVersion, operation: descriptor.operation, createdAt: new Date().toISOString(), reviewState: 'APPROVED', value: descriptor.value, evidenceAccess }, latest.facility.id);
    const queued = await listQueuedMutations(latest.facility.id);
    setQueuedMutationCount(queued.length);
    setSync((state) => ({ ...state, phase: apiUrl ? 'PENDING' : 'LOCAL_ONLY', retained: queued }));
  }, [apiUrl, commit]);

  const syncNow = useCallback(async () => {
    const queue = await listQueuedMutations(pkg.facility.id);
    setQueuedMutationCount(queue.length);
    if (!apiUrl) { setSync({ phase: 'LOCAL_ONLY', accepted: [], conflicts: [], retained: queue }); return; }
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setSync({ phase: 'OFFLINE', accepted: [], conflicts: [], retained: queue }); return; }
    setSync({ phase: 'SYNCING', accepted: [], conflicts: [], retained: queue });
    const transport = new HttpSyncTransport(apiUrl, fetch, import.meta.env.VITE_IAG_WRITE_TOKEN);
    const result = await syncMutationQueue(pkg.facility.id, queue, transport);
    await replaceQueuedMutations(result.retained, pkg.facility.id);
    setQueuedMutationCount(result.retained.length);
    setSync(result);
    try {
      const remote = await transport.pull(pkg.facility.id);
      if (remote.length) await commit(applyCanonicalEntities(pkgRef.current, remote));
    } catch (error) {
      setSync({ ...result, phase: 'ERROR', error: error instanceof Error ? error.message : 'Unable to receive canonical changes.' });
      return;
    }
    if (result.accepted.length && !result.conflicts.length) {
      const entityVersions = { ...pkg.entityVersions };
      for (const accepted of result.accepted) if ('version' in accepted) entityVersions[accepted.entityId] = accepted.version;
      if (!Object.keys(entityVersions).every((id) => pkgRef.current.entityVersions[id] === entityVersions[id])) await commit({ ...pkgRef.current, entityVersions });
    }
  }, [apiUrl, commit, pkg]);

  const resolveConflict = useCallback(async (mutationId: string, action: 'KEEP_CANONICAL' | 'APPLY_PROPOSED') => {
    const queue = await listQueuedMutations(pkg.facility.id);
    const original = queue.find((item) => item.mutationId === mutationId);
    const conflict = sync.conflicts.find((item) => item.mutationId === mutationId);
    if (!original || !conflict) return;
    const retained = queue.filter((item) => item.mutationId !== mutationId);
    if (action === 'APPLY_PROPOSED') retained.push({ ...original, mutationId: crypto.randomUUID(), baseVersion: conflict.currentVersion, createdAt: new Date().toISOString(), reviewState: 'APPROVED' });
    await replaceQueuedMutations(retained, pkg.facility.id);
    setQueuedMutationCount(retained.length);
    setSync({ phase: apiUrl && retained.some((item) => item.reviewState !== 'LOCAL_DRAFT') ? 'PENDING' : 'LOCAL_ONLY', accepted: [], conflicts: [], retained });
    appendAudit(currentUser?.name ?? 'Reviewer', action === 'APPLY_PROPOSED' ? 'Conflict proposed for resolution' : 'Conflict resolved with canonical value', `${original.entityId} · server revision ${conflict.currentVersion}`);
  }, [apiUrl, appendAudit, currentUser?.name, sync.conflicts]);

  const recordChange = useCallback(async (next: FacilityPackage, entityId: string, reason: string, descriptor: ChangeDescriptor) => {
    if (!currentUser?.name) throw new Error('Identify yourself before proposing a change.');
    if (currentUser.role === 'admin') {
      await commitCanonical(applyReviewedChange(pkgRef.current, next, entityId, descriptor), entityId, reason, currentUser, descriptor);
      return;
    }
    savePending([...pendingRef.current, {
      id: crypto.randomUUID(), entityId, reason, proposedBy: currentUser.name,
      proposedAt: new Date().toISOString(), basePackageRevision: pkg.packageRevision,
      entityType: descriptor.entityType, operation: descriptor.operation, value: descriptor.value,
      next: structuredClone(next),
    }]);
    appendAudit(currentUser.name, 'Proposed change', `${reason} · ${entityId}`);
  }, [appendAudit, commitCanonical, currentUser, pkg.packageRevision, savePending]);

  const editor = useMemo<FacilityEditorApi>(() => ({
    ready,
    currentUser,
    pendingChanges,
    auditLog,
    adminCredentialConfigured,
    sync,
    queuedMutationCount,
    syncNow,
    resolveConflict,
    identifyTechnician(name) {
      const user: IagUser = { id: crypto.randomUUID(), name: name.trim(), role: 'technician' };
      setCurrentUser(user);
      saveCurrentUser(user);
      appendAudit(user.name, 'Identified as technician', 'Ready to submit changes for review');
    },
    async configureAdmin(passphrase) {
      await setAdminPassphrase(passphrase);
      const user: IagUser = { id: 'local-admin', name: 'Administrator', role: 'admin' };
      setAdminCredentialConfigured(true);
      setCurrentUser(user);
      saveCurrentUser(user);
      appendAudit(user.name, 'Created administrator credential', 'Local browser credential created');
    },
    async signInAdmin(passphrase) {
      if (!await verifyAdminPassphrase(passphrase)) return false;
      const user: IagUser = { id: 'local-admin', name: 'Administrator', role: 'admin' };
      setCurrentUser(user);
      saveCurrentUser(user);
      appendAudit(user.name, 'Administrator signed in', 'Opened local review access');
      return true;
    },
    signOut() { if (currentUser) appendAudit(currentUser.name, 'Signed out', 'Ended local session'); setCurrentUser(null); saveCurrentUser(null); },
    async approveChange(id) {
      if (currentUser?.role !== 'admin') throw new Error('Administrator sign-in is required to approve changes.');
      const change = pendingRef.current.find((item) => item.id === id);
      if (!change) return;
      const descriptor = change.entityType && change.operation ? { entityType: change.entityType, operation: change.operation, value: change.value } : descriptorForPackage(change.next, change.entityId);
      const reviewed = applyReviewedChange(pkgRef.current, change.next, change.entityId, descriptor);
      await commitCanonical(reviewed, change.entityId, `${change.reason} (proposed by ${change.proposedBy}; approved)`, currentUser, descriptor);
      savePending(pendingRef.current.filter((item) => item.id !== id));
      appendAudit(currentUser.name, 'Approved change', `${change.reason} · ${change.entityId} · proposed by ${change.proposedBy}`);
    },
    rejectChange(id) {
      if (currentUser?.role !== 'admin') throw new Error('Administrator sign-in is required to reject changes.');
      const change = pendingRef.current.find((item) => item.id === id);
      savePending(pendingRef.current.filter((item) => item.id !== id));
      if (change) appendAudit(currentUser.name, 'Rejected change', `${change.reason} · ${change.entityId} · proposed by ${change.proposedBy}`);
    },
    async saveFacility(facility) {
      await recordChange({ ...pkg, facility }, facility.id, 'Facility identity saved in application', { entityType: 'facility', operation: 'UPSERT', value: facility as unknown as Record<string, unknown> });
    },
    async saveArea(area) {
      const areas = pkg.areas.some((item) => item.id === area.id)
        ? pkg.areas.map((item) => item.id === area.id ? area : item)
        : [...pkg.areas, area];
      await recordChange({ ...pkg, areas }, area.id, 'Facility area saved in application', { entityType: 'area', operation: 'UPSERT', value: area as unknown as Record<string, unknown> });
    },
    async deleteArea(areaId) {
      if (pkg.assets.some((asset) => asset.areaId === areaId)) throw new Error('Move or delete assets assigned to this area before deleting it.');
      await recordChange({ ...pkg, areas: pkg.areas.filter((area) => area.id !== areaId) }, areaId, 'Facility area deleted in application', { entityType: 'area', operation: 'DELETE' });
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
      await recordChange({ ...pkg, assets, areas, mapConfig: { ...(pkg.mapConfig ?? {}), markers } }, asset.id, 'Asset saved in application', { entityType: 'asset', operation: 'UPSERT', value: asset as unknown as Record<string, unknown> });
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
      const attached = await listAttachments(assetId, pkg.facility.id);
      for (const attachment of attached) await removeAttachmentRecord(attachment.id, pkg.facility.id);
      await recordChange(next, assetId, 'Asset deleted in application', { entityType: 'asset', operation: 'DELETE' });
    },
    async saveRelationship(relationship) {
      const latest = pkgRef.current;
      const proposedAssetIds = new Set(pendingRef.current.filter((item) => item.entityType === 'asset' && item.operation === 'UPSERT').map((item) => item.entityId));
      const knownAsset = (id: string) => latest.assets.some((item) => item.id === id) || proposedAssetIds.has(id);
      if (!knownAsset(relationship.source) || !knownAsset(relationship.target)) throw new Error('Relationship endpoints must reference documented or concurrently proposed assets.');
      if (relationship.source === relationship.target) throw new Error('Relationship endpoints must be different.');
      if (relationship.verificationStatus === 'VERIFIED' && relationship.evidenceIds.length === 0) throw new Error('VERIFIED relationships require evidence.');
      if (relationship.evidenceIds.some((id) => !latest.evidence.some((item) => item.id === id))) throw new Error('Relationship evidence reference is not present in this facility package.');
      const relationships = pkg.relationships.some((item) => item.id === relationship.id)
        ? pkg.relationships.map((item) => item.id === relationship.id ? relationship : item)
        : [...pkg.relationships, relationship];
      await recordChange({ ...pkg, relationships }, relationship.id, 'Relationship saved in application', { entityType: 'relationship', operation: 'UPSERT', value: relationship as unknown as Record<string, unknown> });
    },
    async deleteRelationship(relationshipId) {
      await recordChange({ ...pkg, relationships: pkg.relationships.filter((item) => item.id !== relationshipId) }, relationshipId, 'Relationship deleted in application', { entityType: 'relationship', operation: 'DELETE' });
    },
    async saveMarker(marker) {
      const markers = [...(pkg.mapConfig?.markers ?? [])] as FacilityMapMarker[];
      const index = markers.findIndex((item) => item.id === marker.id);
      if (index >= 0) markers[index] = marker;
      else markers.push(marker);
      await recordChange({ ...pkg, mapConfig: { ...(pkg.mapConfig ?? {}), markers } }, marker.id, 'Map record saved in application', { entityType: 'map_marker', operation: 'UPSERT', value: marker as unknown as Record<string, unknown> });
    },
    async deleteMarker(markerId) {
      await recordChange({ ...pkg, mapConfig: { ...(pkg.mapConfig ?? {}), markers: ((pkg.mapConfig?.markers ?? []) as FacilityMapMarker[]).filter((item) => item.id !== markerId) } }, markerId, 'Map record deleted in application', { entityType: 'map_marker', operation: 'DELETE' });
    },
    async addAttachment(assetId, file, verificationStatus = 'FIELD_VERIFY') {
      const lower = file.name.toLowerCase();
      const category: AttachmentRecord['category'] = file.type.startsWith('image/') ? 'PHOTO' : file.type === 'application/pdf' || lower.endsWith('.pdf') ? 'PDF' : lower.match(/\.(dwg|dxf|svg)$/) ? 'DRAWING' : 'OTHER';
      const record: AttachmentRecord = {
        id: crypto.randomUUID(), assetId, name: file.name, mimeType: file.type || 'application/octet-stream', size: file.size,
        blob: file, category, verificationStatus, access: 'LOCAL_ONLY', createdAt: new Date().toISOString(),
      };
      await putAttachment(record, pkg.facility.id);
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
      await recordChange({ ...pkg, evidence, documents }, evidenceId, 'Local evidence attached in application', { entityType: 'evidence', operation: 'UPSERT', value: evidence.at(-1) as unknown as Record<string, unknown> });
      return record;
    },
    async deleteAttachment(id) {
      await removeAttachmentRecord(id, pkg.facility.id);
      const uri = `indexeddb://attachment/${id}`;
      await recordChange({
        ...pkg,
        evidence: pkg.evidence.filter((item) => item.pathOrUrl !== uri),
        documents: pkg.documents.filter((item) => item.path !== uri),
      }, id, 'Local evidence removed in application', { entityType: 'evidence', operation: 'DELETE', value: { access: 'LOCAL_ONLY' } });
    },
    attachments: (assetId) => listAttachments(assetId, pkg.facility.id),
    async addObservation(input) {
      const record: ObservationRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      await putObservation(record, pkg.facility.id);
      return record;
    },
    observations: (assetId) => listObservations(assetId, pkg.facility.id),
    exportArchive: () => exportPlantArchive(pkg.facility.id),
    async importArchive(file, mode) {
      const next = await importPlantArchive(file, mode, pkg.facility.id);
      syncFacilityData(next);
      pkgRef.current = next;
      setPkg(next);
    },
    exportBackup: () => exportPlantBackup(pkg.facility.id),
    async importBackup(backup, mode) {
      const next = await importPlantBackup(backup, mode, pkg.facility.id);
      syncFacilityData(next);
      pkgRef.current = next;
      setPkg(next);
    },
    async resetToBaseline() {
      await resetPlant(value);
      const next = structuredClone(value);
      syncFacilityData(next);
      pkgRef.current = next;
      setPkg(next);
    },
  }), [ready, pkg, value, commitCanonical, currentUser, pendingChanges, auditLog, adminCredentialConfigured, sync, queuedMutationCount, syncNow, resolveConflict, appendAudit, recordChange, savePending]);

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
