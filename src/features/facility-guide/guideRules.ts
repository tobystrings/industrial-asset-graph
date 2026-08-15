import { guideDialogue } from './guideDialogue';
import type { GuideContext, GuideRule } from './guideTypes';

export const guideRules: GuideRule[] = [
  { id: 'cabinet', priority: 90, matches: (c) => c.page === 'cabinet', message: guideDialogue.cabinet },
  { id: 'relationships', priority: 80, matches: (c) => c.page === 'relationships', message: guideDialogue.relationships },
  { id: 'documents', priority: 70, matches: (c) => c.page === 'documents', message: guideDialogue.documents },
  { id: 'assets', priority: 60, matches: (c) => c.page === 'assets', message: guideDialogue.assets },
  { id: 'map', priority: 50, matches: (c) => c.page === 'map', message: guideDialogue.map },
];

export function chooseGuideRule(context: GuideContext, dismissed: string[]) {
  return guideRules.filter((rule) => !dismissed.includes(rule.id) && rule.matches(context)).sort((a, b) => b.priority - a.priority)[0];
}

