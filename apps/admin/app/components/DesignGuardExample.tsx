'use client';

/**
 * Design Guard Example Component
 * 
 * This component demonstrates how the Design Guard system works by showing
 * both compliant and non-compliant elements. Use this in development to
 * test the Design Guard warnings.
 * 
 * To see warnings:
 * 1. Enable development mode
 * 2. Open browser console
 * 3. Render this component
 * 4. Look for Design Guard warnings about non-compliant elements
 */
export default function DesignGuardExample() {
  return (
    <div className="s-panelCard">
      <h3 className="s-panelT">Design Guard Example</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Compliant elements - should NOT trigger warnings */}
        <div>
          <h4 style={{ color: '#10b981', marginBottom: '0.5rem' }}>✅ Compliant Elements (No Warnings)</h4>
          <button className="s-btn">Subway Button</button>
          <input className="s-input" placeholder="Subway Input" style={{ marginLeft: '0.5rem' }} />
          <select className="s-select" style={{ marginLeft: '0.5rem' }}>
            <option>Subway Select</option>
          </select>
          <textarea className="s-textarea" placeholder="Subway Textarea" style={{ marginLeft: '0.5rem', width: '200px' }} />
        </div>

        {/* Non-compliant elements - SHOULD trigger warnings */}
        <div>
          <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>❌ Non-Compliant Elements (Should Warn)</h4>
          <button className="custom-btn" style={{ padding: '0.5rem', marginRight: '0.5rem' }}>
            Custom Button (should warn)
          </button>
          <input className="custom-input" placeholder="Custom Input (should warn)" style={{ padding: '0.5rem', marginRight: '0.5rem' }} />
          <select className="custom-select" style={{ padding: '0.5rem', marginRight: '0.5rem' }}>
            <option>Custom Select (should warn)</option>
          </select>
        </div>

        {/* Opted-out elements - should NOT trigger warnings */}
        <div>
          <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>🔇 Opted-Out Elements (No Warnings)</h4>
          <button className="legacy-btn" data-allow-unstyled="true" style={{ padding: '0.5rem', marginRight: '0.5rem' }}>
            Legacy Button (opted out)
          </button>
          <input className="legacy-input" data-design-guard="off" placeholder="Legacy Input (guard off)" style={{ padding: '0.5rem', marginRight: '0.5rem' }} />
        </div>

        {/* Button links */}
        <div>
          <h4 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>🔗 Button Links</h4>
          <a href="#" role="button" className="s-btn" style={{ textDecoration: 'none', marginRight: '0.5rem' }}>
            Compliant Button Link
          </a>
          <a href="#" role="button" className="custom-link" style={{ padding: '0.5rem', textDecoration: 'none' }}>
            Non-Compliant Button Link (should warn)
          </a>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
          <strong>Instructions:</strong> Open browser console to see Design Guard warnings for non-compliant elements.
          In development mode, you should see warnings for elements marked with ❌.
        </p>
      </div>
    </div>
  );
}