'use client';

import { useState, useEffect } from 'react';
import { FeatureFlagService } from '@/lib/services/feature-flag.service';
import { FeatureFlag, FeatureFlagQuery, CreateFeatureFlagRequest, UpdateFeatureFlagRequest, FeatureFlagEvent } from '@/lib/types/feature-flag.types';
import { TelemetryErrorBoundary } from '@/app/components/TelemetryErrorBoundary';
import { useToast } from '@/app/components/ToastProvider';
import { useTelemetry } from '@/app/hooks/useTelemetry';

interface FlagFormData {
  key: string;
  enabled: boolean;
  description: string;
}

export default function SettingsFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [recentEvents, setRecentEvents] = useState<FeatureFlagEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<boolean | ''>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState<FlagFormData>({ key: '', enabled: false, description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  const { showToast } = useToast();
  const telemetry = useTelemetry();

  // Track page view on component mount
  useEffect(() => {
    telemetry.trackPageView('/settings/flags', {
      component: 'SettingsFlagsPage',
      totalFlags: flags.length
    });
  }, [telemetry, flags.length]);
  const limit = 20;

  const loadFeatureFlags = async () => {
    try {
      setLoading(true);
      const query: FeatureFlagQuery = {
        page: currentPage,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(enabledFilter !== '' && { enabled: enabledFilter as boolean }),
      };
      
      const response = await FeatureFlagService.getFeatureFlags(query);
      setFlags(response.flags);
      setTotal(response.total);
    } catch (error) {
      showToast('error', 'Failed to load feature flags');
      console.error('Error loading feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    try {
      setEventsLoading(true);
      const events = await FeatureFlagService.getRecentEvents(10);
      setRecentEvents(events);
    } catch (error) {
      console.error('Error loading recent events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatureFlags();
  }, [currentPage, searchTerm, enabledFilter]);

  useEffect(() => {
    loadRecentEvents();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadFeatureFlags();
  };

  const handleCreateFlag = () => {
    setEditingFlag(null);
    setFormData({ key: '', enabled: false, description: '' });
    setFormErrors({});
    setShowCreateForm(true);
  };

  const handleEditFlag = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormData({ key: flag.key, enabled: flag.enabled, description: flag.description || '' });
    setFormErrors({});
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingFlag(null);
    setFormData({ key: '', enabled: false, description: '' });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.key.trim()) {
      errors.key = 'Key is required';
    } else if (!/^[A-Z_][A-Z0-9_]*$/.test(formData.key)) {
      errors.key = 'Key must be uppercase with underscores only (e.g., FEATURE_NAME)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      if (editingFlag) {
        // Update existing flag
        const updateData: UpdateFeatureFlagRequest = {};
        if (formData.enabled !== editingFlag.enabled) updateData.enabled = formData.enabled;
        if (formData.description !== (editingFlag.description || '')) updateData.description = formData.description;
        
        if (Object.keys(updateData).length === 0) {
          showToast('info', 'No changes to save');
          handleCloseForm();
          return;
        }
        
        const result = await FeatureFlagService.updateFeatureFlag(editingFlag.id, updateData);
        
        if (result.success) {
          showToast('success', 'Feature flag updated successfully');
          handleCloseForm();
          loadFeatureFlags();
          loadRecentEvents();
        } else {
          showToast('error', result.error);
        }
      } else {
        // Create new flag
        const createData: CreateFeatureFlagRequest = {
          key: formData.key,
          enabled: formData.enabled,
          description: formData.description || undefined,
        };
        
        const result = await FeatureFlagService.createFeatureFlag(createData);
        
        if (result.success) {
          showToast('success', 'Feature flag created successfully');
          handleCloseForm();
          loadFeatureFlags();
          loadRecentEvents();
        } else {
          showToast('error', result.error);
        }
      }
    } catch (error) {
      showToast('error', 'An unexpected error occurred');
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    const newState = !flag.enabled;
    
    try {
      const result = await FeatureFlagService.toggleFeatureFlag(flag.id, newState);
      
      if (result.success) {
        showToast('success', `Feature flag ${newState ? 'enabled' : 'disabled'}`);
        
        // Track telemetry event for feature flag changes
        telemetry.trackUserAction('feature_flag_toggled', 'SettingsFlagsPage', {
          flagId: flag.id,
          flagKey: flag.key,
          previousState: flag.enabled,
          newState: newState,
          description: flag.description
        });
        
        loadFeatureFlags();
        loadRecentEvents();
      } else {
        showToast('error', result.error);
      }
    } catch (error) {
      showToast('error', 'Failed to toggle feature flag');
      console.error('Error toggling flag:', error);
      
      // Track error event
      telemetry.trackError(error instanceof Error ? error : new Error('Failed to toggle feature flag'), 'SettingsFlagsPage', {
        flagId: flag.id,
        flagKey: flag.key,
        action: 'toggle'
      });
    }
  };

  const handleDeleteFlag = async (flag: FeatureFlag) => {
    if (!confirm(`Are you sure you want to delete feature flag "${flag.key}"?`)) {
      return;
    }
    
    try {
      const result = await FeatureFlagService.deleteFeatureFlag(flag.id);
      
      if (result.success) {
        showToast('success', 'Feature flag deleted successfully');
        
        // Track telemetry event for feature flag deletion
        telemetry.trackUserAction('feature_flag_deleted', 'SettingsFlagsPage', {
          flagId: flag.id,
          flagKey: flag.key,
          wasEnabled: flag.enabled,
          description: flag.description
        });
        
        loadFeatureFlags();
        loadRecentEvents();
      } else {
        showToast('error', result.error);
      }
    } catch (error) {
      showToast('error', 'Failed to delete feature flag');
      console.error('Error deleting flag:', error);
      
      // Track error event
      telemetry.trackError(error instanceof Error ? error : new Error('Failed to delete feature flag'), 'SettingsFlagsPage', {
        flagId: flag.id,
        flagKey: flag.key,
        action: 'delete'
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case 'ENABLED':
        return { bg: 'var(--s-success-bg)', color: 'var(--s-success)' };
      case 'DISABLED':
        return { bg: 'var(--s-danger-bg)', color: 'var(--s-danger)' };
      case 'CREATED':
        return { bg: 'var(--s-info-bg)', color: 'var(--s-info)' };
      case 'UPDATED':
        return { bg: 'var(--s-warning-bg)', color: 'var(--s-warning)' };
      case 'DELETED':
        return { bg: 'var(--s-danger-bg)', color: 'var(--s-danger)' };
      default:
        return { bg: 'var(--s-info-bg)', color: 'var(--s-info)' };
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <TelemetryErrorBoundary>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Feature Flags Management */}
        <section className="s-panel">
          <div className="s-panelCard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <p className="s-panelT">Feature Flags</p>
                <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '4px' }}>
                  Manage feature flags and system toggles
                </p>
              </div>
              <button
                onClick={handleCreateFlag}
                className="btn btn-primary"
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
                Add Flag
              </button>
            </div>

            {/* Search and Filter */}
            <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                    Search Flags
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by key or description..."
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
                    Filter by Status
                  </label>
                  <select
                    value={enabledFilter.toString()}
                    onChange={(e) => setEnabledFilter(e.target.value === '' ? '' : e.target.value === 'true')}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--s-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--s-bg)',
                      color: 'var(--s-text)',
                      fontSize: '14px',
                      minWidth: '120px',
                    }}
                  >
                    <option value="">All Flags</option>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--s-secondary)',
                    color: 'var(--s-text)',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Search
                </button>
              </div>
            </form>

            {/* Feature Flags Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
                Loading feature flags...
              </div>
            ) : flags.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
                No feature flags found
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                          Key
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                          Status
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                          Description
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                          Updated
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {flags.map((flag) => (
                        <tr key={flag.id} style={{ borderBottom: '1px solid var(--s-border)' }}>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontFamily: 'monospace' }}>
                            {flag.key}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => handleToggleFlag(flag)}
                                style={{
                                  width: '40px',
                                  height: '20px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  backgroundColor: flag.enabled ? 'var(--s-success)' : 'var(--s-border)',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s',
                                }}
                              >
                                <div
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    position: 'absolute',
                                    top: '2px',
                                    left: flag.enabled ? '22px' : '2px',
                                    transition: 'left 0.2s',
                                  }}
                                />
                              </button>
                              <span style={{ fontSize: '12px', color: flag.enabled ? 'var(--s-success)' : 'var(--s-muted)' }}>
                                {flag.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--s-muted)' }}>
                            {flag.description || 'No description'}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--s-muted)' }}>
                            {new Date(flag.updatedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleEditFlag(flag)}
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
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFlag(flag)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'transparent',
                                  color: 'var(--s-danger)',
                                  border: '1px solid var(--s-danger)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                      Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} flags
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

        {/* Recent Events */}
        <section className="s-panel">
          <div className="s-panelCard">
            <p className="s-panelT">Recent Events</p>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '4px', marginBottom: '16px' }}>
              Latest feature flag changes
            </p>

            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--s-muted)' }}>
                Loading events...
              </div>
            ) : recentEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--s-muted)' }}>
                No recent events
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentEvents.map((event) => {
                  const eventStyle = getEventColor(event.action);
                  return (
                    <div
                      key={event.id}
                      style={{
                        padding: '12px',
                        border: '1px solid var(--s-border)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--s-bg-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: eventStyle.bg,
                            color: eventStyle.color,
                          }}
                        >
                          {event.action}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--s-muted)' }}>
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontFamily: 'monospace', marginBottom: '4px' }}>
                        {event.flagKey}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>
                        by {event.actor}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Create/Edit Flag Modal */}
      {showCreateForm && (
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
            if (e.target === e.currentTarget) handleCloseForm();
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--s-bg)',
              border: '1px solid var(--s-border)',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              margin: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
              {editingFlag ? 'Edit Feature Flag' : 'Create New Feature Flag'}
            </h3>

            <form onSubmit={handleSubmitForm}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Key *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                  disabled={!!editingFlag}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${formErrors.key ? 'var(--s-danger)' : 'var(--s-border)'}`,
                    borderRadius: '6px',
                    backgroundColor: editingFlag ? 'var(--s-bg-secondary)' : 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="FEATURE_NAME"
                />
                {formErrors.key && (
                  <p style={{ color: 'var(--s-danger)', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.key}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                  placeholder="Describe what this feature flag controls..."
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--s-text)' }}>
                    Enable this feature flag
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--s-text)',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: submitting ? 'var(--s-bg-secondary)' : 'var(--s-primary)',
                    color: submitting ? 'var(--s-muted)' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {submitting ? 'Saving...' : (editingFlag ? 'Update Flag' : 'Create Flag')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TelemetryErrorBoundary>
  );
}