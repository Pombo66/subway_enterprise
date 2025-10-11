import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapFilters from '../MapFilters';
import { FilterState, FilterOptions } from '../../types';
import { MapTelemetryHelpers } from '../../telemetry';

// Mock telemetry
jest.mock('../../telemetry', () => ({
  MapTelemetryHelpers: {
    trackMapFilterChanged: jest.fn(),
  },
  safeTrackEvent: jest.fn((fn) => fn()),
  getCurrentUserId: jest.fn(() => 'test-user-123'),
}));

const mockMapTelemetryHelpers = MapTelemetryHelpers as jest.Mocked<typeof MapTelemetryHelpers>;

describe('MapFilters', () => {
  const mockOnFiltersChange = jest.fn();
  
  const defaultProps = {
    filters: {} as FilterState,
    onFiltersChange: mockOnFiltersChange,
    availableOptions: {
      countries: ['USA', 'Canada', 'UK'],
      regions: ['AMER', 'EMEA', 'APAC'],
      franchisees: [
        { id: 'franchise-1', name: 'Franchise One' },
        { id: 'franchise-2', name: 'Franchise Two' },
      ],
    } as FilterOptions,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all filter controls', () => {
      render(<MapFilters {...defaultProps} />);

      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/franchisee/i)).toBeInTheDocument();
    });

    it('should render available options in select controls', () => {
      render(<MapFilters {...defaultProps} />);

      // Check country options
      const countrySelect = screen.getByLabelText(/country/i);
      expect(countrySelect).toBeInTheDocument();
      
      // Check that options are available (they're in the DOM but not visible until opened)
      expect(screen.getByText('USA')).toBeInTheDocument();
      expect(screen.getByText('Canada')).toBeInTheDocument();
      expect(screen.getByText('UK')).toBeInTheDocument();

      // Check region options
      expect(screen.getByText('AMER')).toBeInTheDocument();
      expect(screen.getByText('EMEA')).toBeInTheDocument();
      expect(screen.getByText('APAC')).toBeInTheDocument();

      // Check franchisee options
      expect(screen.getByText('Franchise One')).toBeInTheDocument();
      expect(screen.getByText('Franchise Two')).toBeInTheDocument();
    });

    it('should show active filter count when filters are applied', () => {
      const filtersWithValues = {
        country: 'USA',
        region: 'AMER',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      expect(screen.getByText('2 active')).toBeInTheDocument();
    });

    it('should show clear all button when filters are active', () => {
      const filtersWithValues = {
        country: 'USA',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('should not show clear all button when no filters are active', () => {
      render(<MapFilters {...defaultProps} />);

      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });

    it('should show loading indicator when loading', () => {
      render(<MapFilters {...defaultProps} loading={true} />);

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should show loading states in select options when loading', () => {
      const propsWithEmptyOptions = {
        ...defaultProps,
        loading: true,
        availableOptions: {
          countries: [],
          regions: [],
          franchisees: [],
        },
      };

      render(<MapFilters {...propsWithEmptyOptions} />);

      expect(screen.getByText('Loading countries...')).toBeInTheDocument();
      expect(screen.getByText('Loading regions...')).toBeInTheDocument();
    });

    it('should show franchisee unavailable message when no franchisees available', () => {
      const propsWithNoFranchisees = {
        ...defaultProps,
        availableOptions: {
          ...defaultProps.availableOptions,
          franchisees: [],
        },
      };

      render(<MapFilters {...propsWithNoFranchisees} />);

      expect(screen.getByText('Franchisee filtering not available')).toBeInTheDocument();
    });

    it('should disable controls when loading', () => {
      render(<MapFilters {...defaultProps} loading={true} />);

      expect(screen.getByLabelText(/country/i)).toBeDisabled();
      expect(screen.getByLabelText(/region/i)).toBeDisabled();
      expect(screen.getByLabelText(/franchisee/i)).toBeDisabled();
    });

    it('should disable franchisee control when no franchisees available', () => {
      const propsWithNoFranchisees = {
        ...defaultProps,
        availableOptions: {
          ...defaultProps.availableOptions,
          franchisees: [],
        },
      };

      render(<MapFilters {...propsWithNoFranchisees} />);

      expect(screen.getByLabelText(/franchisee/i)).toBeDisabled();
    });
  });

  describe('filter interactions', () => {
    it('should call onFiltersChange when country filter changes', async () => {
      const user = userEvent.setup();
      render(<MapFilters {...defaultProps} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, 'USA');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        country: 'USA',
      });
    });

    it('should call onFiltersChange when region filter changes', async () => {
      const user = userEvent.setup();
      render(<MapFilters {...defaultProps} />);

      const regionSelect = screen.getByLabelText(/region/i);
      await user.selectOptions(regionSelect, 'EMEA');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
      });
    });

    it('should call onFiltersChange when franchisee filter changes', async () => {
      const user = userEvent.setup();
      render(<MapFilters {...defaultProps} />);

      const franchiseeSelect = screen.getByLabelText(/franchisee/i);
      await user.selectOptions(franchiseeSelect, 'franchise-1');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        franchiseeId: 'franchise-1',
      });
    });

    it('should remove filter when selecting empty option', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, '');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('should preserve existing filters when changing one filter', async () => {
      const user = userEvent.setup();
      const existingFilters = {
        country: 'USA',
        region: 'AMER',
      };

      render(<MapFilters {...defaultProps} filters={existingFilters} />);

      const franchiseeSelect = screen.getByLabelText(/franchisee/i);
      await user.selectOptions(franchiseeSelect, 'franchise-1');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        country: 'USA',
        region: 'AMER',
        franchiseeId: 'franchise-1',
      });
    });

    it('should clear all filters when clear all button is clicked', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
        region: 'AMER',
        franchiseeId: 'franchise-1',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('should not allow interactions when loading', async () => {
      const user = userEvent.setup();
      render(<MapFilters {...defaultProps} loading={true} />);

      const countrySelect = screen.getByLabelText(/country/i);
      const clearAllButton = screen.queryByText('Clear all');

      // Selects should be disabled
      expect(countrySelect).toBeDisabled();

      // Clear all button should be disabled if present
      if (clearAllButton) {
        expect(clearAllButton).toBeDisabled();
      }
    });
  });

  describe('telemetry tracking', () => {
    it('should track filter changes with correct data', async () => {
      const user = userEvent.setup();
      render(<MapFilters {...defaultProps} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, 'USA');

      expect(mockMapTelemetryHelpers.trackMapFilterChanged).toHaveBeenCalledWith(
        { country: 'USA' },
        { country: 'USA' },
        'test-user-123',
        {
          filterKey: 'country',
          oldValue: undefined,
          newValue: 'USA',
        }
      );
    });

    it('should track filter reset with correct data', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
        region: 'AMER',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);

      expect(mockMapTelemetryHelpers.trackMapFilterChanged).toHaveBeenCalledWith(
        { reset: true },
        {},
        'test-user-123',
        {
          action: 'reset_all_filters',
          previousFilterCount: 2,
          clearedFilters: filtersWithValues,
        }
      );
    });

    it('should not track telemetry when filter value does not change', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, 'USA'); // Same value

      expect(mockMapTelemetryHelpers.trackMapFilterChanged).not.toHaveBeenCalled();
    });

    it('should track when removing a filter', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, '');

      expect(mockMapTelemetryHelpers.trackMapFilterChanged).toHaveBeenCalledWith(
        { country: undefined },
        {},
        'test-user-123',
        {
          filterKey: 'country',
          oldValue: 'USA',
          newValue: undefined,
        }
      );
    });
  });

  describe('state updates', () => {
    it('should reflect current filter values in select controls', () => {
      const filtersWithValues = {
        country: 'USA',
        region: 'EMEA',
        franchiseeId: 'franchise-2',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      expect(screen.getByDisplayValue('USA')).toBeInTheDocument();
      expect(screen.getByDisplayValue('EMEA')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Franchise Two')).toBeInTheDocument();
    });

    it('should show default option text when no filter is selected', () => {
      render(<MapFilters {...defaultProps} />);

      const countrySelect = screen.getByLabelText(/country/i);
      const regionSelect = screen.getByLabelText(/region/i);
      const franchiseeSelect = screen.getByLabelText(/franchisee/i);

      expect(countrySelect).toHaveValue('');
      expect(regionSelect).toHaveValue('');
      expect(franchiseeSelect).toHaveValue('');
    });

    it('should update active filter count when filters change', () => {
      const { rerender } = render(<MapFilters {...defaultProps} />);

      // Initially no active filters
      expect(screen.queryByText(/active/)).not.toBeInTheDocument();

      // Add one filter
      rerender(<MapFilters {...defaultProps} filters={{ country: 'USA' }} />);
      expect(screen.getByText('1 active')).toBeInTheDocument();

      // Add another filter
      rerender(<MapFilters {...defaultProps} filters={{ country: 'USA', region: 'AMER' }} />);
      expect(screen.getByText('2 active')).toBeInTheDocument();

      // Remove all filters
      rerender(<MapFilters {...defaultProps} filters={{}} />);
      expect(screen.queryByText(/active/)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels for all form controls', () => {
      render(<MapFilters {...defaultProps} />);

      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/franchisee/i)).toBeInTheDocument();
    });

    it('should have proper button type for clear all button', () => {
      const filtersWithValues = {
        country: 'USA',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const clearAllButton = screen.getByText('Clear all');
      expect(clearAllButton).toHaveAttribute('type', 'button');
    });

    it('should have title attribute for disabled franchisee select', () => {
      const propsWithNoFranchisees = {
        ...defaultProps,
        availableOptions: {
          ...defaultProps.availableOptions,
          franchisees: [],
        },
      };

      render(<MapFilters {...propsWithNoFranchisees} />);

      const franchiseeSelect = screen.getByLabelText(/franchisee/i);
      expect(franchiseeSelect).toHaveAttribute('title', 'Franchisee data not available');
    });
  });

  describe('error handling', () => {
    it('should handle empty available options gracefully', () => {
      const propsWithEmptyOptions = {
        ...defaultProps,
        availableOptions: {
          countries: [],
          regions: [],
          franchisees: [],
        },
      };

      render(<MapFilters {...propsWithEmptyOptions} />);

      // Should still render the controls
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/franchisee/i)).toBeInTheDocument();

      // Should show appropriate default text
      expect(screen.getByText('All countries')).toBeInTheDocument();
      expect(screen.getByText('All regions')).toBeInTheDocument();
      expect(screen.getByText('All franchisees')).toBeInTheDocument();
    });

    it('should handle undefined filter values gracefully', () => {
      const filtersWithUndefined = {
        country: undefined,
        region: 'AMER',
        franchiseeId: undefined,
      };

      render(<MapFilters {...defaultProps} filters={filtersWithUndefined} />);

      // Should show 1 active filter (only region)
      expect(screen.getByText('1 active')).toBeInTheDocument();
      
      // Should reflect the values correctly
      expect(screen.getByDisplayValue('AMER')).toBeInTheDocument();
    });
  });

  describe('requirement 8.3 - filter changes verification', () => {
    it('should verify filter changes trigger appropriate callbacks for marker count updates', async () => {
      const user = userEvent.setup();
      render(<MapFilters {...defaultProps} />);

      // Test country filter change
      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, 'USA');

      // Verify the callback was called with the correct filter
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        country: 'USA',
      });

      // Test region filter change
      const regionSelect = screen.getByLabelText(/region/i);
      await user.selectOptions(regionSelect, 'AMER');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        region: 'AMER',
      });

      // Test franchisee filter change
      const franchiseeSelect = screen.getByLabelText(/franchisee/i);
      await user.selectOptions(franchiseeSelect, 'franchise-1');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        franchiseeId: 'franchise-1',
      });
    });

    it('should verify multiple filter combinations work correctly', async () => {
      const user = userEvent.setup();
      const existingFilters = {
        country: 'USA',
        region: 'AMER',
      };

      render(<MapFilters {...defaultProps} filters={existingFilters} />);

      // Add franchisee filter to existing filters
      const franchiseeSelect = screen.getByLabelText(/franchisee/i);
      await user.selectOptions(franchiseeSelect, 'franchise-2');

      // Should preserve existing filters and add new one
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        country: 'USA',
        region: 'AMER',
        franchiseeId: 'franchise-2',
      });
    });

    it('should verify filter removal works correctly', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
        region: 'AMER',
        franchiseeId: 'franchise-1',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      // Remove country filter
      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, '');

      // Should remove only the country filter
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        region: 'AMER',
        franchiseeId: 'franchise-1',
      });
    });

    it('should verify clear all filters functionality', async () => {
      const user = userEvent.setup();
      const filtersWithValues = {
        country: 'USA',
        region: 'AMER',
        franchiseeId: 'franchise-1',
      };

      render(<MapFilters {...defaultProps} filters={filtersWithValues} />);

      const clearAllButton = screen.getByText('Clear all');
      await user.click(clearAllButton);

      // Should clear all filters
      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });
  });
});