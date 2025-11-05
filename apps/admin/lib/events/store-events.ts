// Simple event system for store data refresh
type StoreEventType = 'stores-updated' | 'stores-imported';

interface StoreEvent {
  type: StoreEventType;
  data?: any;
  timestamp: number;
}

class StoreEventEmitter {
  private listeners: Map<StoreEventType, Set<(event: StoreEvent) => void>> = new Map();

  on(eventType: StoreEventType, callback: (event: StoreEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  emit(eventType: StoreEventType, data?: any): void {
    const event: StoreEvent = {
      type: eventType,
      data,
      timestamp: Date.now()
    };

    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in store event listener for ${eventType}:`, error);
        }
      });
    }
  }

  off(eventType: StoreEventType, callback: (event: StoreEvent) => void): void {
    this.listeners.get(eventType)?.delete(callback);
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Global event emitter instance
export const storeEvents = new StoreEventEmitter();

// Convenience functions
export function onStoresUpdated(callback: (event: StoreEvent) => void): () => void {
  return storeEvents.on('stores-updated', callback);
}

export function onStoresImported(callback: (event: StoreEvent) => void): () => void {
  console.log('👂 Registering listener for stores-imported event');
  return storeEvents.on('stores-imported', callback);
}

export function emitStoresUpdated(data?: any): void {
  storeEvents.emit('stores-updated', data);
}

export function emitStoresImported(data?: any): void {
  console.log('📢 Emitting stores-imported event:', {
    hasData: !!data,
    summary: data ? {
      inserted: data.inserted,
      updated: data.updated,
      failed: data.failed
    } : null
  });
  storeEvents.emit('stores-imported', data);
}