import activeFacilityPackage from '../facility/activeFacility';
const { documents } = activeFacilityPackage;
import { capturedPlantFacts } from './walkdown';
import { reconnectAfterFault, resolveComponentId } from './productLookup';
import type { IoSignalRecord } from '../types/facility';

export type FaultCard = {
  componentId: string;
  status: 'RECORDED' | 'FIELD_VERIFY';
  signals: IoSignalRecord[];
  message: string;
  recoverySteps: string[];
  troubleshootingPath: string;
  troubleshootingState: string;
};

export function faultCardFor(deviceOrComponentId: string): FaultCard {
  const componentId = resolveComponentId(deviceOrComponentId);
  const reconnect = reconnectAfterFault(componentId);
  const facts = capturedPlantFacts(componentId);
  const recoverySteps = facts.recovery ? [facts.recovery] : [];
  const doc = documents.find((item) => item.path.endsWith('troubleshooting.md') && (
    item.assetId === 'L2-CC-001' && componentId.startsWith('L2-CC')
      || item.assetId === 'FG-L4-MTN-001' && componentId.startsWith('FG-L4')
  )) ?? documents.find((item) => item.category === 'Troubleshooting');
  return {
    componentId,
    status: reconnect.status,
    signals: reconnect.signals,
    message: reconnect.message,
    recoverySteps,
    troubleshootingPath: doc?.path ?? 'docs/control-cabinets/line2/troubleshooting.md',
    troubleshootingState: doc?.state ?? 'NOT_STARTED',
  };
}
