import { createContext, useContext, type ReactNode } from 'react';
import activeFacilityPackage from './activeFacility';
import type { FacilityPackage } from './types';

const FacilityContext = createContext<FacilityPackage | null>(null);

export function FacilityProvider({
  children,
  value = activeFacilityPackage,
}: {
  children: ReactNode;
  value?: FacilityPackage;
}) {
  return <FacilityContext.Provider value={value}>{children}</FacilityContext.Provider>;
}

export function useFacility(): FacilityPackage {
  const value = useContext(FacilityContext);
  if (!value) throw new Error('useFacility must be used within FacilityProvider');
  return value;
}
