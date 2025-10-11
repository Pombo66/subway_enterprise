/**
 * URL Parameter Handling Tests for Stores Filter
 * 
 * This test file verifies that the filter state is properly synchronized with URL query parameters
 * according to requirements 4.1, 4.2, 4.3, and 4.4.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CascadingFilters from '../CascadingFilters';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(),
};

describe('URL Parameter Handling', () => {
  let onFiltersChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onFiltersChange = jest.fn();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);
  });

  describe('Requirement 4.1: URL parameters update when filters are applied', () => {
    it('should update URL when region filter is applied', async () => {
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });
    });

    it('should update URL when country filter is applied', async () => {
      // Setup initial state with region selected
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom', { scroll: false });
      });
    });

    it('should update URL when city filter is applied', async () => {
      // Setup initial state with region and country selected
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const citySelect = screen.getByDisplayValue('All Cities');
      fireEvent.change(citySelect, { target: { value: 'London' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom&city=London', { scroll: false });
      });
    });

    it('should update URL with multiple filters applied', async () => {
      const { unmount } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Apply region filter
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'AMER' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER', { scroll: false });
      });

      // Clean up first render
      unmount();
      mockRouter.replace.mockClear();

      // Simulate region being applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'AMER';
        return null;
      });

      // Re-render to update available countries
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Apply country filter
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United States' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER&country=United+States', { scroll: false });
      });
    });
  });

  describe('Requirement 4.2: Filters are applied automatically from URL parameters', () => {
    it('should initialize filters from URL parameters on mount', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'United Kingdom',
        city: 'London',
      });
    });

    it('should handle partial URL parameters correctly', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'APAC';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'APAC',
        country: undefined,
        city: undefined,
      });
    });

    it('should handle invalid URL parameters gracefully', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'INVALID_REGION';
        if (key === 'country') return 'INVALID_COUNTRY';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should still call onFiltersChange with the values, even if invalid
      // The component should handle invalid values gracefully
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'INVALID_REGION',
        country: 'INVALID_COUNTRY',
        city: undefined,
      });
    });
  });

  describe('Requirement 4.3: Page refresh maintains filtered state', () => {
    it('should maintain filter state after simulated page refresh', () => {
      // Simulate page refresh by re-mounting component with URL parameters
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'Germany';
        return null;
      });

      const { unmount } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Verify initial state is set from URL
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'Germany',
        city: undefined,
      });

      // Simulate page refresh by unmounting and remounting
      unmount();
      
      // Clear previous calls
      onFiltersChange.mockClear();
      
      // Re-mount component (simulating page refresh)
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should restore state from URL parameters
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'Germany',
        city: undefined,
      });
    });

    it('should maintain complex filter state after refresh', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'APAC';
        if (key === 'country') return 'Japan';
        if (key === 'city') return 'Tokyo';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'APAC',
        country: 'Japan',
        city: 'Tokyo',
      });
    });
  });

  describe('Requirement 4.4: Clearing filters removes parameters from URL', () => {
    it('should remove URL parameters when region is cleared', async () => {
      // Start with filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Clear region filter
      const regionSelect = screen.getByDisplayValue('EMEA');
      fireEvent.change(regionSelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/stores', { scroll: false });
      });
    });

    it('should remove URL parameters when country is cleared', async () => {
      // Start with filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Clear country filter (should also clear city)
      const countrySelect = screen.getByDisplayValue('United Kingdom');
      fireEvent.change(countrySelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });
    });

    it('should remove city parameter when city is cleared', async () => {
      // Start with all filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Clear city filter
      const citySelect = screen.getByDisplayValue('London');
      fireEvent.change(citySelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom', { scroll: false });
      });
    });

    it('should navigate to clean URL when all filters are cleared', async () => {
      // Start with filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'AMER';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Clear all filters
      const regionSelect = screen.getByDisplayValue('AMER');
      fireEvent.change(regionSelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/stores', { scroll: false });
      });
    });
  });

  describe('Cascading behavior with URL parameters', () => {
    it('should reset child filters in URL when parent filter changes', async () => {
      // Start with all filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Change region (should reset country and city)
      const regionSelect = screen.getByDisplayValue('EMEA');
      fireEvent.change(regionSelect, { target: { value: 'AMER' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER', { scroll: false });
      });

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'AMER',
        country: undefined,
        city: undefined,
      });
    });

    it('should reset city filter in URL when country changes', async () => {
      // Start with all filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Change country (should reset city)
      const countrySelect = screen.getByDisplayValue('United Kingdom');
      fireEvent.change(countrySelect, { target: { value: 'Germany' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=Germany', { scroll: false });
      });

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'Germany',
        city: undefined,
      });
    });
  });

  describe('URL encoding and special characters', () => {
    it('should properly encode URL parameters with spaces', async () => {
      const { unmount } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });

      // Clean up first render
      unmount();
      mockRouter.replace.mockClear();

      // Simulate region being applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom', { scroll: false });
      });
    });

    it('should handle URL decoding correctly', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'country') return 'United Kingdom'; // Already decoded by Next.js
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: undefined,
        country: 'United Kingdom',
        city: undefined,
      });
    });
  });
});