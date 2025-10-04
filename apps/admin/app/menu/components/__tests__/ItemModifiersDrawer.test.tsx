import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ItemModifiersDrawer from '../ItemModifiersDrawer'
import { ToastProvider } from '../../../components/ToastProvider'

// Mock the API module
jest.mock('../../../lib/api', () => ({
  bff: jest.fn(),
}))

const mockBff = require('../../../lib/api').bff

// Mock data
const mockModifierGroups = [
  { id: '1', name: 'Bread Types', description: 'Choose your bread', active: true },
  { id: '2', name: 'Extras', description: 'Add extra toppings', active: true },
  { id: '3', name: 'Sauces', description: 'Select your sauce', active: true },
]

const mockAttachedGroups = [
  { id: '1', name: 'Bread Types', description: 'Choose your bread', active: true },
]

const mockAvailableGroups = [
  { id: '2', name: 'Extras', description: 'Add extra toppings', active: true },
  { id: '3', name: 'Sauces', description: 'Select your sauce', active: true },
]

// Wrapper component with ToastProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
)

describe('ItemModifiersDrawer', () => {
  const defaultProps = {
    itemId: 'test-item-id',
    itemName: 'Test Item',
    isOpen: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful API responses by default
    mockBff
      .mockResolvedValueOnce({ success: true, data: mockModifierGroups }) // /menu/modifier-groups
      .mockResolvedValueOnce({ success: true, data: mockAttachedGroups }) // /menu/items/:id/modifiers
  })

  afterEach(() => {
    document.body.style.overflow = 'unset'
  })

  it('renders drawer when open', async () => {
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByText('Manage Modifiers')).toBeInTheDocument()
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Available Modifiers (2)')).toBeInTheDocument()
      expect(screen.getByText('Attached Modifiers (1)')).toBeInTheDocument()
    })
  })

  it('does not render drawer when closed', () => {
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} isOpen={false} />
      </TestWrapper>
    )

    expect(screen.queryByText('Manage Modifiers')).not.toBeInTheDocument()
  })

  it('loads modifier data on open', async () => {
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockBff).toHaveBeenCalledWith('/menu/modifier-groups')
      expect(mockBff).toHaveBeenCalledWith('/menu/items/test-item-id/modifiers')
    })

    expect(screen.getByText('Extras')).toBeInTheDocument()
    expect(screen.getByText('Sauces')).toBeInTheDocument()
    expect(screen.getByText('Bread Types')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByText('Loading modifiers...')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    mockBff
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ success: true, data: mockAttachedGroups })

    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument()
    })

    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('attaches modifier successfully', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Extras')).toBeInTheDocument()
    })

    // Mock successful attach response
    mockBff.mockResolvedValueOnce({ success: true })

    const attachButton = screen.getAllByLabelText(/Attach .* modifier/)[0]
    await user.click(attachButton)

    await waitFor(() => {
      expect(mockBff).toHaveBeenCalledWith('/menu/items/test-item-id/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifierGroupId: '2' })
      })
    })
  })

  it('detaches modifier successfully', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Bread Types')).toBeInTheDocument()
    })

    // Mock successful detach response
    mockBff.mockResolvedValueOnce({ success: true })

    const detachButton = screen.getByLabelText(/Detach .* modifier/)
    await user.click(detachButton)

    await waitFor(() => {
      expect(mockBff).toHaveBeenCalledWith('/menu/items/test-item-id/modifiers/1', {
        method: 'DELETE'
      })
    })
  })

  it('handles attach failure with rollback', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Extras')).toBeInTheDocument()
    })

    // Mock failed attach response
    mockBff.mockResolvedValueOnce({ success: false, error: 'Attach failed' })

    const attachButton = screen.getAllByLabelText(/Attach .* modifier/)[0]
    await user.click(attachButton)

    await waitFor(() => {
      expect(screen.getByText('Extras')).toBeInTheDocument() // Should still be in available
    })
  })

  it('closes drawer on ESC key', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes drawer on backdrop click', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const backdrop = document.querySelector('.bg-black.bg-opacity-50')
    expect(backdrop).toBeInTheDocument()
    
    await user.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Extras')).toBeInTheDocument()
    })

    // Clear previous calls
    mockBff.mockClear()
    
    // Mock refresh responses
    mockBff
      .mockResolvedValueOnce({ success: true, data: mockModifierGroups })
      .mockResolvedValueOnce({ success: true, data: mockAttachedGroups })

    const refreshButton = screen.getByLabelText('Refresh modifier data')
    await user.click(refreshButton)

    await waitFor(() => {
      expect(mockBff).toHaveBeenCalledWith('/menu/modifier-groups')
      expect(mockBff).toHaveBeenCalledWith('/menu/items/test-item-id/modifiers')
    })
  })

  it('shows correct counts for available and attached modifiers', async () => {
    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Available Modifiers (2)')).toBeInTheDocument()
      expect(screen.getByText('Attached Modifiers (1)')).toBeInTheDocument()
      expect(screen.getByText('1 modifier attached')).toBeInTheDocument()
    })
  })

  it('shows empty states correctly', async () => {
    // Mock empty responses
    mockBff
      .mockResolvedValueOnce({ success: true, data: [] }) // no modifier groups
      .mockResolvedValueOnce({ success: true, data: [] }) // no attached modifiers

    render(
      <TestWrapper>
        <ItemModifiersDrawer {...defaultProps} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('No available modifiers')).toBeInTheDocument()
      expect(screen.getByText('No attached modifiers')).toBeInTheDocument()
      expect(screen.getByText('0 modifiers attached')).toBeInTheDocument()
    })
  })
})