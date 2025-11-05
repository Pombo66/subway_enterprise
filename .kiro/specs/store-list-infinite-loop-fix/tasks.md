# Implementation Plan

- [x] 1. Fix fetchStores callback dependencies
  - Remove `showError` from useCallback dependencies
  - Implement inline error handling using custom events or direct DOM manipulation
  - Ensure fetchStores has zero or only stable dependencies
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_

- [x] 2. Stabilize loading state management
  - Verify `isLoadingRef` is properly preventing concurrent requests
  - Verify `hasInitialLoadRef` prevents duplicate initial loads
  - Add console logging to track fetch invocations during testing
  - _Requirements: 1.1, 1.4, 4.4, 4.5_

- [x] 3. Fix CascadingFilters initialization
  - Remove `onFiltersChange` call from the mount useEffect
  - Let parent component handle initial data load
  - Ensure filters only trigger API calls on user interaction
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Update button elements to use Subway UI classes
- [x] 4.1 Update store name link buttons
  - Change `.store-name-link` to `.s-btn .s-btn--ghost`
  - Maintain existing visual styling
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4.2 Update action buttons (View, Edit, Delete)
  - Change `.stores-action-btn` to `.s-btn .s-btn--sm`
  - Add appropriate variant classes for different actions
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4.3 Update pagination buttons
  - Change `.pagination-btn` to `.s-btn .s-btn--ghost`
  - Change `.pagination-number` to `.s-btn .s-btn--ghost .s-btn--sm`
  - Maintain active state styling
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 4.4 Update Add New Store button
  - Change `.menu-add-button-custom` to `.s-btn .s-btn--primary`
  - Ensure primary button styling is applied
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 5. Verify Design Guard compliance
  - Load the stores page in development mode
  - Check browser console for Design Guard warnings
  - Verify all interactive elements use proper Subway UI classes
  - _Requirements: 2.3, 2.5_

- [x] 6. Test infinite loop fix
  - Navigate to `/stores` and verify single initial load
  - Apply filters and verify single API call per change
  - Upload store data and verify single refresh
  - Monitor console for duplicate API calls or loop indicators
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7. Clean up unused CSS classes
  - Remove `.store-name-link` custom styles if no longer needed
  - Remove `.stores-action-btn` custom styles if no longer needed
  - Remove `.pagination-btn` and `.pagination-number` custom styles if no longer needed
  - Remove `.menu-add-button-custom` custom styles if no longer needed
  - _Requirements: 2.4_
