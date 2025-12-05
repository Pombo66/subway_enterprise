'use client';

import { useState, useEffect } from 'react';

interface Store {
  operatingHours: string | null;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const defaultHours: DayHours = { open: '09:00', close: '21:00', closed: false };
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function HoursTab({ storeId, store, onUpdate }: { storeId: string; store: Store; onUpdate: () => void }) {
  const [hours, setHours] = useState<OperatingHours>(() => {
    if (store.operatingHours) {
      try {
        return JSON.parse(store.operatingHours);
      } catch {
        return days.reduce((acc, day) => ({ ...acc, [day]: defaultHours }), {} as OperatingHours);
      }
    }
    return days.reduce((acc, day) => ({ ...acc, [day]: defaultHours }), {} as OperatingHours);
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatingHours: hours })
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate();
      } else {
        alert('Failed to save hours');
      }
    } catch (err) {
      alert('Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (store.operatingHours) {
      try {
        setHours(JSON.parse(store.operatingHours));
      } catch {
        setHours(days.reduce((acc, day) => ({ ...acc, [day]: defaultHours }), {} as OperatingHours));
      }
    }
    setIsEditing(false);
  };

  const updateDay = (day: string, field: keyof DayHours, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof OperatingHours],
        [field]: value
      }
    }));
  };

  const applyToAll = (day: string) => {
    const dayHours = hours[day as keyof OperatingHours];
    const newHours = days.reduce((acc, d) => ({
      ...acc,
      [d]: { ...dayHours }
    }), {} as OperatingHours);
    setHours(newHours);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
        {isEditing ? (
          <>
            <button onClick={handleCancel} className="s-btn s-btn--secondary" disabled={saving}>
              Cancel
            </button>
            <button onClick={handleSave} className="s-btn s-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Hours'}
            </button>
          </>
        ) : (
          <button onClick={() => setIsEditing(true)} className="s-btn s-btn--primary">
            Edit Hours
          </button>
        )}
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Operating Hours</p>
          </div>

          <div style={{ padding: '24px' }}>
            {days.map(day => {
              const dayHours = hours[day as keyof OperatingHours];
              return (
                <div
                  key={day}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isEditing ? '120px 1fr 1fr 100px 100px' : '120px 1fr',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--s-border)'
                  }}
                >
                  <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                    {day}
                  </div>

                  {isEditing ? (
                    <>
                      <input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) => updateDay(day, 'open', e.target.value)}
                        disabled={dayHours.closed}
                        className="s-input"
                      />
                      <input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) => updateDay(day, 'close', e.target.value)}
                        disabled={dayHours.closed}
                        className="s-input"
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dayHours.closed}
                          onChange={(e) => updateDay(day, 'closed', e.target.checked)}
                        />
                        <span style={{ fontSize: '14px' }}>Closed</span>
                      </label>
                      <button
                        onClick={() => applyToAll(day)}
                        className="s-btn s-btn--secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Apply to All
                      </button>
                    </>
                  ) : (
                    <div style={{ color: dayHours.closed ? 'var(--s-muted)' : 'var(--s-text)' }}>
                      {dayHours.closed ? (
                        'Closed'
                      ) : (
                        `${dayHours.open} - ${dayHours.close}`
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!store.operatingHours && !isEditing && (
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          backgroundColor: 'var(--s-warning-bg)', 
          border: '1px solid var(--s-warning-border)',
          borderRadius: '8px',
          color: 'var(--s-warning-text)'
        }}>
          <p style={{ fontSize: '14px' }}>
            ⚠️ Operating hours not set. Click "Edit Hours" to configure store hours.
          </p>
        </div>
      )}
    </>
  );
}
