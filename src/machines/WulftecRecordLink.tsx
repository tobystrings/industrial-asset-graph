import { PageLink } from '../navigation/AppShell';
import { isWulftec, modelDetails, readModelState } from './wulftecGraph';
import type { FacilityAsset } from '../types/facility';

export default function WulftecRecordLink({ asset, assembly, children = 'Open 3D model' }: {
  asset: FacilityAsset | undefined; assembly?: string; children?: React.ReactNode;
}) {
  if (!asset || !isWulftec(asset)) return null;
  const state = readModelState(location.search);
  return <PageLink page="wulftec" className="page-primary" details={modelDetails(asset.id, assembly ?? state.selected, assembly ? 'machine' : state.scope, state.explosion)}>{children}</PageLink>;
}
