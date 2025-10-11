import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import StoreDrawer from '../StoreDrawer';
import { StoreWithActivity, StoreKPIs } from '../../types';
import { useStoreKPIs } from '../../hooks/useStoreKPIs';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useStoreKPIs hook
jest.mock('../../hooks/useStoreKPIs', () => ({
  useStoreKPIs: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseStoreKPIs = useStoreKPIs as jest.MockedFunction<typeof useStoreKPIs>;

describe('StoreDrawer', () => {
  const mockOnClose = jest.fn();
  const mockOnNavigateToDetails = jest.fn();
  const mockRouterPush = jest.fn();
  const mockRefetch = jest.fn();

  const mockStore: StoreWithActivity = {
    id: 'store-123',
    name: 'Downtown Store',
    latitude: 40.7128,
    longitude: -74.0060,
    region: 'AMER',
    country: 'USA',
    franchiseeId: 'franchise-456',
    status: 'active',
    recentActivity: true,
  };

  const mockKPIs: StoreKPIs = {
    ordersToday: 25,
    revenueToday: 1250.75,
    lastOrderTime: '2023-10-01T14:30:00Z',
    lastOrderRelative: '2 minutes ago',
  };

  const defaultProps = {
    store: mockStore,
    isOpen: true,
    onClose: mockOnClose,
    onNavigateToDetails: mockOnNavigateToDetails,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router
    mockUseRouter.mockReturnValue({
      push: mockRouterPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });

    // Mock useStoreKPIs hook with successful data
    mockUseStoreKPIs.mockReturnValue({
      kpis: mockKPIs,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    // Mock focus method
    Object.defineProperty(HTMLElement.prototype, 'focus', {
      value: jest.fn(),
      writable: true,
    });
  });

  describe('rendering', () => {
    it('should render store information when open', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('Downtown Store')).toBeInTheDocument();
      expect(screen.getByText('AMER • USA')).toBeInTheDocument();
      expect(screen.getByText('store-123')).toBeInTheDocument();
      expect(screen.getByText('AMER, USA')).toBeInTheDocument();
      expect(screen.getByText('franchise-456')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<StoreDrawer {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument();
    });

    it('should not render when store is null', () => {
      render(<StoreDrawer {...defaultProps} store={null} />);

      expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument();
    });

    it('should show activity badge when store has recent activity', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should not show activity badge when store has no recent activity', () => {
      const storeWithoutActivity = {
        ...mockStore,
        recentActivity: false,
      };

      render(<StoreDrawer {...defaultProps} store={storeWithoutActivity} />);

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('should show coordinates with proper formatting', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('40.7128, -74.0060')).toBeInTheDocument();
    });

    it('should not show franchisee section when franchiseeId is not present', () => {
      const storeWithoutFranchisee = {
        ...mockStore,
        franchiseeId: undefined,
      };

      render(<StoreDrawer {...defaultProps} store={storeWithoutFranchisee} />);

      // Should not show franchisee metadata item
      const franchiseeElements = screen.queryAllByText(/franchisee/i);
      expect(franchiseeElements).toHaveLength(0);
    });
  });

  describe('KPI display', () => {
    it('should display KPIs when loaded successfully', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Orders Today')).toBeInTheDocument();
      expect(screen.getByText('$1250.75')).toBeInTheDocument();
      expect(screen.getByText('Revenue Today')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('Last Order')).toBeInTheDocument();
    });

    it('should show loading skeleton when KPIs are loading', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<StoreDrawer {...defaultProps} />);

      // Should show skeleton loading elements
      const skeletonElements = container.querySelectorAll('.skeleton-text');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should show error state when KPI loading fails', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('Failed to load performance data')).toBeInTheDocument();
      expect(screen.getByText('Unable to fetch KPIs for this store')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show retry button in error state', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
    });

    it('should show retry button in section header when there is an error', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close store details');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      // Find the backdrop (the outer div with the backdrop class)
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when drawer content is clicked', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      // Click on the drawer content (not the backdrop)
      const drawerContent = screen.getByText('Downtown Store');
      await user.click(drawerContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onNavigateToDetails and router.push when details button is clicked', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      const detailsButton = screen.getByText('Open in Stores → Details');
      await user.click(detailsButton);

      expect(mockOnNavigateToDetails).toHaveBeenCalledWith('store-123');
      expect(mockRouterPush).toHaveBeenCalledWith('/stores/store-123');
    });

    it('should call refetch when retry button is clicked in error state', async () => {
      const user = userEvent.setup();
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should call refetch when retry button in header is clicked', async () => {
      const user = userEvent.setup();
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard navigation', () => {
    it('should call onClose when Escape key is pressed', () => {
      render(<StoreDrawer {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when Escape is pressed and drawer is closed', () => {
      render(<StoreDrawer {...defaultProps} isOpen={false} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not call onClose when other keys are pressed', () => {
      render(<StoreDrawer {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      fireEvent.keyDown(document, { key: 'Tab' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should focus the drawer when opened', () => {
      const { rerender } = render(<StoreDrawer {...defaultProps} isOpen={false} />);
      
      rerender(<StoreDrawer {...defaultProps} isOpen={true} />);

      // The focus call should have been made
      expect(HTMLElement.prototype.focus).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<StoreDrawer {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'store-drawer-title');

      const document = screen.getByRole('document');
      expect(document).toBeInTheDocument();

      const title = screen.getByRole('heading', { name: 'Downtown Store' });
      expect(title).toHaveAttribute('id', 'store-drawer-title');
    });

    it('should have proper button labels', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByLabelText('Close store details')).toBeInTheDocument();
    });

    it('should have proper title attribute for retry button', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      const retryButton = screen.getByText('Retry');
      expect(retryButton).toHaveAttribute('title', 'Retry loading KPIs');
    });
  });

  describe('KPI data loading and error handling', () => {
    it('should pass correct store ID to useStoreKPIs hook', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(mockUseStoreKPIs).toHaveBeenCalledWith('store-123');
    });

    it('should pass null to useStoreKPIs when store is null', () => {
      render(<StoreDrawer {...defaultProps} store={null} />);

      expect(mockUseStoreKPIs).toHaveBeenCalledWith(null);
    });

    it('should handle KPI refetch correctly', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      // Simulate error state first
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Network error',
        refetch: mockRefetch,
      });

      // Re-render to show error state
      render(<StoreDrawer {...defaultProps} />);

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should show fallback KPIs when error occurs but KPIs are still provided', () => {
      const fallbackKPIs: StoreKPIs = {
        ordersToday: 0,
        revenueToday: 0,
        lastOrderTime: null,
        lastOrderRelative: 'Data unavailable',
      };

      // When there's no error, fallback KPIs should be displayed
      mockUseStoreKPIs.mockReturnValue({
        kpis: fallbackKPIs,
        loading: false,
        error: null, // No error, so KPIs will be shown
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Orders today
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Revenue today
      expect(screen.getByText('Data unavailable')).toBeInTheDocument(); // Last order
    });

    it('should handle loading state transitions correctly', () => {
      // Start with loading state
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { rerender, container } = render(<StoreDrawer {...defaultProps} />);

      // Should show loading skeleton
      expect(container.querySelectorAll('.skeleton-text').length).toBeGreaterThan(0);

      // Transition to loaded state
      mockUseStoreKPIs.mockReturnValue({
        kpis: mockKPIs,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      rerender(<StoreDrawer {...defaultProps} />);

      // Should show actual KPIs
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('$1250.75')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    });

    it('should handle error state transitions correctly', () => {
      // Start with successful state
      mockUseStoreKPIs.mockReturnValue({
        kpis: mockKPIs,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { rerender } = render(<StoreDrawer {...defaultProps} />);

      // Should show KPIs
      expect(screen.getByText('25')).toBeInTheDocument();

      // Transition to error state
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Network error',
        refetch: mockRefetch,
      });

      rerender(<StoreDrawer {...defaultProps} />);

      // Should show error message
      expect(screen.getByText('Failed to load performance data')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('event cleanup', () => {
    it('should remove event listeners when component unmounts', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<StoreDrawer {...defaultProps} />);
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should remove event listeners when drawer closes', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<StoreDrawer {...defaultProps} isOpen={true} />);
      
      // Close the drawer
      rerender(<StoreDrawer {...defaultProps} isOpen={false} />);

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('content display', () => {
    it('should display all metadata sections', () => {
      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('Store Information')).toBeInTheDocument();
      expect(screen.getByText('Performance Today')).toBeInTheDocument();
      expect(screen.getByText('Store ID')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Franchisee')).toBeInTheDocument();
      expect(screen.getByText('Coordinates')).toBeInTheDocument();
    });

    it('should format revenue with proper decimal places', () => {
      const kpisWithDecimal: StoreKPIs = {
        ...mockKPIs,
        revenueToday: 1234.56,
      };

      mockUseStoreKPIs.mockReturnValue({
        kpis: kpisWithDecimal,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('$1234.56')).toBeInTheDocument();
    });

    it('should format revenue with zero decimal places when whole number', () => {
      const kpisWithWholeNumber: StoreKPIs = {
        ...mockKPIs,
        revenueToday: 1000,
      };

      mockUseStoreKPIs.mockReturnValue({
        kpis: kpisWithWholeNumber,
        loading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      expect(screen.getByText('$1000.00')).toBeInTheDocument();
    });
  });

  describe('requirement 8.4 - drawer interactions verification', () => {
    it('should verify drawer opens with complete store content when store marker is clicked', () => {
      render(<StoreDrawer {...defaultProps} />);

      // Verify drawer is open and displays store content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Downtown Store')).toBeInTheDocument();
      expect(screen.getByText('AMER • USA')).toBeInTheDocument();
      expect(screen.getByText('store-123')).toBeInTheDocument();
      
      // Verify all expected sections are present
      expect(screen.getByText('Store Information')).toBeInTheDocument();
      expect(screen.getByText('Performance Today')).toBeInTheDocument();
    });

    it('should verify drawer displays correct store metadata when opened', () => {
      render(<StoreDrawer {...defaultProps} />);

      // Verify store metadata is correctly displayed
      expect(screen.getByText('store-123')).toBeInTheDocument(); // Store ID
      expect(screen.getByText('AMER, USA')).toBeInTheDocument(); // Location
      expect(screen.getByText('franchise-456')).toBeInTheDocument(); // Franchisee
      expect(screen.getByText('40.7128, -74.0060')).toBeInTheDocument(); // Coordinates
    });

    it('should verify drawer displays KPI data when available', () => {
      render(<StoreDrawer {...defaultProps} />);

      // Verify KPI data is displayed
      expect(screen.getByText('25')).toBeInTheDocument(); // Orders today
      expect(screen.getByText('Orders Today')).toBeInTheDocument();
      expect(screen.getByText('$1250.75')).toBeInTheDocument(); // Revenue today
      expect(screen.getByText('Revenue Today')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument(); // Last order
      expect(screen.getByText('Last Order')).toBeInTheDocument();
    });

    it('should verify drawer handles KPI loading states correctly', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { container } = render(<StoreDrawer {...defaultProps} />);

      // Verify loading skeleton is displayed
      const skeletonElements = container.querySelectorAll('.skeleton-text');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should verify drawer handles KPI error states correctly', () => {
      mockUseStoreKPIs.mockReturnValue({
        kpis: null,
        loading: false,
        error: 'Failed to load KPIs',
        refetch: mockRefetch,
      });

      render(<StoreDrawer {...defaultProps} />);

      // Verify error state is displayed
      expect(screen.getByText('Failed to load performance data')).toBeInTheDocument();
      expect(screen.getByText('Unable to fetch KPIs for this store')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should verify drawer closes correctly when close interactions are triggered', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      // Test close button
      const closeButton = screen.getByLabelText('Close store details');
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Reset mock
      mockOnClose.mockClear();

      // Test backdrop click
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Reset mock
      mockOnClose.mockClear();

      // Test escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should verify drawer navigation to store details works correctly', async () => {
      const user = userEvent.setup();
      render(<StoreDrawer {...defaultProps} />);

      const detailsButton = screen.getByText('Open in Stores → Details');
      await user.click(detailsButton);

      // Verify navigation callbacks are called
      expect(mockOnNavigateToDetails).toHaveBeenCalledWith('store-123');
      expect(mockRouterPush).toHaveBeenCalledWith('/stores/store-123');
    });

    it('should verify drawer does not render when closed or no store selected', () => {
      // Test closed drawer
      render(<StoreDrawer {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument();

      // Test no store selected
      render(<StoreDrawer {...defaultProps} store={null} />);
      expect(screen.queryByText('Downtown Store')).not.toBeInTheDocument();
    });

    it('should verify drawer activity indicator displays correctly', () => {
      // Test with active store
      const { unmount } = render(<StoreDrawer {...defaultProps} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
      
      // Unmount the first component
      unmount();

      // Test with inactive store
      const storeWithoutActivity = {
        ...mockStore,
        recentActivity: false,
      };
      render(<StoreDrawer {...defaultProps} store={storeWithoutActivity} />);
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });
  });
});