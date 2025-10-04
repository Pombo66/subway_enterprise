import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TelemetryDebug from '../TelemetryDebug';

// Mock the telemetry utility
jest.mock('@/lib/telemetry', () => ({
  submitTelemetryEvent: jest.fn(),
  generateSessionId: jest.fn(() => 'session_123_abc'),
  TelemetryEventTypes: {
    PAGE_VIEW: 'page_view',
    USER_ACTION: 'user_action',
    ERROR: 'error',
  },
}));

const mockSubmitTelemetryEvent = require('@/lib/telemetry').submitTelemetryEvent;

describe('TelemetryDebug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console warnings for cleaner test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render when visible', () => {
    render(<TelemetryDebug isVisible={true} onClose={() => {}} />);
    
    expect(screen.getByText('Telemetry Debug Panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Event Type *')).toBeInTheDocument();
    expect(screen.getByText('Submit Event')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<TelemetryDebug isVisible={false} onClose={() => {}} />);
    
    expect(screen.queryByText('Telemetry Debug Panel')).not.toBeInTheDocument();
  });

  it('should handle successful event submission', async () => {
    mockSubmitTelemetryEvent.mockResolvedValue(true);
    
    render(<TelemetryDebug isVisible={true} onClose={() => {}} />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Event Type *'), {
      target: { value: 'test_event' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Event'));
    
    await waitFor(() => {
      expect(screen.getByText('✓ Success')).toBeInTheDocument();
      expect(screen.getByText('Event submitted successfully')).toBeInTheDocument();
    });
    
    expect(mockSubmitTelemetryEvent).toHaveBeenCalledWith({
      eventType: 'test_event',
      userId: undefined,
      sessionId: 'debug_session_123_abc',
      properties: undefined,
    });
  });

  it('should handle failed event submission', async () => {
    mockSubmitTelemetryEvent.mockResolvedValue(false);
    
    render(<TelemetryDebug isVisible={true} onClose={() => {}} />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Event Type *'), {
      target: { value: 'test_event' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Event'));
    
    await waitFor(() => {
      expect(screen.getByText('✗ Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to submit event')).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    mockSubmitTelemetryEvent.mockRejectedValue(new Error('Network error'));
    
    render(<TelemetryDebug isVisible={true} onClose={() => {}} />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Event Type *'), {
      target: { value: 'test_event' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Event'));
    
    await waitFor(() => {
      expect(screen.getByText('✗ Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should populate form with quick test data', () => {
    render(<TelemetryDebug isVisible={true} onClose={() => {}} />);
    
    // Click the Page View quick test button
    fireEvent.click(screen.getByText('Page View'));
    
    expect(screen.getByDisplayValue('page_view')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/dashboard/)).toBeInTheDocument();
  });

  it('should validate JSON properties', async () => {
    render(<TelemetryDebug isVisible={true} onClose={() => {}} />);
    
    // Fill in invalid JSON
    fireEvent.change(screen.getByLabelText('Event Type *'), {
      target: { value: 'test_event' }
    });
    fireEvent.change(screen.getByLabelText('Properties (JSON)'), {
      target: { value: 'invalid json' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit Event'));
    
    await waitFor(() => {
      expect(screen.getByText('✗ Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid JSON in properties field')).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<TelemetryDebug isVisible={true} onClose={mockOnClose} />);
    
    fireEvent.click(screen.getByText('×'));
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});