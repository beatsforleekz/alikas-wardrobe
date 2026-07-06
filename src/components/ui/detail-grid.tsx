type DetailGridProps = {
  rows: ReadonlyArray<readonly [string, string]>;
};

export function DetailGrid({ rows }: DetailGridProps) {
  return (
    <dl className="detail-grid">
      {rows.map(([label, value]) => (
        <div className="detail-grid-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

