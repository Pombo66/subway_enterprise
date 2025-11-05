import { render, screen } from '@testing-library/react';
import ClientTimeDisplay from '../ClientTimeDisplay';

// Mock useEffect to simulate server/client differences
const originalUseEffect = React.useEffect;
let mockIsClient = false;

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn(),
  useState: jest.fn(),
}));

import React from 'react';

const mockUseState = React.useState as jest.MockedFunction<typeof React.useState>;
const mockUseEffect = React.useEffect as jest.MockedFunction<typeof React.useEffect>;

describe('ClientTimeDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsClient = false;
    
    // Mock useState to return our controlled state
    mockUseState.mockImplementation((initial) => {
      if (typeof initial === 'boolean') {
        return [mockIsClient, jest.fn()];
      }
      return [initial, jest.fn()];
    });
    
    // Mock useEffect to simulate client-side mounting
    mockUseEffect.mockImplementation((effect) => {
      if (typeof effect === 'function') {
        // Simulate the effect running and setting isClient to true
        setTimeout(() => {
          mockIsClient = true;
        }, 0);
      }
    });
  });

  it('should render fallback on server side', () => {
    mockIsClient = false;
    mockUseState.mockReturnValue([false, jest.fn()]);
    
    render(
      <ClientTimeDisplay fallback={<div>Loading time...</div>}>
        <div>Client time content</div>
      </ClientTimeDisplay>
    );

    expect(screen.getByText('Loading time...')).toBeInTheDocument();
    expect(screen.queryByText('Client time content')).not.toBeInTheDocument();
  });

  it('should render children on client side', () => {
    mockIsClient = true;
    mockUseState.mockReturnValue([true, jest.fn()]);
    
    render(
      <ClientTimeDisplay fallback={<div>Loading time...</div>}>
        <div>Client time content</div>
      </ClientTimeDisplay>
    );

    expect(screen.getByText('Client time content')).toBeInTheDocument();
    expect(screen.queryByText('Loading time...')).not.toBeInTheDocument();
  });

  it('should render null fallback when no fallback provided', () => {
    mockIsClient = false;
    mockUseState.mockReturnValue([false, jest.fn()]);
    
    const { container } = render(
      <ClientTimeDisplay>
        <div>Client time content</div>
      </ClientTimeDisplay>
    );

    expect(container.firstChild).toBeNull();
  });
});