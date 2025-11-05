/**
 * CountryInferenceDisplay Component Tests
 * 
 * Tests for the country inference display component that shows detected country
 * with confidence badges and allows manual override.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import CountryInferenceDisplay from '../CountryInferenceDisplay';
import { CountryInference } from '../../../../lib/import/types';

describe('CountryInferenceDisplay', () => {
  const mockOnCountryChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering with different confidence levels', () => {
    it('should render with high confidence inference', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
        />
      );

      expect(screen.getByText(/Germany/)).toBeInTheDocument();
      expect(screen.getByText(/High/)).toBeInTheDocument();
      expect(screen.getByText(/from postcodes/)).toBeInTheDocument();
    });

    it('should render with medium confidence inference', () => {
      const inference: CountryInference = {
        country: 'US',
        confidence: 'medium',
        method: 'filename',
        displayText: 'Detected: United States 🇺🇸 (from filename)',
        countryCode: 'US',
        flagEmoji: '🇺🇸'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
        />
      );

      expect(screen.getByText(/United States/)).toBeInTheDocument();
      expect(screen.getByText(/Medium/)).toBeInTheDocument();
      expect(screen.getByText(/from filename/)).toBeInTheDocument();
    });

    it('should render with low confidence and show required indicator', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'low',
        method: 'fallback',
        displayText: 'Default: Germany 🇩🇪',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument(); // Required indicator
      expect(screen.getByText(/Low/)).toBeInTheDocument();
    });
  });

  describe('Manual country override', () => {
    it('should call onCountryChange when country is manually selected', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'FR' } });

      expect(mockOnCountryChange).toHaveBeenCalledWith('FR');
    });

    it('should show manual indicator when country is manually overridden', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride="FR"
          onCountryChange={mockOnCountryChange}
        />
      );

      expect(screen.getByText(/Manual selection/)).toBeInTheDocument();
      expect(screen.queryByText(/High/)).not.toBeInTheDocument();
    });

    it('should display the manually overridden country', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride="FR"
          onCountryChange={mockOnCountryChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('FR');
    });
  });

  describe('Disabled state during import', () => {
    it('should disable the select when disabled prop is true', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should not call onCountryChange when disabled', () => {
      const inference: CountryInference = {
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      render(
        <CountryInferenceDisplay
          inference={inference}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'FR' } });

      expect(mockOnCountryChange).not.toHaveBeenCalled();
    });
  });

  describe('Null inference handling', () => {
    it('should render with default country when inference is null', () => {
      render(
        <CountryInferenceDisplay
          inference={null}
          manualOverride={null}
          onCountryChange={mockOnCountryChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('DE'); // Default to Germany
    });
  });
});
