export interface CachedStore {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string | null;
  address: string | null;
  status: string;
  annualTurnover: number | null;
  cityPopulationBand: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CacheMetadata {
  version: string;
  timestamp: number;
  storeCount: number;
  lastImportDate: string | null;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  storeCount: number;
  lastUpdate: number | null;
}

export class StoreCacheManager {
  private readonly DB_NAME = 'subway_stores';
  private readonly STORE_TABLE = 'stores';
  private readonly META_TABLE = 'metadata';
  private readonly CACHE_VERSION = 1;
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  private db: IDBDatabase | null = null;
  private stats = {
    hits: 0,
    misses: 0
  };

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.DB_NAME, this.CACHE_VERSION);

        request.onerror = () => {
          console.error('Failed to open IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log('✅ IndexedDB initialized successfully');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create stores object store
          if (!db.objectStoreNames.contains(this.STORE_TABLE)) {
            const storeOS = db.createObjectStore(this.STORE_TABLE, { keyPath: 'id' });
            storeOS.createIndex('latitude', 'latitude', { unique: false });
            storeOS.createIndex('longitude', 'longitude', { unique: false });
            storeOS.createIndex('country', 'country', { unique: false });
            console.log('Created stores object store with indexes');
          }

          // Create metadata object store
          if (!db.objectStoreNames.contains(this.META_TABLE)) {
            db.createObjectStore(this.META_TABLE, { keyPath: 'key' });
            console.log('Created metadata object store');
          }
        };
      } catch (error) {
        console.error('IndexedDB initialization error:', error);
        reject(error);
      }
    });
  }

  async getAll(): Promise<CachedStore[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_TABLE], 'readonly');
        const store = transaction.objectStore(this.STORE_TABLE);
        const request = store.getAll();

        request.onsuccess = () => {
          const stores = request.result as CachedStore[];
          if (stores.length > 0) {
            this.stats.hits++;
            console.log(`📦 Cache hit: ${stores.length} stores loaded from IndexedDB`);
          } else {
            this.stats.misses++;
            console.log('📦 Cache miss: No stores in IndexedDB');
          }
          resolve(stores);
        };

        request.onerror = () => {
          console.error('Failed to get all stores:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('getAll error:', error);
        reject(error);
      }
    });
  }

  async getByViewport(bounds: ViewportBounds): Promise<CachedStore[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_TABLE], 'readonly');
        const store = transaction.objectStore(this.STORE_TABLE);
        const request = store.getAll();

        request.onsuccess = () => {
          const allStores = request.result as CachedStore[];
          
          // Filter stores within viewport bounds
          const viewportStores = allStores.filter(s => 
            s.latitude >= bounds.south &&
            s.latitude <= bounds.north &&
            s.longitude >= bounds.west &&
            s.longitude <= bounds.east
          );

          console.log(`📦 Viewport query: ${viewportStores.length} stores in bounds`);
          resolve(viewportStores);
        };

        request.onerror = () => {
          console.error('Failed to get viewport stores:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('getByViewport error:', error);
        reject(error);
      }
    });
  }

  async set(stores: CachedStore[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_TABLE, this.META_TABLE], 'readwrite');
        const storeOS = transaction.objectStore(this.STORE_TABLE);
        const metaOS = transaction.objectStore(this.META_TABLE);

        // Clear existing stores
        storeOS.clear();

        // Add all stores
        stores.forEach(store => {
          storeOS.add(store);
        });

        // Update metadata
        const metadata: CacheMetadata = {
          version: this.CACHE_VERSION.toString(),
          timestamp: Date.now(),
          storeCount: stores.length,
          lastImportDate: null
        };

        metaOS.put({ key: 'cache_info', ...metadata });

        transaction.oncomplete = () => {
          console.log(`✅ Cached ${stores.length} stores in IndexedDB`);
          resolve();
        };

        transaction.onerror = () => {
          console.error('Failed to set stores:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('set error:', error);
        reject(error);
      }
    });
  }

  async update(store: CachedStore): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_TABLE], 'readwrite');
        const storeOS = transaction.objectStore(this.STORE_TABLE);
        const request = storeOS.put(store);

        request.onsuccess = () => {
          console.log(`✅ Updated store ${store.id} in cache`);
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to update store:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('update error:', error);
        reject(error);
      }
    });
  }

  async delete(storeId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_TABLE], 'readwrite');
        const storeOS = transaction.objectStore(this.STORE_TABLE);
        const request = storeOS.delete(storeId);

        request.onsuccess = () => {
          console.log(`✅ Deleted store ${storeId} from cache`);
          resolve();
        };

        request.onerror = () => {
          console.error('Failed to delete store:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('delete error:', error);
        reject(error);
      }
    });
  }

  async invalidate(): Promise<void> {
    if (!this.db) {
      console.warn('⚠️  Cache database not initialized, skipping invalidation');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_TABLE, this.META_TABLE], 'readwrite');
        const storeOS = transaction.objectStore(this.STORE_TABLE);
        const metaOS = transaction.objectStore(this.META_TABLE);

        storeOS.clear();
        metaOS.clear();

        transaction.oncomplete = () => {
          console.log('🗑️  Cache invalidated');
          resolve();
        };

        transaction.onerror = () => {
          console.error('Failed to invalidate cache:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('invalidate error:', error);
        reject(error);
      }
    });
  }

  async getMetadata(): Promise<CacheMetadata | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.META_TABLE], 'readonly');
        const metaOS = transaction.objectStore(this.META_TABLE);
        const request = metaOS.get('cache_info');

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            const { key, ...metadata } = result;
            resolve(metadata as CacheMetadata);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Failed to get metadata:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('getMetadata error:', error);
        reject(error);
      }
    });
  }

  async isStale(): Promise<boolean> {
    try {
      const metadata = await this.getMetadata();
      if (!metadata) {
        return true;
      }

      const age = Date.now() - metadata.timestamp;
      const isStale = age > this.MAX_AGE_MS;
      
      if (isStale) {
        console.log(`⏰ Cache is stale (${Math.round(age / 1000 / 60)} minutes old)`);
      }
      
      return isStale;
    } catch (error) {
      console.error('isStale error:', error);
      return true;
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      size: 0, // Would need to calculate actual size
      storeCount: 0, // Would need to query
      lastUpdate: null // Would need to get from metadata
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('📦 IndexedDB connection closed');
    }
  }
}
