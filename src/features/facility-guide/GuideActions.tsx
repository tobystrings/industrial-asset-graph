import type { GuideAction } from './guideTypes';
export function GuideActions({ actions = [], onAction }: { actions?: GuideAction[]; onAction: (id: GuideAction['id']) => void }) { return <div className="guide-actions">{actions.slice(0, 3).map((action) => <button key={action.id} className={action.primary ? 'primary' : ''} onClick={() => onAction(action.id)}>{action.label}</button>)}</div>; }

