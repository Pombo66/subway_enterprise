export type CacheEventType = 'invalidate' | 'update' | 'delete';

export interface CacheEvent {
  type: CacheEventType;
  timestamp: number;
  storeId?: string;
  reason?: string;
}

class CacheEventBus {
  private listeners: Map<CacheEventType, Set<(event: CacheEvent) => void>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    // Initialize BroadcastChannel if available
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('store_cache');
        
        // Listen for events from other tabs
        this.broadcastChannel.onmessage = (event) => {
          const cacheEvent = event.data as CacheEvent;
          console.log('📡 Received cache event from another tab:', cacheEvent);
          this.notifyListeners(cacheEvent);
        };
      } catch (error) {
        console.warn('BroadcastChannel not available:', error);
      }
    }
  }

  subscribe(type: CacheEventType, callback: (event: CacheEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);
    console.log(`📡 Subscribed to cache event: ${type}`);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
      console.log(`📡 Unsubscribed from cache event: ${type}`);
    };
  }

  emit(event: CacheEvent): void {
    console.log('📡 Emitting cache event:', event);
    
    // Notify local listeners
    this.notifyListeners(event);

    // Broadcast to other tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (error) {
        console.error('Failed to broadcast cache event:', error);
      }
    }
  }

  private notifyListeners(event: CacheEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in cache event listener:', error);
        }
      });
    }
  }

  close(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const cacheEventBus = new CacheEventBus();

// Helper functions
export function invalidateStoreCache(reason?: string): void {
  cacheEventBus.emit({
    type: 'invalidate',
    timestamp: Date.now(),
    reason
  });
}

export function updateStoreInCache(storeId: string): void {
  cacheEventBus.emit({
    type: 'update',
    timestamp: Date.now(),
    storeId
  });
}

export function deleteStoreFromCache(storeId: string): void {
  cacheEventBus.emit({
    type: 'delete',
    timestamp: Date.now(),
    storeId
  });
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cacheEventBus.close();
  });
}
