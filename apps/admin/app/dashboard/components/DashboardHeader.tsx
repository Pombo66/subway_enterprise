interface DashboardHeaderProps {
  scopeApplied?: string;
  dataError?: boolean;
}

export default function DashboardHeader({ scopeApplied, dataError }: DashboardHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h1 className="s-h1">Subway Enterprise</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {dataError && (
          <span className="s-badge" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
            Data temporarily unavailable
          </span>
        )}
        <span className="s-badge">Scope: {scopeApplied ?? 'global'}</span>
      </div>
    </div>
  );
}