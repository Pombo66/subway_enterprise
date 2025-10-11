/**
 * Simple Filtering Functionality Validation Tests
 * 
 * This test suite validates the core filtering functionality:
 * - Filter data consistency
 * - Cascading behavior
 * - Filter combinations
 * 
 * Requirements covered: 1.1, 2.1, 3.1, 5.1, 5.2, 5.3, 5.4
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CascadingFilters from '../CascadingFilters';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ''),
  }),
}));

describe('Filtering Functionality Validation', () => {
  const renderFilters = (onFiltersChange = jest.fn()) => {
    return render(<CascadingFilters onFiltersChange={onFiltersChange} />);
  };

  test('Region filter triggers callback with correct data', () => {
    const mockCallback = jest.fn();
    renderFilters(mockCallback);

    const regionSelect = screen.getByDisplayValue('All Regions');
    fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

    expect(mockCallback).toHaveBeenCalledWith({
      region: 'EMEA',
      country: undefined,
      city: undefined,
    });
  });

  test('Country filter is enabled after region selection', async () => {
    const mockCallback = jest.fn();
    renderFilters(mockCallback);

    const regionSelect = screen.getByDisplayValue('All Regions');
    const countrySelect = screen.getByDisplayValue('All Countries');

    // Initially country should be disabled
    expect(countrySelect).toBeDisabled();

    // Select region
    fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

    // Country should now be enabled
    await waitFor(() => {
      expect(countrySelect).not.toBeDisabled();
    });
  });

  test('City filter is enabled after country selection', async () => {
    const mockCallback = jest.fn();
    renderFilters(mockCallback);

    const regionSelect = screen.getByDisplayValue('All Regions');
    const countrySelect = screen.getByDisplayValue('All Countries');
    const citySelect = screen.getByDisplayValue('All Cities');

    // Initially city should be disabled
    expect(citySelect).toBeDisabled();

    // Select region
    fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

    await waitFor(() => {
      expect(countrySelect).not.toBeDisabled();
    });

    // Select country
    fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

    // City should now be enabled
    await waitFor(() => {
      expect(citySelect).not.toBeDisabled();
    });
  });

  test('Changing region resets country and city', async () => {
    const mockCallback = jest.fn();
    renderFilters(mockCallback);

    const regionSelect = screen.getByDisplayValue('All Regions');
    const countrySelect = screen.getByDisplayValue('All Countries');
    const citySelect = screen.getByDisplayValue('All Cities');

    // Set up filters
    fireEvent.change(regionSelect, { target: { value: 'EMEA' } });
    
    await waitFor(() => {
      expect(countrySelect).not.toBeDisabled();
    });

    fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });
    
    await waitFor(() => {
      expect(citySelect).not.toBeDisabled();
    });

    fireEvent.change(citySelect, { target: { value: 'London' } });

    // Change region - should reset country and city
    fireEvent.change(regionSelect, { target: { value: 'AMER' } });

    expect(mockCallback).toHaveBeenLastCalledWith({
      region: 'AMER',
      country: undefined,
      city: undefined,
    });
  });

  test('Clearing region disables country and city', async () => {
    const mockCallback = jest.fn();
    renderFilters(mockCallback);

    const regionSelect = screen.getByDisplayValue('All Regions');
    const countrySelect = screen.getByDisplayValue('All Countries');
    const citySelect = screen.getByDisplayValue('All Cities');

    // Set up filters
    fireEvent.change(regionSelect, { target: { value: 'EMEA' } });
    
    await waitFor(() => {
      expect(countrySelect).not.toBeDisabled();
    });

    // Clear region
    fireEvent.change(regionSelect, { target: { value: '' } });

    // Country and city should be disabled
    await waitFor(() => {
      expect(countrySelect).toBeDisabled();
      expect(citySelect).toBeDisabled();
    });

    expect(mockCallback).toHaveBeenLastCalledWith({
      region: undefined,
      country: undefined,
      city: undefined,
    });
  });
});