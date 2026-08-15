import { useContext } from 'react';
import { FacilityGuideContext } from './GuideProvider';
export function useFacilityGuide() { const value = useContext(FacilityGuideContext); if (!value) throw new Error('useFacilityGuide must be used inside GuideProvider'); return value; }

