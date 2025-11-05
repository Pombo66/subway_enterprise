import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('POST /api/expansion/generate', () => {
  const validParams = {
    region: { country: 'Germany' },
    aggression: 60,
    populationBias: 0.5,
    proximityBias: 0.3,
    turnoverBias: 0.2,
    minDistanceM: 800,
    seed: 20251029
  };

  it('should generate suggestions with valid parameters', async () => {
    const response = await fetch('http://localhost:3002/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validParams)
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('suggestions');
    expect(data).toHaveProperty('metadata');
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it('should return validation error with invalid aggression', async () => {
    const invalidParams = { ...validParams, aggression: 150 };
    
    const response = await fetch('http://localhost:3002/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidParams)
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });

  it('should return validation error with invalid bias', async () => {
    const invalidParams = { ...validParams, populationBias: 1.5 };
    
    const response = await fetch('http://localhost:3002/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidParams)
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
  });

  it('should return error for empty region', async () => {
    const invalidParams = { ...validParams, region: {} };
    
    const response = await fetch('http://localhost:3002/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidParams)
    });

    expect(response.status).toBe(400);
  });

  it('should produce identical results with same seed', async () => {
    const response1 = await fetch('http://localhost:3002/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validParams)
    });

    const response2 = await fetch('http://localhost:3002/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validParams)
    });

    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.suggestions.length).toBe(data2.suggestions.length);
    
    // Check first suggestion matches
    if (data1.suggestions.length > 0) {
      expect(data1.suggestions[0].lat).toBe(data2.suggestions[0].lat);
      expect(data1.suggestions[0].lng).toBe(data2.suggestions[0].lng);
    }
  });
});
