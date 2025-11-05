'use client';

import { useEffect, useRef, useState } from 'react';
import { StoreWithActivity } from '../types';

interface FallbackMapProps {
  stores: StoreWithActivity[];
  onStoreSelect: (store: StoreWithActivity) => void;
  width?: number;
  height?: number;
}

export default function FallbackMap({ 
  stores, 
  onStoreSelect, 
  width = 800, 
  height = 600 
}: FallbackMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredStore, setHoveredStore] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw world map outline (simplified)
    drawWorldOutline(ctx, width, height);

    // Draw stores
    stores.forEach(store => {
      drawStore(ctx, store, width, height, hoveredStore === store.id);
    });

    // Draw legend
    drawLegend(ctx, width, height);

  }, [stores, width, height, hoveredStore]);

  const drawWorldOutline = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    
    // Simple world outline
    ctx.beginPath();
    // Rough continent outlines
    ctx.rect(w * 0.1, h * 0.2, w * 0.8, h * 0.6);
    ctx.stroke();
    
    // Grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    
    // Latitude lines
    for (let i = 1; i < 6; i++) {
      const y = (h * i) / 6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Longitude lines
    for (let i = 1; i < 8; i++) {
      const x = (w * i) / 8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  };

  const drawStore = (
    ctx: CanvasRenderingContext2D, 
    store: StoreWithActivity, 
    w: number, 
    h: number,
    isHovered: boolean
  ) => {
    // Convert lat/lng to canvas coordinates
    const x = ((store.longitude + 180) / 360) * w;
    const y = ((90 - store.latitude) / 180) * h;

    // Draw store marker
    const radius = isHovered ? 8 : 6;
    const color = store.recentActivity ? '#22c55e' : '#3b82f6';
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw pulse animation for active stores
    if (store.recentActivity) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    // Draw store name on hover
    if (isHovered) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 10, y - 15, 120, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(store.name, x + 15, y - 2);
    }
  };

  const drawLegend = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const legendX = w - 150;
    const legendY = 20;
    
    // Legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(legendX, legendY, 140, 80);
    
    // Legend title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Store Status', legendX + 10, legendY + 20);
    
    // Active stores
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(legendX + 20, legendY + 40, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText('Active', legendX + 35, legendY + 45);
    
    // Inactive stores
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(legendX + 20, legendY + 60, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('Inactive', legendX + 35, legendY + 65);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked store
    const clickedStore = stores.find(store => {
      const storeX = ((store.longitude + 180) / 360) * width;
      const storeY = ((90 - store.latitude) / 180) * height;
      const distance = Math.sqrt((x - storeX) ** 2 + (y - storeY) ** 2);
      return distance <= 10; // Click tolerance
    });

    if (clickedStore) {
      onStoreSelect(clickedStore);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find hovered store
    const hoveredStoreId = stores.find(store => {
      const storeX = ((store.longitude + 180) / 360) * width;
      const storeY = ((90 - store.latitude) / 180) * height;
      const distance = Math.sqrt((x - storeX) ** 2 + (y - storeY) ** 2);
      return distance <= 10;
    })?.id || null;

    setHoveredStore(hoveredStoreId);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      padding: '20px',
      backgroundColor: 'var(--s-bg-secondary)',
      borderRadius: '8px'
    }}>
      <div style={{ 
        marginBottom: '16px', 
        textAlign: 'center',
        color: 'var(--s-muted)'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Fallback Map View</h3>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Interactive canvas-based map showing {stores.length} stores
        </p>
      </div>
      
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        style={{
          border: '1px solid var(--s-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#1a1a1a'
        }}
      />
      
      <div style={{ 
        marginTop: '16px', 
        fontSize: '12px', 
        color: 'var(--s-muted)',
        textAlign: 'center'
      }}>
        Click on store markers to view details • 
        Active stores: {stores.filter(s => s.recentActivity).length} • 
        Total stores: {stores.length}
      </div>
    </div>
  );
}