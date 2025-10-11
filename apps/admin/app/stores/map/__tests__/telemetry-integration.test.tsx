/**
 * Integration tests for map telemetry in components
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TelemetryHelpers } from '../../../../lib/telemetry';
import MapFilters from '../components/MapFilters';
import { FilterState, FilterOptions } from '../types';

// Mock the telemetry helpers
jest.mock('../../../../lib/telemetry', () => ({
  TelemetryHelpers: {
    trackUserAction: jest.fn(),
    trackFeatureUsage: jest.fn(),
    trackError: jest.fn(),
  },
  generateSessionId: jest.fn(() => 'test-session-id'),
}));

// Mock the telemetry module
jest.mock('../telemetry', () => ({
  ...jest.requireActual('../telemetry'),
  getCurrentUserId: jest.fn(() => 'test-user-123'),
}));

describe('Telemetry Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MapFilters Component', () => {
    const mockAvailableOptions: FilterOptions = {
      countries: ['US', 'Canada', 'Mexico'],
      regions: ['Northeast', 'Southeast', 'West'],
      franchisees: [],
    };

    const defaultProps = {
      filters: {} as FilterState,
      onFiltersChange: jest.fn(),
      availableOptions: mockAvailableOptions,
      loading: false,
    };

    it('should track telemetry when country filter changes', async () => {
      const onFiltersChange = jest.fn();
      
      const { getByDisplayValue } = render(
        <MapFilters
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />
      );

      const countrySelect = getByDisplayValue('All countries');
      fireEvent.change(countrySelect, { target: { value: 'US' } });

      await waitFor(() => {
        expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
          'map_filter_changed',
          'map_filters',
          'test-user-123',
          expect.objectContaining({
            sessionId: 'test-session-id',
            component: 'living_map',
            changedKeys: ['country'],
            changedFilters: { country: 'US' },
            filterKey: 'country',
            oldValue: undefined,
            newValue: 'US',
          })
        );
      });

      expect(onFiltersChange).toHaveBeenCalledWith({ country: 'US' });
    });

    it('should track telemetry when region filter changes', async () => {
      const onFiltersChange = jest.fn();
      
      const { getByDisplayValue } = render(
        <MapFilters
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />
      );

      const regionSelect = getByDisplayValue('All regions');
      fireEvent.change(regionSelect, { target: { value: 'Northeast' } });

      await waitFor(() => {
        expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
          'map_filter_changed',
          'map_filters',
          'test-user-123',
          expect.objectContaining({
            changedKeys: ['region'],
            changedFilters: { region: 'Northeast' },
            filterKey: 'region',
            newValue: 'Northeast',
          })
        );
      });
    });

    it('should track telemetry when filters are reset', async () => {
      const onFiltersChange = jest.fn();
      
      const { getByText } = render(
        <MapFilters
          {...defaultProps}
          filters={{ country: 'US', region: 'Northeast' }}
          onFiltersChange={onFiltersChange}
        />
      );

      const clearButton = getByText('Clear all');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
          'map_filter_changed',
          'map_filters',
          'test-user-123',
          expect.objectContaining({
            action: 'reset_all_filters',
            previousFilterCount: 2,
            clearedFilters: { country: 'US', region: 'Northeast' },
          })
        );
      });

      expect(onFiltersChange).toHaveBeenCalledWith({});
    });

    it('should not track telemetry when filter value does not change', async () => {
      const onFiltersChange = jest.fn();
      
      const { getByDisplayValue } = render(
        <MapFilters
          {...defaultProps}
          filters={{ country: 'US' }}
          onFiltersChange={onFiltersChange}
        />
      );

      const countrySelect = getByDisplayValue('US');
      fireEvent.change(countrySelect, { target: { value: 'US' } });

      // Should not track telemetry since value didn't change
      expect(TelemetryHelpers.trackUserAction).not.toHaveBeenCalled();
      
      // But should still call onFiltersChange
      expect(onFiltersChange).toHaveBeenCalledWith({ country: 'US' });
    });
  });
});