'use client';

export interface ExpansionModeToggleProps {
  isExpansionMode: boolean;
  onToggle: (enabled: boolean) => void;
  loading?: boolean;
  className?: string;
}

/**
 * ExpansionModeToggle component provides a toggle switch for enabling/disabling expansion mode
 */
export default function ExpansionModeToggle({
  isExpansionMode,
  onToggle,
  loading = false,
  className = ''
}: ExpansionModeToggleProps) {
  return (
    <div 
      className={`expansion-mode-toggle ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'var(--s-panel)',
        border: '1px solid var(--s-border)',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500'
      }}
      data-design-guard="off"
    >
      <span style={{ 
        color: 'var(--s-text)',
        whiteSpace: 'nowrap'
      }}>
        Expansion Mode
      </span>
      
      <label style={{ 
        position: 'relative',
        display: 'inline-block',
        width: '44px',
        height: '24px',
        cursor: loading ? 'not-allowed' : 'pointer'
      }}>
        <input
          type="checkbox"
          checked={isExpansionMode}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={loading}
          style={{
            opacity: 0,
            width: 0,
            height: 0
          }}
        />
        
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isExpansionMode ? 'var(--s-primary)' : 'var(--s-border)',
            borderRadius: '12px',
            transition: 'background-color 0.2s ease',
            opacity: loading ? 0.6 : 1
          }}
        />
        
        <span
          style={{
            position: 'absolute',
            content: '',
            height: '18px',
            width: '18px',
            left: isExpansionMode ? '23px' : '3px',
            bottom: '3px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transition: 'left 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        />
      </label>
      
      {loading && (
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid var(--s-border)',
          borderTop: '2px solid var(--s-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}