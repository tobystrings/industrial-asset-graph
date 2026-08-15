import type { GuideAnimation } from './guideTypes';

export const guideAnimationClass = (animation: GuideAnimation, mode: 'full' | 'reduced' | 'off') =>
  mode === 'off' ? '' : `guide-animation-${mode === 'reduced' ? 'reduced' : animation}`;

