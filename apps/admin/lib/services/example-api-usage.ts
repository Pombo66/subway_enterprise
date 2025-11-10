/**
 * Example: How to use the authenticated API client
 * 
 * This file shows how to migrate from direct fetch() calls to the authenticated apiClient
 */

import { apiClient } from '../api-client';

// ❌ OLD WAY (without authentication):
async function oldWayExample() {
  const response = await fetch('http://localhost:3001/expansion/recommendations?region=EMEA');
  const data = await response.json();
  return data;
}

// ✅ NEW WAY (with authentication):
async function newWayExample() {
  const data = await apiClient.get('/expansion/recommendations?region=EMEA');
  return data;
}

// Example: POST request with authentication
async function generateExpansion() {
  const result = await apiClient.post('/ai/pipeline/execute', {
    region: 'Germany',
    existingStores: [],
    targetCandidates: 50,
    useSimpleApproach: true,
    model: 'gpt-5-mini'
  });
  return result;
}

// Example: Error handling
async function withErrorHandling() {
  try {
    const data = await apiClient.get('/expansion/recommendations?region=EMEA');
    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        // User is not authenticated - redirect to login
        window.location.href = '/login';
      } else if (error.message.includes('429')) {
        // Rate limit exceeded
        alert('Too many requests. Please wait a moment.');
      } else {
        // Other error
        console.error('API error:', error.message);
      }
    }
    throw error;
  }
}

// Example: Using in a React component
export async function fetchStores() {
  return apiClient.get<{ stores: any[] }>('/stores');
}

export async function createStore(storeData: any) {
  return apiClient.post('/stores', storeData);
}

export async function updateStore(id: string, storeData: any) {
  return apiClient.put(`/stores/${id}`, storeData);
}

export async function deleteStore(id: string) {
  return apiClient.delete(`/stores/${id}`);
}
