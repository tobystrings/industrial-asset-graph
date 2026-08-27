import type { FacilityAsset, VerificationState, WalkdownCapture } from '../types/facility';

export type FieldDocumentationCategory = 'identity' | 'electrical' | 'controls' | 'safety' | 'process' | 'condition' | 'evidence';
export type FieldDocumentationTask = { id: string; assetId: string; category: FieldDocumentationCategory; title: string; prompt: string; priority: 'critical' | 'normal'; source: 'record-gap' | 'asset-unknown' | 'baseline'; verificationStatus: VerificationState };

const baseline: Omit<FieldDocumentationTask, 'assetId' | 'id'>[] = [
  { category: 'identity', title: 'Asset identity check', prompt: 'Confirm the asset ID, name, type, area, and line/system while standing at the equipment.', priority: 'normal', source: 'baseline', verificationStatus: 'FIELD_VERIFY' },
  { category: 'condition', title: 'Current condition', prompt: 'Record visible condition, operating state, damage, leaks, noise, or access constraints.', priority: 'normal', source: 'baseline', verificationStatus: 'FIELD_VERIFY' },
  { category: 'evidence', title: 'Context photograph', prompt: 'Capture a context image that clearly identifies the asset and its surroundings.', priority: 'normal', source: 'baseline', verificationStatus: 'FIELD_VERIFY' },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function fieldDocumentationTasks(asset: FacilityAsset): FieldDocumentationTask[] {
  const tasks: FieldDocumentationTask[] = [];
  const add = (task: Omit<FieldDocumentationTask, 'assetId' | 'id'>) => tasks.push({ ...task, id: `${asset.id}:${task.category}:${slug(task.title)}`, assetId: asset.id });
  if (!asset.manufacturer.value || asset.manufacturer.verificationStatus !== 'VERIFIED') add({ category: 'identity', title: 'Manufacturer nameplate', prompt: 'Record the manufacturer exactly as shown and capture supporting evidence.', priority: 'critical', source: 'record-gap', verificationStatus: asset.manufacturer.verificationStatus });
  if (!asset.model.value || asset.model.verificationStatus !== 'VERIFIED') add({ category: 'identity', title: 'Model number', prompt: 'Record the complete model number exactly as shown.', priority: 'critical', source: 'record-gap', verificationStatus: asset.model.verificationStatus });
  if (!asset.serialNumber.value || asset.serialNumber.verificationStatus !== 'VERIFIED') add({ category: 'identity', title: 'Serial or asset identifier', prompt: 'Record all visible identifiers without choosing between conflicting labels.', priority: 'critical', source: 'record-gap', verificationStatus: asset.serialNumber.verificationStatus });
  asset.unknowns.forEach((unknown) => add({ category: /volt|amp|power|disconnect|feed/i.test(unknown) ? 'electrical' : /plc|control|signal|io/i.test(unknown) ? 'controls' : /safe|stop|guard|interlock/i.test(unknown) ? 'safety' : /upstream|downstream|product|process/i.test(unknown) ? 'process' : 'condition', title: unknown, prompt: `Verify in the field: ${unknown}`, priority: 'critical', source: 'asset-unknown', verificationStatus: 'FIELD_VERIFY' }));
  baseline.forEach(add);
  return tasks.filter((task, index, all) => all.findIndex((item) => item.id === task.id) === index);
}

export function taskCaptureCount(task: FieldDocumentationTask, captures: WalkdownCapture[]): number {
  return captures.filter((capture) => capture.targetId === task.id).length;
}

export function fieldDocumentationProgress(tasks: FieldDocumentationTask[], captures: WalkdownCapture[]) {
  const captured = tasks.filter((task) => taskCaptureCount(task, captures) > 0).length;
  const reviewed = tasks.filter((task) => captures.some((capture) => capture.targetId === task.id && capture.review && capture.review !== 'pending')).length;
  return { total: tasks.length, captured, reviewed, open: tasks.length - captured, percent: tasks.length ? Math.round(captured / tasks.length * 100) : 100 };
}
