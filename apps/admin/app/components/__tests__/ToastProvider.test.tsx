import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../ToastProvider'

// Test component that uses the toast context
function TestComponent() {
  const { showSuccess, showError, showInfo } = useToast()
  
  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
    </div>
  )
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('provides toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    expect(screen.getByText('Show Success')).toBeInTheDocument()
    expect(screen.getByText('Show Error')).toBeInTheDocument()
    expect(screen.getByText('Show Info')).toBeInTheDocument()
  })

  it('shows success toast when showSuccess is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const successButton = screen.getByText('Show Success')
    
    act(() => {
      successButton.click()
    })

    await screen.findByText('Success message')
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50')
  })

  it('shows error toast when showError is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const errorButton = screen.getByText('Show Error')
    
    act(() => {
      errorButton.click()
    })

    await screen.findByText('Error message')
    expect(screen.getByRole('alert')).toHaveClass('bg-red-50')
  })

  it('shows info toast when showInfo is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    const infoButton = screen.getByText('Show Info')
    
    act(() => {
      infoButton.click()
    })

    await screen.findByText('Info message')
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50')
  })

  it('can show multiple toasts simultaneously', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Success').click()
      screen.getByText('Show Error').click()
      screen.getByText('Show Info').click()
    })

    await screen.findByText('Success message')
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByText('Info message')).toBeInTheDocument()
  })

  it('removes toasts after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Success').click()
    })
    
    await screen.findByText('Success message')

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('removes toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Show Success').click()
    })
    
    await screen.findByText('Success message')

    const closeButton = screen.getByLabelText('Close notification')
    
    act(() => {
      closeButton.click()
    })

    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  it('throws error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    consoleSpy.mockRestore()
  })
})