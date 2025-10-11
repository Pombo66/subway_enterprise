'use client';

import { useState } from 'react';
import { runFinalValidation, generateFinalValidationReport, type FinalValidationResults } from '../../lib/test-utils/final-validation-runner';

export default function TestValidationPage() {
  const [results, setResults] = useState<FinalValidationResults | null>(null);
  const [report, setReport] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const testResults = runFinalValidation();
      const testReport = generateFinalValidationReport(testResults);
      setResults(testResults);
      setReport(testReport);
    } catch (error) {
      console.error('Error running tests:', error);
      setReport(`Error running tests: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="s-wrap">
      <div className="menu-header-section">
        <div>
          <h1 className="s-h1">Final Validation Testing</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Test cross-page consistency and visual/functional requirements
          </p>
        </div>
        <button 
          onClick={runTests}
          disabled={isRunning}
          className="menu-add-button-custom"
        >
          {isRunning ? 'Running Tests...' : 'Run Validation Tests'}
        </button>
      </div>

      <section className="s-panel">
        <div className="s-panelCard">
          <p className="s-panelT">Test Instructions</p>
          <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
            <p>This page runs automated validation tests for tasks 5.1 and 5.2:</p>
            <ul style={{ marginLeft: '1.5rem', marginTop: '1rem' }}>
              <li><strong>Task 5.1:</strong> Cross-page consistency validation</li>
              <li><strong>Task 5.2:</strong> Visual and functional testing</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              For complete testing, you should also navigate to both the Menu and Store pages 
              and run the validation tests there.
            </p>
          </div>
        </div>
      </section>

      {results && (
        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Test Results Summary</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {results.summary.passedTests}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Tests Passed</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {results.summary.failedTests}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Tests Failed</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {results.summary.successRate.toFixed(1)}%
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Success Rate</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {report && (
        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Detailed Report</p>
            <pre style={{ 
              background: '#0f172a', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              overflow: 'auto',
              fontSize: '0.75rem',
              lineHeight: '1.4',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap'
            }}>
              {report}
            </pre>
          </div>
        </section>
      )}

      <section className="s-panel">
        <div className="s-panelCard">
          <p className="s-panelT">Manual Testing Links</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a 
              href="/menu" 
              className="s-btn"
              style={{ textDecoration: 'none' }}
            >
              Test Menu Page
            </a>
            <a 
              href="/stores" 
              className="s-btn"
              style={{ textDecoration: 'none' }}
            >
              Test Store Page
            </a>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '1rem' }}>
            Navigate to each page and run validation tests in the browser console using:
            <br />
            <code style={{ background: '#0f172a', padding: '0.25rem', borderRadius: '0.25rem' }}>
              runCompleteValidation()
            </code>
          </p>
        </div>
      </section>
    </div>
  );
}