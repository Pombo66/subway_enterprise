'use client';

import { useState, useEffect } from 'react';
import { AuditService } from '@/lib/services/audit.service';
import { AuditEntry, AuditQuery, AuditAction, AuditEntity } from '@/lib/types/audit.types';
import { TelemetryErrorBoundary } from '@/app/components/TelemetryErrorBoundary';
import { useToast } from '@/app/components/ToastProvider';

export default function SettingsAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<AuditEntity | ''>('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [actorFilter, setActorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  
  const { showToast } = useToast();
  const limit = 20;

  const loadAuditEntries = async () => {
    try {
      setLoading(true);
      const query: AuditQuery = {
        page: currentPage,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(entityFilter && { entity: entityFilter as AuditEntity }),
        ...(actionFilter && { action: actionFilter as AuditAction }),
        ...(actorFilter && { actor: actorFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };
      
      const response = await AuditService.getAuditEntries(query);
      setEntries(response.entries);
      setTotal(response.total);
    } catch (error) {
      showToast('error', 'Failed to load audit entries');
      console.error('Error loading audit entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEntries();
  }, [currentPage, searchTerm, entityFilter, actionFilter, actorFilter, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadAuditEntries();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setEntityFilter('');
    setActionFilter('');
    setActorFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return { bg: 'var(--s-success-bg)', color: 'var(--s-success)' };
      case 'UPDATE':
        return { bg: 'var(--s-warning-bg)', color: 'var(--s-warning)' };
      case 'DELETE':
        return { bg: 'var(--s-danger-bg)', color: 'var(--s-danger)' };
      default:
        return { bg: 'var(--s-info-bg)', color: 'var(--s-info)' };
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <TelemetryErrorBoundary>
      <section className="s-panel">
        <div className="s-panelCard">
          <div style={{ marginBottom: '24px' }}>
            <p className="s-panelT">Audit Trail</p>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '4px' }}>
              View system audit trail and user activity logs
            </p>
          </div>

          {/* Search and Filter */}
          <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search entity ID or actor..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Entity Type
                </label>
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value as AuditEntity | '')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">All Entities</option>
                  <option value="USER">User</option>
                  <option value="STORE">Store</option>
                  <option value="MENU_ITEM">Menu Item</option>
                  <option value="ORDER">Order</option>
                  <option value="FEATURE_FLAG">Feature Flag</option>
                  <option value="MODIFIER_GROUP">Modifier Group</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Actor
                </label>
                <input
                  type="text"
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  placeholder="Filter by actor..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--s-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--s-text)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Clear Filters
              </button>
            </div>
          </form>

          {/* Audit Entries Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
              Loading audit entries...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
              No audit entries found
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Timestamp
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Actor
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Action
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Entity
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Entity ID
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const actionStyle = getActionColor(entry.action);
                      return (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--s-border)' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--s-muted)' }}>
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {entry.actor}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: actionStyle.bg,
                                color: actionStyle.color,
                              }}
                            >
                              {entry.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            {entry.entity.replace('_', ' ')}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontFamily: 'monospace' }}>
                            {entry.entityId}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedEntry(entry)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: 'transparent',
                                color: 'var(--s-primary)',
                                border: '1px solid var(--s-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} entries
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: currentPage === 1 ? 'var(--s-bg-secondary)' : 'var(--s-secondary)',
                        color: currentPage === 1 ? 'var(--s-muted)' : 'var(--s-text)',
                        border: '1px solid var(--s-border)',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '8px 12px', fontSize: '14px', color: 'var(--s-muted)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: currentPage === totalPages ? 'var(--s-bg-secondary)' : 'var(--s-secondary)',
                        color: currentPage === totalPages ? 'var(--s-muted)' : 'var(--s-text)',
                        border: '1px solid var(--s-border)',
                        borderRadius: '6px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Audit Entry Details Modal */}
      {selectedEntry && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEntry(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--s-bg)',
              border: '1px solid var(--s-border)',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              margin: '20px',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Audit Entry Details
              </h3>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--s-muted)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '4px',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Timestamp
                </label>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {formatTimestamp(selectedEntry.timestamp)}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Actor
                </label>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {selectedEntry.actor}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Action
                </label>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {selectedEntry.action}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Entity Type
                </label>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {selectedEntry.entity.replace('_', ' ')}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Entity ID
                </label>
                <p style={{ margin: 0, fontSize: '14px', fontFamily: 'monospace' }}>
                  {selectedEntry.entityId}
                </p>
              </div>

              {selectedEntry.diff && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: 'var(--s-muted)' }}>
                    Changes
                  </label>
                  <div
                    style={{
                      backgroundColor: 'var(--s-bg-secondary)',
                      border: '1px solid var(--s-border)',
                      borderRadius: '6px',
                      padding: '12px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    {AuditService.formatDiffForDisplay(AuditService.parseDiff(selectedEntry.diff))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </TelemetryErrorBoundary>
  );
}