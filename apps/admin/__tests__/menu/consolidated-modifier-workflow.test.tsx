import { render, screen, fireEvent, waitFor } from '../../lib/test-utils/test-wrapper'
import userEvent from '@testing-library/user-event'
import MenuPage from '../../app/menu/page'
import MenuTable from '../../app/menu/components/MenuTable'
import { MenuItem } from '../../lib/types'

// Mock data
const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Italian BMT',
    price: 8.99,
    active: true,
    description: 'Pepperoni, salami, and ham',
    category: 'Meat',
    modifiers: ['bread', 'extras', 'sauces'],
    Store: {
      id: 'store1',
      name: 'Downtown Store',
      region: 'EMEA'
    }
  },
  {
    id: '2',
    name: 'Turkey Breast',
    price: 7.99,
    active: true,
    description: 'Oven roasted turkey breast',
    category: 'Meat',
    modifiers: ['bread', 'sauces'],
    Store: {
      id: 'store1',
      name: 'Downtown Store',
      region: 'EMEA'
    }
  },
  {
    id: '3',
    name: 'Veggie Delite',
    price: 6.99,
    active: false,
    description: 'Fresh vegetables and cheese',
    category: 'Vegetarian',
    modifiers: ['bread'],
    Store: {
      id: 'store2',
      name: 'Mall Store',
      region: 'AMER'
    }
  }
]

describe('Consolidated Modifier Workflow', () => {
  describe('MenuTable Component', () => {
    const mockProps = {
      items: mockMenuItems,
      loading: false,
      error: null,
      onRefresh: jest.fn(),
      onEditItem: jest.fn(),
      onDeleteItem: jest.fn()
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should display correct modifier counts in table', () => {
      render(<MenuTable {...mockProps} />)
      
      // Verify modifier counts are displayed correctly
      expect(screen.getByText('3 groups')).toBeInTheDocument()
      expect(screen.getByText('2 groups')).toBeInTheDocument()
      expect(screen.getByText('1 groups')).toBeInTheDocument()
    })

    test('should display modifiers column header', () => {
      render(<MenuTable {...mockProps} />)
      
      expect(screen.getByText('Modifiers')).toBeInTheDocument()
    })

    test('should not display modifiers action buttons', () => {
      render(<MenuTable {...mockProps} />)
      
      // Verify no "Modifiers" buttons exist in actions
      const modifiersButtons = screen.queryAllByText(/modifiers/i).filter(
        element => element.tagName === 'BUTTON'
      )
      expect(modifiersButtons).toHaveLength(0)
    })

    test('should only display Edit and Delete buttons in actions', () => {
      render(<MenuTable {...mockProps} />)
      
      // Should have Edit buttons for each item
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons).toHaveLength(3)
      
      // Should have Delete buttons for each item
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(3)
    })

    test('should handle items with no modifiers', () => {
      const itemsWithNoModifiers: MenuItem[] = [
        {
          id: '4',
          name: 'Plain Item',
          price: 5.99,
          active: true,
          modifiers: undefined
        }
      ]

      render(<MenuTable {...{ ...mockProps, items: itemsWithNoModifiers }} />)
      
      expect(screen.getByText('0 groups')).toBeInTheDocument()
    })

    test('should handle items with empty modifiers array', () => {
      const itemsWithEmptyModifiers: MenuItem[] = [
        {
          id: '5',
          name: 'Empty Modifiers Item',
          price: 5.99,
          active: true,
          modifiers: []
        }
      ]

      render(<MenuTable {...{ ...mockProps, items: itemsWithEmptyModifiers }} />)
      
      expect(screen.getByText('0 groups')).toBeInTheDocument()
    })

    test('should call onEditItem when Edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuTable {...mockProps} />)
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      
      expect(mockProps.onEditItem).toHaveBeenCalledWith(mockMenuItems[0])
    })

    test('should call onDeleteItem when Delete button is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true)
      
      render(<MenuTable {...mockProps} />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(mockProps.onDeleteItem).toHaveBeenCalledWith('1')
    })
  })

  describe('MenuPage Component', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('should render menu page without modifiers drawer', () => {
      render(<MenuPage />)
      
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
      expect(screen.queryByText('Manage Modifiers')).not.toBeInTheDocument()
    })

    test('should open Add Item drawer when Create Item button is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      const createButton = screen.getByRole('button', { name: /create item/i })
      await user.click(createButton)
      
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
    })

    test('should open Edit Item drawer when Edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Italian BMT')).toBeInTheDocument()
      })
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument()
    })

    test('should close drawers with ESC key', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      // Open Add Item drawer
      const createButton = screen.getByRole('button', { name: /create item/i })
      await user.click(createButton)
      expect(screen.getByText('Add New Menu Item')).toBeInTheDocument()
      
      // Press ESC
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByText('Add New Menu Item')).not.toBeInTheDocument()
      })
    })

    test('should handle modifier selection in Add Item drawer', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      // Open Add Item drawer
      const createButton = screen.getByRole('button', { name: /create item/i })
      await user.click(createButton)
      
      // Fill in basic details
      await user.type(screen.getByLabelText(/item name/i), 'Test Sandwich')
      await user.type(screen.getByLabelText(/price/i), '9.99')
      
      // Select modifiers by finding checkboxes within the modifier groups
      const breadCheckbox = screen.getByText('Bread Types').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      const extrasCheckbox = screen.getByText('Extras').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      
      expect(breadCheckbox).toBeTruthy()
      expect(extrasCheckbox).toBeTruthy()
      
      await user.click(breadCheckbox)
      await user.click(extrasCheckbox)
      
      expect(breadCheckbox).toBeChecked()
      expect(extrasCheckbox).toBeChecked()
      
      // Submit form
      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)
      
      // Verify drawer closes and item is added
      await waitFor(() => {
        expect(screen.queryByText('Add New Menu Item')).not.toBeInTheDocument()
      })
      
      // Verify new item appears in table
      expect(screen.getByText('Test Sandwich')).toBeInTheDocument()
    })

    test('should handle modifier editing in Edit Item drawer', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Italian BMT')).toBeInTheDocument()
      })
      
      // Open Edit drawer for first item
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument()
      
      // Get checkboxes by finding them within modifier groups
      const breadCheckbox = screen.getByText('Bread Types').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      const extrasCheckbox = screen.getByText('Extras').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      const saucesCheckbox = screen.getByText('Sauces').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      
      expect(breadCheckbox).toBeTruthy()
      expect(extrasCheckbox).toBeTruthy()
      expect(saucesCheckbox).toBeTruthy()
      
      // Italian BMT has ['bread', 'extras', 'sauces'] modifiers
      expect(breadCheckbox).toBeChecked()
      expect(extrasCheckbox).toBeChecked()
      expect(saucesCheckbox).toBeChecked()
      
      // Uncheck one modifier
      await user.click(extrasCheckbox)
      expect(extrasCheckbox).not.toBeChecked()
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      // Verify drawer closes
      await waitFor(() => {
        expect(screen.queryByText('Edit Menu Item')).not.toBeInTheDocument()
      })
    })

    test('should preserve form state when canceling edit', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Italian BMT')).toBeInTheDocument()
      })
      
      // Get original modifier count
      const originalModifierText = screen.getByText('3 groups')
      expect(originalModifierText).toBeInTheDocument()
      
      // Open Edit drawer
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      
      // Make changes
      const extrasCheckbox = screen.getByText('Extras').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(extrasCheckbox).toBeTruthy()
      await user.click(extrasCheckbox) // Uncheck
      
      // Cancel instead of save
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      // Verify drawer closes and original state is preserved
      await waitFor(() => {
        expect(screen.queryByText('Edit Menu Item')).not.toBeInTheDocument()
      })
      
      // Modifier count should remain unchanged
      expect(screen.getByText('3 groups')).toBeInTheDocument()
    })

    test('should handle items with limited modifiers in edit drawer', async () => {
      const user = userEvent.setup()
      render(<MenuPage />)
      
      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByText('Veggie Delite')).toBeInTheDocument()
      })
      
      // Open Edit drawer for Veggie Delite (has only 'bread' modifier)
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[2]) // Third item
      
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument()
      
      // Get checkboxes by finding them within modifier groups
      const breadCheckbox = screen.getByText('Bread Types').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      const extrasCheckbox = screen.getByText('Extras').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      const saucesCheckbox = screen.getByText('Sauces').closest('.modifier-group')?.querySelector('input[type="checkbox"]') as HTMLInputElement
      
      expect(breadCheckbox).toBeTruthy()
      expect(extrasCheckbox).toBeTruthy()
      expect(saucesCheckbox).toBeTruthy()
      
      // Test that we can interact with all checkboxes
      const initialBreadState = breadCheckbox.checked
      const initialExtrasState = extrasCheckbox.checked
      const initialSaucesState = saucesCheckbox.checked
      
      // Toggle each checkbox and verify the state changes
      await user.click(breadCheckbox)
      expect(breadCheckbox.checked).toBe(!initialBreadState)
      
      await user.click(extrasCheckbox)
      expect(extrasCheckbox.checked).toBe(!initialExtrasState)
      
      await user.click(saucesCheckbox)
      expect(saucesCheckbox.checked).toBe(!initialSaucesState)
    })

    test('should not render any modifiers drawer components', () => {
      render(<MenuPage />)
      
      // Verify no modifiers drawer elements exist
      expect(screen.queryByText('Manage Modifiers')).not.toBeInTheDocument()
      expect(screen.queryByText('Available Modifiers')).not.toBeInTheDocument()
      expect(screen.queryByText('Attached Modifiers')).not.toBeInTheDocument()
      expect(screen.queryByTestId('modifiers-button')).not.toBeInTheDocument()
    })
  })
})