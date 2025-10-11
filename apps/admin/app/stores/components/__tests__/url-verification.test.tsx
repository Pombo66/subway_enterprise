/**
 * URL Parameter Verification Test
 * 
 * This test verifies the actual URL parameter handling functionality
 * by simulating real browser behavior and URL changes.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CascadingFilters from '../CascadingFilters';

// Mock Next.js navigation hooks with more realistic behavior
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('URL Parameter Verification', () => {
  let mockRouter: any;
  let mockSearchParams: any;
  let onFiltersChange: jest.Mock;
  let currentUrl: string;

  beforeEach(() => {
    jest.clearAllMocks();
    onFiltersChange = jest.fn();
    currentUrl = '/stores';

    // Mock router with realistic URL handling
    mockRouter = {
      replace: jest.fn((url: string) => {
        currentUrl = url;
      }),
      push: jest.fn(),
    };

    // Mock search params with realistic URL parsing
    mockSearchParams = {
      get: jest.fn((key: string) => {
        const urlObj = new URL(currentUrl, 'http://localhost:3002');
        return urlObj.searchParams.get(key);
      }),
      toString: jest.fn(() => {
        const urlObj = new URL(currentUrl, 'http://localhost:3002');
        return urlObj.searchParams.toString();
      }),
    };

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  describe('Complete URL Parameter Flow', () => {
    it('should handle complete filter workflow with URL updates', async () => {
      // Start with clean URL
      currentUrl = '/stores';
      
      const { rerender } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Step 1: Apply region filter
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });

      // Simulate URL change
      currentUrl = '?region=EMEA';
      rerender(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Step 2: Apply country filter
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom', { scroll: false });
      });

      // Simulate URL change
      currentUrl = '?region=EMEA&country=United+Kingdom';
      rerender(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Step 3: Apply city filter
      const citySelect = screen.getByDisplayValue('All Cities');
      fireEvent.change(citySelect, { target: { value: 'London' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom&city=London', { scroll: false });
      });

      // Verify final state
      expect(onFiltersChange).toHaveBeenLastCalledWith({
        region: 'EMEA',
        country: 'United Kingdom',
        city: 'London',
      });
    });

    it('should handle cascading filter resets with URL updates', async () => {
      // Start with all filters applied
      currentUrl = '?region=EMEA&country=United+Kingdom&city=London';
      
      const { rerender } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Verify initial state from URL
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'United Kingdom',
        city: 'London',
      });

      // Change region (should reset country and city)
      const regionSelect = screen.getByDisplayValue('EMEA');
      fireEvent.change(regionSelect, { target: { value: 'AMER' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER', { scroll: false });
      });

      // Verify cascading reset
      expect(onFiltersChange).toHaveBeenLastCalledWith({
        region: 'AMER',
        country: undefined,
        city: undefined,
      });
    });

    it('should handle filter clearing with URL cleanup', async () => {
      // Start with filters applied
      currentUrl = '?region=EMEA&country=United+Kingdom';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Clear region filter
      const regionSelect = screen.getByDisplayValue('EMEA');
      fireEvent.change(regionSelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/stores', { scroll: false });
      });

      // Verify complete reset
      expect(onFiltersChange).toHaveBeenLastCalledWith({
        region: undefined,
        country: undefined,
        city: undefined,
      });
    });
  });

  describe('URL Parameter Edge Cases', () => {
    it('should handle URL with encoded spaces correctly', () => {
      currentUrl = '?region=EMEA&country=United%20Kingdom';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should decode URL parameters correctly
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'United Kingdom', // Should be decoded
        city: undefined,
      });
    });

    it('should handle URL with plus-encoded spaces correctly', () => {
      currentUrl = '?region=EMEA&country=United+Kingdom';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should decode URL parameters correctly
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'United Kingdom', // Should be decoded
        city: undefined,
      });
    });

    it('should handle empty URL parameters', () => {
      currentUrl = '?region=&country=&city=';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should treat empty strings as undefined
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: undefined,
        country: undefined,
        city: undefined,
      });
    });

    it('should handle malformed URL parameters gracefully', () => {
      currentUrl = '?region=INVALID_REGION&country=NONEXISTENT_COUNTRY';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should not crash and should pass through the values
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'INVALID_REGION',
        country: 'NONEXISTENT_COUNTRY',
        city: undefined,
      });
    });
  });

  describe('Browser Navigation Simulation', () => {
    it('should handle simulated page refresh', () => {
      // Simulate page refresh by re-mounting with URL parameters
      currentUrl = '?region=APAC&country=Japan&city=Tokyo';
      
      const { unmount } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Verify initial load from URL
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'APAC',
        country: 'Japan',
        city: 'Tokyo',
      });

      // Simulate page refresh by unmounting and remounting
      unmount();
      onFiltersChange.mockClear();
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should restore state from URL
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'APAC',
        country: 'Japan',
        city: 'Tokyo',
      });
    });

    it('should handle direct navigation to filtered URL', () => {
      // Simulate direct navigation to a filtered URL
      currentUrl = '?region=AMER&country=United+States&city=New+York';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Should initialize with URL parameters
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'AMER',
        country: 'United States',
        city: 'New York',
      });

      // Verify UI state matches URL
      expect(screen.getByDisplayValue('AMER')).toBeInTheDocument();
      expect(screen.getByDisplayValue('United States')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
    });
  });

  describe('URL Synchronization', () => {
    it('should maintain URL synchronization during rapid filter changes', async () => {
      currentUrl = '/stores';
      
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      // Rapid filter changes
      const regionSelect = screen.getByDisplayValue('All Regions');
      
      // Change 1
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });

      // Change 2
      fireEvent.change(regionSelect, { target: { value: 'AMER' } });
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER', { scroll: false });
      });

      // Change 3
      fireEvent.change(regionSelect, { target: { value: '' } });
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/stores', { scroll: false });
      });

      // Verify final state
      expect(onFiltersChange).toHaveBeenLastCalledWith({
        region: undefined,
        country: undefined,
        city: undefined,
      });
    });
  });
});