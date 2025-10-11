interface Daily {
  day: string;
  orders: number;
  revenue: number;
}

interface ChartSectionProps {
  daily: Daily[];
}

interface ChartProps {
  title: string;
  data: number[];
  color: string;
  fillId: string;
  unit?: string;
}

function Chart({ title, data, color, fillId, unit = '' }: ChartProps) {
  const w = 900;
  const h = 220;
  const pad = 24;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1, max - min);
  const step = data.length > 1 ? (w - 2 * pad) / (data.length - 1) : 0;
  
  const X = (i: number) => pad + step * i;
  const Y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  
  const path = data.map((p, i) => `${i ? 'L' : 'M'} ${X(i)} ${Y(p)}`).join(' ');
  const area = `M ${X(0)} ${Y(data[0] ?? 0)} ${data
    .map((p, i) => `L ${X(i)} ${Y(p)}`)
    .join(' ')} L ${X(data.length - 1)} ${h - pad} L ${X(0)} ${h - pad} Z`;

  const last = data[data.length - 1] ?? 0;
  const prev = data[data.length - 2] ?? 0;
  const delta = prev ? ((last - prev) / prev) * 100 : 0;

  return (
    <section className="s-panel">
      <div className="s-panelCard">
        <p className="s-panelT">{title}</p>
        <div className="s-chart">
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.45" />
                <stop offset="100%" stopColor={color} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {Array.from({ length: 4 }).map((_, i) => (
              <line
                key={i}
                className="s-grid"
                x1={pad}
                x2={w - pad}
                y1={pad + ((h - 2 * pad) / 4) * i}
                y2={pad + ((h - 2 * pad) / 4) * i}
              />
            ))}
            <path d={area} fill={`url(#${fillId})`} />
            <path d={path} fill="none" stroke={color} strokeWidth="2.5" data-line />
            {data.length > 0 && (
              <circle cx={X(data.length - 1)} cy={Y(last)} r="3" fill={color} data-dot />
            )}
          </svg>
        </div>
        <div className="s-glance">
          <div className="s-glItem">
            <span>Points</span>
            <span className="s-strong">{data.length}</span>
          </div>
          <div className="s-glItem">
            <span>Today</span>
            <span className="s-strong">{unit}{last}</span>
          </div>
          <div className="s-glItem">
            <span>Prev</span>
            <span className="s-strong">{unit}{prev}</span>
          </div>
          <div className="s-glItem">
            <span>Δ vs prev</span>
            <span className="s-strong">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ChartSection({ daily }: ChartSectionProps) {
  // Generate fallback data if no daily data
  const orderData = daily.length 
    ? daily.map((d) => d.orders) 
    : [3, 4, 2, 6, 5, 8, 7, 9, 6, 10, 8, 11, 9, 12];
    
  const revenueData = daily.length 
    ? daily.map((d) => Math.max(0, Math.round(d.revenue))) 
    : orderData.map((p) => p * 3);

  return (
    <>
      <Chart
        title="Daily Orders"
        data={orderData}
        color="var(--s-accent)"
        fillId="fill"
      />
      
      <Chart
        title="Daily Revenue (£)"
        data={revenueData}
        color="var(--s-accent-2)"
        fillId="revFill"
        unit="£"
      />
    </>
  );
}