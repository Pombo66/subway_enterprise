import { describe, it, expect } from '@jest/globals';

describe('Scenario Management Endpoints', () => {
  let testScenarioId: string;

  const mockSuggestions = [
    {
      lat: 52.5200,
      lng: 13.4050,
      confidence: 0.85,
      band: 'HIGH',
      rationale: {
        population: 0.9,
        proximityGap: 0.8,
        turnoverGap: 0.85,
        notes: 'test'
      },
      rationaleText: 'Test rationale'
    }
  ];

  it('should save a scenario', async () => {
    const response = await fetch('http://localhost:3002/api/expansion/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: 'Test Scenario',
        regionFilter: { country: 'Germany' },
        aggressionLevel: 60,
        populationBias: 0.5,
        proximityBias: 0.3,
        turnoverBias: 0.2,
        minDistanceM: 800,
        seed: 20251029,
        suggestions: mockSuggestions
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('scenarioId');
    testScenarioId = data.scenarioId;
  });

  it('should load a saved scenario', async () => {
    if (!testScenarioId) {
      console.warn('Skipping test: no scenario ID');
      return;
    }

    const response = await fetch(`http://localhost:3002/api/expansion/scenarios/${testScenarioId}`);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('scenario');
    expect(data).toHaveProperty('suggestions');
    expect(data.scenario.label).toBe('Test Scenario');
  });

  it('should refresh a scenario', async () => {
    if (!testScenarioId) {
      console.warn('Skipping test: no scenario ID');
      return;
    }

    const response = await fetch(
      `http://localhost:3002/api/expansion/scenarios/${testScenarioId}/refresh`,
      { method: 'POST' }
    );
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('scenario');
    expect(data).toHaveProperty('suggestions');
    expect(data).toHaveProperty('changes');
  });

  it('should list scenarios', async () => {
    const response = await fetch('http://localhost:3002/api/expansion/scenarios');
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('scenarios');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.scenarios)).toBe(true);
  });

  it('should update suggestion status', async () => {
    if (!testScenarioId) {
      console.warn('Skipping test: no scenario ID');
      return;
    }

    // First load the scenario to get a suggestion ID
    const loadResponse = await fetch(`http://localhost:3002/api/expansion/scenarios/${testScenarioId}`);
    const loadData = await loadResponse.json();
    
    if (loadData.suggestions.length === 0) {
      console.warn('Skipping test: no suggestions');
      return;
    }

    const suggestionId = loadData.suggestions[0].id;

    const response = await fetch(
      `http://localhost:3002/api/expansion/suggestions/${suggestionId}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      }
    );
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.suggestion.status).toBe('APPROVED');
  });
});
