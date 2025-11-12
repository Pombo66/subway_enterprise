import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StoreRepository, StoreFilters, CreateStoreData, PrismaStoreRepository } from '../repositories/store.repository';

// Infer Store type from Prisma client (non-nullable)
type Store = NonNullable<Awaited<ReturnType<PrismaClient['store']['findUnique']>>>;
import { findEmeaCountry } from '../util/emea';
import { ValidationError } from '../errors/validation.error';

export interface CreateStoreRequest {
  name: string;
  country: string;
}

@Injectable()
export class StoreService {
  constructor(private readonly storeRepository: PrismaStoreRepository) {}

  async getStores(filters: StoreFilters): Promise<Store[]> {
    return this.storeRepository.findMany(filters);
  }

  async getStoreById(id: string): Promise<Store | null> {
    return this.storeRepository.findById(id);
  }

  async createStore(request: CreateStoreRequest): Promise<Store> {
    // Validate input
    this.validateStoreRequest(request);

    // Validate EMEA country
    const countryMatch = findEmeaCountry(request.country);
    if (!countryMatch) {
      throw new ValidationError('Country must be in EMEA region (full name or ISO code)');
    }

    // Create store data
    const storeData: CreateStoreData = {
      name: request.name.trim(),
      country: countryMatch.name,
      region: 'EMEA',
    };

    return this.storeRepository.create(storeData);
  }

  async updateStore(id: string, updates: any): Promise<Store> {
    // Check if store exists
    const existingStore = await this.storeRepository.findById(id);
    if (!existingStore) {
      throw new ValidationError(`Store with id ${id} not found`);
    }

    // Validate updates
    if (updates.name !== undefined) {
      this.validateStoreName(updates.name);
    }

    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name.trim();
    }

    if (updates.country) {
      const countryMatch = findEmeaCountry(updates.country);
      if (!countryMatch) {
        throw new ValidationError('Country must be in EMEA region');
      }
      updateData.country = countryMatch.name;
      updateData.region = 'EMEA';
    }

    // Allow updating city, region, status, address, and postcode
    if (updates.city !== undefined) {
      updateData.city = updates.city;
    }

    if (updates.region !== undefined) {
      updateData.region = updates.region;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    if (updates.address !== undefined) {
      updateData.address = updates.address;
    }

    if (updates.postcode !== undefined) {
      updateData.postcode = updates.postcode;
    }

    return this.storeRepository.update(id, updateData);
  }

  async deleteStore(id: string): Promise<void> {
    const existingStore = await this.storeRepository.findById(id);
    if (!existingStore) {
      throw new ValidationError(`Store with id ${id} not found`);
    }

    await this.storeRepository.delete(id);
  }

  async getStoreCount(filters?: Omit<StoreFilters, 'limit' | 'offset'>): Promise<number> {
    return this.storeRepository.count(filters);
  }

  private validateStoreRequest(request: CreateStoreRequest): void {
    this.validateStoreName(request.name);

    if (!request.country?.trim()) {
      throw new ValidationError('Country is required');
    }
  }

  private validateStoreName(name: string): void {
    if (!name?.trim()) {
      throw new ValidationError('Store name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new ValidationError('Store name must be at least 2 characters long');
    }

    if (trimmedName.length > 100) {
      throw new ValidationError('Store name must be no more than 100 characters long');
    }
  }
}