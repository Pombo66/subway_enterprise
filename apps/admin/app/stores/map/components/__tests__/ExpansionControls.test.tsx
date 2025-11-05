import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpansionControls from '../ExpansionControls';

describe('ExpansionControls', () => {
  const mockOnGenerate = jest.fn();
  const mockOnSaveScenario = jest.fn();
  const mockOnLoadScenario = jest.fn();
  const mockScenarios = [
    { id: '1', label: 'Test Scenario 1', createdAt: new Date() },
    { id: '2', label: 'Test Scenario 2', createdAt: new Date() }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all control elements', () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={false}
        scenarios={mockScenarios}
      />
    );

    expect(screen.getByText('Expansion Controls')).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText(/Aggression/)).toBeInTheDocument();
    expect(screen.getByText(/Population Bias/)).toBeInTheDocument();
    expect(screen.getByText(/Proximity Bias/)).toBeInTheDocument();
    expect(screen.getByText(/Turnover Bias/)).toBeInTheDocument();
    expect(screen.getByText('Minimum Distance (meters)')).toBeInTheDocument();
  });

  it('should update aggression slider value', () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={false}
        scenarios={[]}
      />
    );

    const slider = screen.getByRole('slider', { name: /aggression/i });
    fireEvent.change(slider, { target: { value: '80' } });

    expect(screen.getByText(/Aggression: 80/)).toBeInTheDocument();
  });

  it('should call onGenerate when generate button clicked', async () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={false}
        scenarios={[]}
      />
    );

    const generateButton = screen.getByText('Generate Suggestions');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable generate button when loading', () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={true}
        scenarios={[]}
      />
    );

    const generateButton = screen.getByText('Generating...');
    expect(generateButton).toBeDisabled();
  });

  it('should show validation errors for invalid inputs', () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={false}
        scenarios={[]}
      />
    );

    const minDistanceInput = screen.getByLabelText('Minimum Distance (meters)');
    fireEvent.change(minDistanceInput, { target: { value: '50' } });

    expect(screen.getByText(/Minimum distance must be at least 100 meters/)).toBeInTheDocument();
  });

  it('should disable generate button when validation fails', () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={false}
        scenarios={[]}
      />
    );

    const minDistanceInput = screen.getByLabelText('Minimum Distance (meters)');
    fireEvent.change(minDistanceInput, { target: { value: '50' } });

    const generateButton = screen.getByText('Generate Suggestions');
    expect(generateButton).toBeDisabled();
  });

  it('should render scenario dropdown when scenarios exist', () => {
    render(
      <ExpansionControls
        onGenerate={mockOnGenerate}
        onSaveScenario={mockOnSaveScenario}
        onLoadScenario={mockOnLoadScenario}
        loading={false}
        scenarios={mockScenarios}
      />
    );

    expect(screen.getByText('Load Scenario')).toBeInTheDocument();
    expect(screen.getByText('Test Scenario 1')).toBeInTheDocument();
    expect(screen.getByText('Test Scenario 2')).toBeInTheDocument();
  });
});
