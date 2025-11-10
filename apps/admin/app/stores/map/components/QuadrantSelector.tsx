'use client';

export type Quadrant = 'ALL' | 'NW' | 'NE' | 'SW' | 'SE';

export interface QuadrantSelectorProps {
  selected: Quadrant;
  onSelect: (quadrant: Quadrant) => void;
  storeCounts?: {
    ALL: number;
    NW: number;
    NE: number;
    SW: number;
    SE: number;
  };
}

export default function QuadrantSelector({ selected, onSelect, storeCounts }: QuadrantSelectorProps) {
  const quadrants: { id: Quadrant; label: string; position: string }[] = [
    { id: 'NW', label: 'NW', position: 'top-left' },
    { id: 'NE', label: 'NE', position: 'top-right' },
    { id: 'SW', label: 'SW', position: 'bottom-left' },
    { id: 'SE', label: 'SE', position: 'bottom-right' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'var(--s-panel, white)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid var(--s-border, #e5e7eb)',
        padding: '12px',
        zIndex: 1000,
      }}
    >
      <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--s-text, #374151)' }}>
        📍 Region View
      </div>

      {/* ALL button */}
      <button
        onClick={() => onSelect('ALL')}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '8px',
          background: selected === 'ALL' ? '#0070f3' : 'transparent',
          color: selected === 'ALL' ? 'white' : 'var(--s-text, #374151)',
          border: selected === 'ALL' ? 'none' : '1px solid var(--s-border, #d1d5db)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s',
        }}
      >
        All Regions {storeCounts && `(${storeCounts.ALL})`}
      </button>

      {/* Quadrant grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
        }}
      >
        {quadrants.map((quadrant) => (
          <button
            key={quadrant.id}
            onClick={() => onSelect(quadrant.id)}
            title={`${quadrant.label} Quadrant${storeCounts ? ` (${storeCounts[quadrant.id]} stores)` : ''}`}
            style={{
              padding: '12px 8px',
              background: selected === quadrant.id ? '#0070f3' : 'transparent',
              color: selected === quadrant.id ? 'white' : 'var(--s-text, #374151)',
              border: selected === quadrant.id ? 'none' : '1px solid var(--s-border, #d1d5db)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{quadrant.label}</span>
            {storeCounts && (
              <span style={{ fontSize: '10px', opacity: 0.8 }}>
                {storeCounts[quadrant.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid var(--s-border, #e5e7eb)',
          fontSize: '10px',
          color: 'var(--s-muted, #6b7280)',
          textAlign: 'center',
        }}
      >
        Focus on specific regions
      </div>
    </div>
  );
}
