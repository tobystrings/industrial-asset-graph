type Props = {
  coverage: number;
  coverageDisplay: number;
  coverageSubtitle: string;
  fieldItems: number;
  fieldDisplay: number;
  fieldSubtitle: string;
  documentedAssets: number;
  documentedDisplay: number;
  recordCount: number;
};

export default function KpiStrip({
  coverage,
  coverageDisplay,
  coverageSubtitle,
  fieldItems,
  fieldDisplay,
  fieldSubtitle,
  documentedAssets,
  documentedDisplay,
  recordCount,
}: Props) {
  return (
    <div className="kpi-row">
      <article className="kpi-card enter">
        <p className="panel-title">Documentation coverage</p>
        <b>{coverageDisplay}%</b>
        <small>{coverageSubtitle}</small>
        <div className="kpi-bar"><i style={{ width: `${coverage}%` }} /></div>
      </article>
      <article className="kpi-card alert enter" style={{ animationDelay: '40ms' }}>
        <p className="panel-title">Open field items</p>
        <b>{fieldDisplay}</b>
        <small>{fieldSubtitle}</small>
        <div className="kpi-bar"><i style={{ width: `${Math.min(100, fieldItems * 4)}%` }} /></div>
      </article>
      <article className="kpi-card enter" style={{ animationDelay: '80ms' }}>
        <p className="panel-title">Assets documented</p>
        <b>{documentedDisplay}</b>
        <small>of {recordCount} records</small>
        <div className="kpi-bar"><i style={{ width: `${recordCount ? Math.round((documentedAssets / recordCount) * 100) : 0}%` }} /></div>
      </article>
    </div>
  );
}
