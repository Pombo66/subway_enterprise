import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay, FieldError, ErrorState } from '../ErrorDisplay';
import { ValidationError } from '@/lib/types/error.types';

// Mock ErrorHandler
jest.mock('@/lib/types/error.types', () => ({
  ErrorHandler: {
    parseError: jest.fn((error) => {
      if (typeof error === 'string') {
        return { message: error, details: [] };
      }
      if (error instanceof Error) {
        return { message: error.message, details: [] };
      }
      if (error && typeof error === 'object' && 'message' in error && 'details' in error) {
        return { message: error.message, details: error.details };
      }
      return { message: 'Unknown error', details: [] };
    }),
    hasFieldError: jest.fn((errors, fieldName) => {
      return errors?.some((err: ValidationError) => err.field === fieldName) || false;
    }),
    getFieldError: jest.fn((errors, fieldName) => {
      const error = errors?.find((err: ValidationError) => err.field === fieldName);
      return error?.message;
    }),
  },
}));

describe('ErrorDisplay', () => {
  test('should render simple error message', () => {
    render(<ErrorDisplay error="Something went wrong" />);
    
    // The component shows "Validation Error" for all errors by default due to mock behavior
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('should render Error object', () => {
    const error = new Error('Network connection failed');
    render(<ErrorDisplay error={error} />);
    
    // The component shows "Validation Error" for all errors by default due to mock behavior
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  test('should render validation errors with details', () => {
    const error = {
      message: 'Validation failed',
      details: [
        { field: 'name', message: 'Name is required', code: 'required' },
        { field: 'email', message: 'Invalid email format', code: 'invalid_email' },
      ],
    };

    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
    expect(screen.getByText('name:')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('email:')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  test('should apply custom className', () => {
    const { container } = render(
      <ErrorDisplay error="Test error" className="custom-error-class" />
    );
    
    const errorDiv = container.querySelector('.custom-error-class');
    expect(errorDiv).toBeInTheDocument();
  });

  test('should show retry button when enabled', () => {
    const mockRetry = jest.fn();
    render(
      <ErrorDisplay 
        error="Network error" 
        showRetry={true} 
        onRetry={mockRetry} 
      />
    );
    
    const retryButton = screen.getByText('Try again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  test('should not show retry button by default', () => {
    render(<ErrorDisplay error="Test error" />);
    
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  test('should render error icon', () => {
    render(<ErrorDisplay error="Test error" />);
    
    // SVG elements don't have role="img" by default, let's check for the SVG element
    const errorIcon = document.querySelector('svg');
    expect(errorIcon).toBeInTheDocument();
  });
});

describe('FieldError', () => {
  const mockErrors: ValidationError[] = [
    { field: 'name', message: 'Name is required', code: 'required' },
    { field: 'email', message: 'Invalid email format', code: 'invalid_email' },
  ];

  test('should render field error when error exists', () => {
    render(<FieldError errors={mockErrors} fieldName="name" />);
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  test('should not render when no errors provided', () => {
    const { container } = render(<FieldError fieldName="name" />);
    
    expect(container.firstChild).toBeNull();
  });

  test('should not render when field has no error', () => {
    const { container } = render(
      <FieldError errors={mockErrors} fieldName="nonexistent" />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('should apply custom className', () => {
    render(
      <FieldError 
        errors={mockErrors} 
        fieldName="name" 
        className="custom-field-error" 
      />
    );
    
    const errorElement = screen.getByText('Name is required');
    expect(errorElement).toHaveClass('custom-field-error');
  });

  test('should have correct styling classes', () => {
    render(<FieldError errors={mockErrors} fieldName="name" />);
    
    const errorElement = screen.getByText('Name is required');
    expect(errorElement).toHaveClass('text-sm', 'text-red-600', 'mt-1');
  });
});

describe('ErrorState', () => {
  test('should render with default props', () => {
    render(<ErrorState />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We encountered an error while loading this content.')).toBeInTheDocument();
  });

  test('should render with custom title and message', () => {
    render(
      <ErrorState 
        title="Custom Error Title"
        message="Custom error message for testing"
      />
    );
    
    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    expect(screen.getByText('Custom error message for testing')).toBeInTheDocument();
  });

  test('should render action button when provided', () => {
    const mockAction = jest.fn();
    render(
      <ErrorState 
        action={{
          label: 'Reload Page',
          onClick: mockAction,
        }}
      />
    );
    
    const actionButton = screen.getByText('Reload Page');
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should not render action button when not provided', () => {
    render(<ErrorState />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('should apply custom className', () => {
    const { container } = render(
      <ErrorState className="custom-error-state" />
    );
    
    const errorStateDiv = container.querySelector('.custom-error-state');
    expect(errorStateDiv).toBeInTheDocument();
  });

  test('should render warning icon', () => {
    render(<ErrorState />);
    
    // SVG elements don't have role="img" by default, let's check for the SVG element
    const warningIcon = document.querySelector('svg');
    expect(warningIcon).toBeInTheDocument();
  });

  test('should have correct button styling', () => {
    const mockAction = jest.fn();
    render(
      <ErrorState 
        action={{
          label: 'Retry',
          onClick: mockAction,
        }}
      />
    );
    
    const actionButton = screen.getByText('Retry');
    expect(actionButton).toHaveClass(
      'inline-flex',
      'items-center',
      'px-4',
      'py-2',
      'border',
      'border-transparent',
      'shadow-sm',
      'text-sm',
      'font-medium',
      'rounded-md',
      'text-white',
      'bg-blue-600',
      'hover:bg-blue-700'
    );
  });

  test('should center content', () => {
    const { container } = render(<ErrorState />);
    
    const errorStateDiv = container.firstChild;
    expect(errorStateDiv).toHaveClass('text-center', 'py-12');
  });
});