/**
 * Repository for store operations
 */

export interface Store {
  id: string;
  name: string;
  country: string;
  region: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreQuery {
  country?: string;
  region?: string;
  active?: boolean;
  take?: number;
}

export interface CreateStoreData {
  name: string;
  country: string;
  region: string;
  active?: boolean;
}

export interface StoreRepository {
  create(data: CreateStoreData): Promise<Store>;
  findMany(query?: StoreQuery): Promise<Store[]>;
  findById(id: string): Promise<Store | null>;
  update(id: string, data: Partial<Store>): Promise<Store>;
  delete(id: string): Promise<void>;
  findByRegion(region: string): Promise<Store[]>;
  findByCountry(country: string): Promise<Store[]>;
}

export class ApiStoreRepository implements StoreRepository {
  private baseUrl = '/api/stores';

  async create(data: CreateStoreData): Promise<Store> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async findMany(query?: StoreQuery): Promise<Store[]> {
    const params = new URLSearchParams();
    if (query?.country) params.append('country', query.country);
    if (query?.region) params.append('region', query.region);
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.take) params.append('take', query.take.toString());

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async findById(id: string): Promise<Store | null> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async update(id: string, data: Partial<Store>): Promise<Store> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async findByRegion(region: string): Promise<Store[]> {
    return this.findMany({ region, active: true });
  }

  async findByCountry(country: string): Promise<Store[]> {
    return this.findMany({ country, active: true });
  }
}