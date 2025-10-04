import { render, screen, fireEvent, act } from '@testing-library/react'
import Toast from '../Toast'

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast',
    type: 'success' as const,
    message: 'Test message',
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders toast with correct message and type', () => {
    render(<Toast {...defaultProps} />)
    
    expect(screen.getByText('Test message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50', 'border-green-200')
  })

  it('renders error toast with correct styling', () => {
    render(<Toast {...defaultProps} type="error" />)
    
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'border-red-200')
  })

  it('renders info toast with correct styling', () => {
    render(<Toast {...defaultProps} type="info" />)
    
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50', 'border-blue-200')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<Toast {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByLabelText('Close notification')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledWith('test-toast')
  })

  it('auto-closes after default duration', () => {
    const onClose = jest.fn()
    render(<Toast {...defaultProps} onClose={onClose} />)
    
    expect(onClose).not.toHaveBeenCalled()
    
    act(() => {
      jest.advanceTimersByTime(5000) // Default duration
    })
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('auto-closes after custom duration', () => {
    const onClose = jest.fn()
    render(<Toast {...defaultProps} onClose={onClose} duration={3000} />)
    
    expect(onClose).not.toHaveBeenCalled()
    
    act(() => {
      jest.advanceTimersByTime(2999)
    })
    expect(onClose).not.toHaveBeenCalled()
    
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not auto-close when duration is 0', () => {
    const onClose = jest.fn()
    render(<Toast {...defaultProps} onClose={onClose} duration={0} />)
    
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clears timeout when component unmounts', () => {
    const onClose = jest.fn()
    const { unmount } = render(<Toast {...defaultProps} onClose={onClose} />)
    
    unmount()
    
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    
    expect(onClose).not.toHaveBeenCalled()
  })

  it('has correct accessibility attributes', () => {
    render(<Toast {...defaultProps} />)
    
    const toast = screen.getByRole('alert')
    expect(toast).toHaveAttribute('aria-live', 'polite')
  })

  it('shows correct styling for each type', () => {
    const { rerender } = render(<Toast {...defaultProps} type="success" />)
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800')
    
    rerender(<Toast {...defaultProps} type="error" />)
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800')
    
    rerender(<Toast {...defaultProps} type="info" />)
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800')
  })
})