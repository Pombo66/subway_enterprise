/**
 * ViewportManager - Handles viewport changes with debouncing and coordination
 * Prevents race conditions and excessive API calls from rapid viewport updates
 */

export interface Viewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ViewportChangeEvent {
  viewport: Viewport;
  bounds: Bounds;
  source: 'user' | 'programmatic' | 'api';
  timestamp: number;
}

export type ViewportChangeCallback = (event: ViewportChangeEvent) => void;

interface PendingUpdate {
  viewport: Viewport;
  bounds: Bounds;
  source: 'user' | 'programmatic' | 'api';
  timestamp: number;
  timeoutId: NodeJS.Timeout;
}

/**
 * ViewportManager class for coordinating viewport changes with debouncing
 */
export class ViewportManager {
  private callbacks: Set<ViewportChangeCallback> = new Set();
  private currentViewport: Viewport | null = null;
  private currentBounds: Bounds | null = null;
  private pendingUpdate: PendingUpdate | null = null;
  private abortController: AbortController | null = null;
  
  // Debounce configuration
  private readonly debounceDelay: number;
  private readonly maxDebounceDelay: number;
  private readonly immediateThreshold: number;
  
  // Tracking for coordination
  private lastUpdateTime: number = 0;
  private updateCount: number = 0;
  private isUpdating: boolean = false;

  constructor(options: {
    debounceDelay?: number;
    maxDebounceDelay?: number;
    immediateThreshold?: number;
  } = {}) {
    this.debounceDelay = options.debounceDelay ?? 300; // 300ms default debounce
    this.maxDebounceDelay = options.maxDebounceDelay ?? 1000; // Max 1s delay
    this.immediateThreshold = options.immediateThreshold ?? 50; // Updates within 50ms are immediate
    this.abortController = new AbortController();
  }

  /**
   * Update viewport with debouncing and coordination
   */
  updateViewport(
    viewport: Viewport, 
    bounds: Bounds, 
    source: 'user' | 'programmatic' | 'api' = 'user'
  ): void {
    // Check if manager was disposed
    if (this.abortController?.signal.aborted) {
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    // Cancel any pending update
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      this.pendingUpdate = null;
    }

    // Determine if this should be immediate or debounced
    const shouldBeImmediate = this.shouldUpdateImmediately(viewport, bounds, source, timeSinceLastUpdate);
    
    if (shouldBeImmediate) {
      this.executeUpdate(viewport, bounds, source, now);
    } else {
      this.scheduleUpdate(viewport, bounds, source, now);
    }
  }

  /**
   * Get current viewport
   */
  getCurrentViewport(): Viewport | null {
    return this.currentViewport ? { ...this.currentViewport } : null;
  }

  /**
   * Get current bounds
   */
  getCurrentBounds(): Bounds | null {
    return this.currentBounds ? { ...this.currentBounds } : null;
  }

  /**
   * Check if a point is in the current viewport with optional buffer
   */
  isInViewport(lat: number, lng: number, buffer: number = 0): boolean {
    if (!this.currentBounds) return false;

    const latBuffer = (this.currentBounds.north - this.currentBounds.south) * buffer;
    const lngBuffer = (this.currentBounds.east - this.currentBounds.west) * buffer;

    return (
      lat >= this.currentBounds.south - latBuffer &&
      lat <= this.currentBounds.north + latBuffer &&
      lng >= this.currentBounds.west - lngBuffer &&
      lng <= this.currentBounds.east + lngBuffer
    );
  }

  /**
   * Subscribe to viewport changes
   */
  onViewportChange(callback: ViewportChangeCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Force immediate update (bypasses debouncing)
   */
  forceUpdate(viewport: Viewport, bounds: Bounds, source: 'user' | 'programmatic' | 'api' = 'programmatic'): void {
    // Cancel any pending update
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      this.pendingUpdate = null;
    }

    this.executeUpdate(viewport, bounds, source, Date.now());
  }

  /**
   * Cancel any pending updates
   */
  cancelPendingUpdates(): void {
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      this.pendingUpdate = null;
    }
  }

  /**
   * Get viewport manager statistics
   */
  getStats(): {
    updateCount: number;
    lastUpdateTime: number;
    isUpdating: boolean;
    hasPendingUpdate: boolean;
    callbackCount: number;
  } {
    return {
      updateCount: this.updateCount,
      lastUpdateTime: this.lastUpdateTime,
      isUpdating: this.isUpdating,
      hasPendingUpdate: this.pendingUpdate !== null,
      callbackCount: this.callbacks.size,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Abort any ongoing operations
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Cancel pending updates
    this.cancelPendingUpdates();

    // Clear callbacks
    this.callbacks.clear();

    // Reset state
    this.currentViewport = null;
    this.currentBounds = null;
    this.isUpdating = false;
    this.updateCount = 0;
    this.lastUpdateTime = 0;
  }

  /**
   * Determine if update should be immediate based on various factors
   */
  private shouldUpdateImmediately(
    viewport: Viewport, 
    bounds: Bounds, 
    source: 'user' | 'programmatic' | 'api',
    timeSinceLastUpdate: number
  ): boolean {
    // Always immediate for programmatic updates
    if (source === 'programmatic') {
      return true;
    }

    // Immediate if no previous viewport
    if (!this.currentViewport) {
      return true;
    }

    // Immediate if enough time has passed
    if (timeSinceLastUpdate > this.maxDebounceDelay) {
      return true;
    }

    // Immediate if this is a very rapid update (likely programmatic)
    if (timeSinceLastUpdate < this.immediateThreshold) {
      return true;
    }

    // Check for significant viewport changes that should be immediate
    const zoomDiff = Math.abs(viewport.zoom - this.currentViewport.zoom);
    const latDiff = Math.abs(viewport.latitude - this.currentViewport.latitude);
    const lngDiff = Math.abs(viewport.longitude - this.currentViewport.longitude);

    // Large zoom changes should be immediate
    if (zoomDiff > 2) {
      return true;
    }

    // Large position changes should be immediate
    const significantMove = latDiff > 1 || lngDiff > 1;
    if (significantMove) {
      return true;
    }

    return false;
  }

  /**
   * Schedule a debounced update
   */
  private scheduleUpdate(
    viewport: Viewport, 
    bounds: Bounds, 
    source: 'user' | 'programmatic' | 'api',
    timestamp: number
  ): void {
    const timeoutId = setTimeout(() => {
      if (this.pendingUpdate && this.pendingUpdate.timeoutId === timeoutId) {
        this.executeUpdate(
          this.pendingUpdate.viewport,
          this.pendingUpdate.bounds,
          this.pendingUpdate.source,
          this.pendingUpdate.timestamp
        );
        this.pendingUpdate = null;
      }
    }, this.debounceDelay);

    this.pendingUpdate = {
      viewport: { ...viewport },
      bounds: { ...bounds },
      source,
      timestamp,
      timeoutId,
    };
  }

  /**
   * Execute the viewport update and notify callbacks
   */
  private executeUpdate(
    viewport: Viewport, 
    bounds: Bounds, 
    source: 'user' | 'programmatic' | 'api',
    timestamp: number
  ): void {
    // Check if manager was disposed
    if (this.abortController?.signal.aborted) {
      return;
    }

    // Prevent concurrent updates
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;

    try {
      // Update internal state
      this.currentViewport = { ...viewport };
      this.currentBounds = { ...bounds };
      this.lastUpdateTime = timestamp;
      this.updateCount++;

      // Create event object
      const event: ViewportChangeEvent = {
        viewport: { ...viewport },
        bounds: { ...bounds },
        source,
        timestamp,
      };

      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.warn('Error in viewport change callback:', error);
        }
      });
    } finally {
      this.isUpdating = false;
    }
  }
}

/**
 * Default viewport manager instance
 */
export const defaultViewportManager = new ViewportManager();