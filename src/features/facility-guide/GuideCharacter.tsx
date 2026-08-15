import { guideAnimationClass } from './guideAnimations';
import type { GuideAnimation } from './guideTypes';
export function GuideCharacter({ animation = 'idle', mode }: { animation?: GuideAnimation; mode: 'full' | 'reduced' | 'off' }) { return <div className={`guide-character ${guideAnimationClass(animation, mode)}`} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/facility-guide/guide-idle.png`} alt="" /></div>; }

