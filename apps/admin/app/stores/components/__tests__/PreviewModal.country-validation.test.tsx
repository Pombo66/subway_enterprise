/**
 * PreviewModal Country Validation Tests
 * 
 * Tests for country validation logic in the PreviewModal component,
 * ensuring country is optional when confidence is high/medium and required when low.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreviewModal from '../PreviewModal';
import { ParsedRow } from '../../../../lib/types/store-upload';
import { countryInferrer } from '../../../../lib/import/countryInference';

// Mock dependencies
jest.mock('../../../../lib/import/countryInference');
jest.mock('../../../../lib/import/telemetry', () => ({
  telemetryService: {
    emitCountryInferred: jest.fn(),
    emitCustomEvent: jest.fn()
  }
}));
jest.mock('../../../components/ToastProvider', () => ({
  useToast: () => ({
    showError: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn()
  })
}));

const mockCountryInferrer = countryInferrer as jest.Mocked<typeof countryInferrer>;

describe('PreviewModal Country Validation', () => {
  const mockOnClose = jest.fn();
  const mockOnImport = jest.fn();

  const sampleRows: ParsedRow[] = [
    {
      index: 0,
      data: { name: 'Store 1', address: '123 Main St', city: 'Berlin', postcode: '10115' },
      validationStatus: 'valid',
      validationErrors: [],
      isDuplicate: false
    }
  ];

  const suggestedMapping = {
    name: 'name',
    address: 'address',
    city: 'city',
    postcode: 'postcode'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnImport.mockResolvedValue(undefined);
  });

  describe('High confidence country inference', () => {
    it('should allow import without country column when confidence is high', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      });

      render(
        <PreviewModal
          isOpen={true}
          detectedHeaders={['name', 'address', 'city', 'postcode']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="germany_stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
      });

      const importButton = screen.getByText('Import & Geocode');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(
          expect.any(Object),
          'DE'
        );
      });
    });

    it('should not show required indicator for country when confidence is high', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      });

      render(
        <PreviewModal
          isOpen={true}
          detectedHeaders={['name', 'address', 'city', 'postcode']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="germany_stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        const countryLabel = screen.getByText('Country');
        expect(countryLabel.textContent).not.toContain('*');
      });
    });
  });

  describe('Medium confidence country inference', () => {
    it('should allow import without country column when confidence is medium', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'US',
        confidence: 'medium',
        method: 'filename',
        displayText: 'Detected: United States 🇺🇸 (from filename)',
        countryCode: 'US',
        flagEmoji: '🇺🇸'
      });

      render(
        <PreviewModal
          isOpen={true}
          detectedHeaders={['name', 'address', 'city']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="usa_stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/United States/)).toBeInTheDocument();
      });

      const importButton = screen.getByText('Import & Geocode');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(
          expect.any(Object),
          'US'
        );
      });
    });
  });

  describe('Low confidence country inference', () => {
    it('should require country column or manual selection when confidence is low', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'DE',
        confidence: 'low',
        method: 'fallback',
        displayText: 'Default: Germany 🇩🇪',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      });

      const { useToast } = require('../../../components/ToastProvider');
      const mockShowError = jest.fn();
      (useToast as jest.Mock).mockReturnValue({
        showError: mockShowError,
        showInfo: jest.fn(),
        showSuccess: jest.fn()
      });

      render(
        <PreviewModal
          isOpen={true}
          detectedHeaders={['name', 'address', 'city']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Low/)).toBeInTheDocument();
      });

      const importButton = screen.getByText('Import & Geocode');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          expect.stringContaining('country')
        );
      });

      expect(mockOnImport).not.toHaveBeenCalled();
    });
  });

  describe('Manual country override', () => {
    it('should allow import with manual country override even when confidence is low', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'DE',
        confidence: 'low',
        method: 'fallback',
        displayText: 'Default: Germany 🇩🇪',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      });

      render(
        <PreviewModal
          isOpen={true}
          detectedHeaders={['name', 'address', 'city']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Manually select a country
      const countrySelect = screen.getByRole('combobox');
      fireEvent.change(countrySelect, { target: { value: 'FR' } });

      const importButton = screen.getByText('Import & Geocode');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(
          expect.any(Object),
          'FR'
        );
      });
    });
  });

  describe('Country column mapping', () => {
    it('should allow import when country column is mapped even with low confidence', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'DE',
        confidence: 'low',
        method: 'fallback',
        displayText: 'Default: Germany 🇩🇪',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      });

      const mappingWithCountry = {
        ...suggestedMapping,
        country: 'country'
      };

      render(
        <PreviewModal
          isOpen={true}
          detectedHeaders={['name', 'address', 'city', 'country']}
          sampleRows={sampleRows}
          suggestedMapping={mappingWithCountry}
          totalRows={1}
          filename="stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const importButton = screen.getByText('Import & Geocode');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalled();
      });
    });
  });
});
