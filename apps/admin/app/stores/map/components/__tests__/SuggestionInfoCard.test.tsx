import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SuggestionInfoCard from '../SuggestionInfoCard';

describe('SuggestionInfoCard', () => {
  const mockSuggestion = {
    id: 'test-1',
    lat: 52.5200,
    lng: 13.4050,
    confidence: 0.85,
    band: 'HIGH' as const,
    rationale: {
      population: 0.9,
      proximityGap: 0.8,
      turnoverGap: 0.85,
      notes: 'strong population density, underserved area'
    },
    rationaleText: 'This location shows strong potential based on strong population density, underserved area. The nearest existing store is 1200m away.',
    status: 'NEW'
  };

  const mockOnClose = jest.fn();
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display all suggestion data', () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
        nearestStoreDistance={1200}
      />
    );

    expect(screen.getByText('Why here?')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText(/52.5200, 13.4050/)).toBeInTheDocument();
    expect(screen.getByText('1200m')).toBeInTheDocument();
  });

  it('should display factor breakdowns', () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Factor Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();
    expect(screen.getByText('Proximity Gap')).toBeInTheDocument();
    expect(screen.getByText('Turnover Potential')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument(); // Population score
    expect(screen.getByText('80%')).toBeInTheDocument(); // Proximity score
    expect(screen.getByText('85%')).toBeInTheDocument(); // Turnover score
  });

  it('should display rationale text', () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText(/This location shows strong potential/)).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onStatusChange when Approve button clicked', async () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('APPROVED');
    });
  });

  it('should call onStatusChange when Reject button clicked', async () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('REJECTED');
    });
  });

  it('should call onStatusChange when Review button clicked', async () => {
    render(
      <SuggestionInfoCard
        suggestion={mockSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    const reviewButton = screen.getByText('Review');
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('REVIEWED');
    });
  });

  it('should display status badge when status is not NEW', () => {
    const approvedSuggestion = { ...mockSuggestion, status: 'APPROVED' };
    
    render(
      <SuggestionInfoCard
        suggestion={approvedSuggestion}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });
});
