'use client';

import { useEffect, useState } from 'react';

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export function PhotosTab({ storeId }: { storeId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/photos`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [storeId]);

  const handleAddPhoto = async () => {
    if (!newPhotoUrl) return;

    try {
      const response = await fetch(`/api/stores/${storeId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newPhotoUrl, caption: newPhotoCaption || undefined })
      });

      if (response.ok) {
        await fetchPhotos();
        setShowAddModal(false);
        setNewPhotoUrl('');
        setNewPhotoCaption('');
      }
    } catch (err) {
      alert('Failed to add photo');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      const response = await fetch(`/api/stores/${storeId}/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPhotos();
      }
    } catch (err) {
      alert('Failed to delete photo');
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading photos...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ color: 'var(--s-muted)', fontSize: '14px' }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setShowAddModal(true)} className="s-btn s-btn--primary">
          + Add Photo
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="s-panel">
          <div className="s-panelCard" style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--s-muted)', marginBottom: '16px' }}>
              No photos added yet
            </p>
            <button onClick={() => setShowAddModal(true)} className="s-btn s-btn--primary">
              Add First Photo
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {photos.map(photo => (
            <div key={photo.id} className="s-panel">
              <div className="s-panelCard" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ 
                  width: '100%', 
                  height: '200px', 
                  backgroundColor: 'var(--s-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={photo.url} 
                    alt={photo.caption || 'Store photo'}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<p style="color: var(--s-muted)">Image not available</p>';
                    }}
                  />
                </div>
                <div style={{ padding: '12px' }}>
                  {photo.caption && (
                    <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--s-text)' }}>
                      {photo.caption}
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '12px' }}>
                    Added {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="s-btn s-btn--secondary"
                    style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--s-bg)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
              Add Photo
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Photo URL
              </label>
              <input
                type="url"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="s-input"
                placeholder="https://example.com/photo.jpg"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginTop: '4px' }}>
                Enter a publicly accessible image URL
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Caption (Optional)
              </label>
              <input
                type="text"
                value={newPhotoCaption}
                onChange={(e) => setNewPhotoCaption(e.target.value)}
                className="s-input"
                placeholder="Store front view"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewPhotoUrl('');
                  setNewPhotoCaption('');
                }}
                className="s-btn s-btn--secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPhoto}
                className="s-btn s-btn--primary"
                disabled={!newPhotoUrl}
              >
                Add Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
