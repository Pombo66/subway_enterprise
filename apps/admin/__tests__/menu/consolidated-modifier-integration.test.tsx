import { render, screen, fireEvent, waitFor } from '../../lib/test-utils/test-wrapper'
import userEvent from '@testing-library/user-event'
import MenuPage from '../../app/menu/page'

/**
 * Integration tests for the consolidated modifier workflow
 * These tests verify the complete workflow without requiring a backend server
 */
describe('Consolidated Modifier Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.confirm for delete operations
    window.confirm = jest.fn(() => true)
  })

  test('complete workflow: create item with modifiers and verify table display', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
    })
    
    // Step 1: Create new item with modifiers
    const createButton = screen.getByRole('button', { name: /create item/i })
    await user.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
    })
    
    // Fill form with item details
    await user.type(screen.getByLabelText(/item name/i), 'Integration Test Sandwich')
    await user.type(screen.getByLabelText(/price/i), '12.99')
    await user.type(screen.getByLabelText(/description/i), 'A test sandwich for integration testing')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Meat')
    
    // Select all modifiers
    const breadCheckbox = screen.getByText('Bread Types').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    const extrasCheckbox = screen.getByText('Extras').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    const saucesCheckbox = screen.getByText('Sauces').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    
    await user.click(breadCheckbox)
    await user.click(extrasCheckbox)
    await user.click(saucesCheckbox)
    
    // Verify all are selected
    expect(breadCheckbox).toBeChecked()
    expect(extrasCheckbox).toBeChecked()
    expect(saucesCheckbox).toBeChecked()
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /add item/i }))
    
    // Step 2: Verify drawer closes and item appears in table
    await waitFor(() => {
      expect(screen.queryByText('Add New Menu Item')).not.toBeInTheDocument()
    })
    
    expect(screen.getByText('Integration Test Sandwich')).toBeInTheDocument()
    
    // Step 3: Verify modifier count is displayed correctly
    const newItemRow = screen.getByText('Integration Test Sandwich').closest('.menu-row')
    expect(newItemRow).toBeTruthy()
    expect(newItemRow?.querySelector('.menu-cell')).toBeTruthy()
    
    // Find the modifier count cell in the new item row
    const modifierCountText = newItemRow?.textContent
    expect(modifierCountText).toContain('3 groups')
  })

  test('complete workflow: edit existing item modifiers and verify table update', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Italian BMT')).toBeInTheDocument()
    })
    
    // Get initial modifier count
    const initialRow = screen.getByText('Italian BMT').closest('.menu-row')
    const initialModifierText = initialRow?.textContent
    expect(initialModifierText).toContain('3 groups')
    
    // Step 1: Open edit drawer for Italian BMT
    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument()
    })
    
    // Step 2: Modify the modifiers (uncheck one)
    const extrasCheckbox = screen.getByText('Extras').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(extrasCheckbox).toBeChecked() // Should be initially checked
    
    await user.click(extrasCheckbox) // Uncheck it
    expect(extrasCheckbox).not.toBeChecked()
    
    // Step 3: Save changes
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    
    // Step 4: Verify drawer closes and table updates
    await waitFor(() => {
      expect(screen.queryByText('Edit Menu Item')).not.toBeInTheDocument()
    })
    
    // Step 5: Verify modifier count updated in table
    const updatedRow = screen.getByText('Italian BMT').closest('.menu-row')
    const updatedModifierText = updatedRow?.textContent
    expect(updatedModifierText).toContain('2 groups') // Should be reduced by 1
  })

  test('verify no modifiers drawer functionality exists', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)
    
    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
      expect(screen.getByTestId('menu-table')).toBeInTheDocument()
    })
    
    // Step 1: Verify no modifiers buttons exist in actions
    const modifiersButtons = screen.queryAllByRole('button', { name: /modifiers/i })
    expect(modifiersButtons).toHaveLength(0)
    
    // Step 2: Verify only Edit and Delete buttons exist
    const editButtons = screen.getAllByText('Edit')
    const deleteButtons = screen.getAllByText('Delete')
    
    expect(editButtons.length).toBeGreaterThan(0)
    expect(deleteButtons.length).toBeGreaterThan(0)
    expect(editButtons.length).toBe(deleteButtons.length) // Should have equal numbers
    
    // Step 3: Verify no modifiers drawer components exist
    expect(screen.queryByText('Manage Modifiers')).not.toBeInTheDocument()
    expect(screen.queryByText('Available Modifiers')).not.toBeInTheDocument()
    expect(screen.queryByText('Attached Modifiers')).not.toBeInTheDocument()
    
    // Step 4: Try clicking on modifier count cells - should not open any drawer
    const modifierCells = screen.getAllByText(/\d+ groups/)
    expect(modifierCells.length).toBeGreaterThan(0)
    
    // Click on first modifier count cell
    await user.click(modifierCells[0])
    
    // Wait and verify no drawer opened
    await waitFor(() => {
      expect(screen.queryByText('Manage Modifiers')).not.toBeInTheDocument()
    }, { timeout: 1000 })
  })

  test('verify modifier counts display correctly for all items', async () => {
    render(<MenuPage />)
    
    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Italian BMT')).toBeInTheDocument()
      expect(screen.getByText('Turkey Breast')).toBeInTheDocument()
      expect(screen.getByText('Veggie Delite')).toBeInTheDocument()
    })
    
    // Verify each item shows correct modifier count based on mock data
    const italianBMTRow = screen.getByText('Italian BMT').closest('.menu-row')
    const turkeyBreastRow = screen.getByText('Turkey Breast').closest('.menu-row')
    const veggieDeliteRow = screen.getByText('Veggie Delite').closest('.menu-row')
    
    // Italian BMT has ['bread', 'extras', 'sauces'] = 3 groups
    expect(italianBMTRow?.textContent).toContain('3 groups')
    
    // Turkey Breast has ['bread', 'sauces'] = 2 groups
    expect(turkeyBreastRow?.textContent).toContain('2 groups')
    
    // Veggie Delite has ['bread', 'extras'] = 2 groups (based on actual data)
    expect(veggieDeliteRow?.textContent).toContain('2 groups')
    
    // Verify modifiers column header exists
    expect(screen.getByText('Modifiers')).toBeInTheDocument()
  })

  test('verify form validation and error handling', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)
    
    // Wait for page load
    await waitFor(() => {
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
    })
    
    // Step 1: Try to create item without required fields
    await user.click(screen.getByRole('button', { name: /create item/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
    })
    
    // Try to submit without filling required fields
    const addButton = screen.getByRole('button', { name: /add item/i })
    await user.click(addButton)
    
    // Form should not submit (drawer should remain open)
    expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
    
    // Step 2: Fill only name, leave price empty
    await user.type(screen.getByLabelText(/item name/i), 'Test Item')
    await user.click(addButton)
    
    // Should still not submit
    expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
    
    // Step 3: Fill all required fields
    await user.type(screen.getByLabelText(/price/i), '5.99')
    await user.click(addButton)
    
    // Should now submit successfully
    await waitFor(() => {
      expect(screen.queryByText('Add New Menu Item')).not.toBeInTheDocument()
    })
    
    // Verify item was added
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  test('verify ESC key handling for both drawers', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
    })
    
    // Test ESC key for Add drawer
    await user.click(screen.getByRole('button', { name: /create item/i }))
    await waitFor(() => {
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
    })
    
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Add New Menu Item')).not.toBeInTheDocument()
    })
    
    // Test ESC key for Edit drawer
    await waitFor(() => {
      expect(screen.getByText('Italian BMT')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument()
    })
    
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByText('Edit Menu Item')).not.toBeInTheDocument()
    })
  })
})