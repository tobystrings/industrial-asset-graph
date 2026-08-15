import { markerClass } from './lib/statusMark';
import type { DocumentationState, VerificationState } from './types/facility';

export default function StatusMark({ status, label }: { status: VerificationState | DocumentationState; label?: string }) {
  return <i className={markerClass(status)} aria-hidden={label ? undefined : true} aria-label={label} />;
}
