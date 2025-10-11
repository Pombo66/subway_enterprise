'use client';

export default function TestStylesPage() {
  return (
    <main>
      <div className="s-wrap">
        <div className="s-panelCard">
          <h1 className="s-h1">Style Test Page</h1>
          <p className="s-panelT">This should have dark background and styled text</p>
          
          <div className="form-group">
            <label className="form-label">Test Input</label>
            <input className="s-input" placeholder="This should be styled" />
          </div>
          
          <div className="form-group">
            <button className="s-btn s-btn--md">Test Button</button>
          </div>
          
          <div className="menu-table">
            <div className="menu-header">
              <div className="menu-cell">Test Header</div>
            </div>
            <div className="menu-body">
              <div className="menu-row">
                <div className="menu-cell">
                  <div className="menu-item-name">Test Item</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}