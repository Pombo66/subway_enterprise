/**
 * PreviewModal State Management Tests
 * 
 * Tests for country inference state management in PreviewModal,
 * including inference on modal open, manual override, and final country determination.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreviewModal from '../PreviewModal';
import { ParsedRow } from '../../../../lib/types/store-upload';
import { countryInferrer } from '../../../../lib/import/countryInference';
import { telemetryService } from '../../../../lib/import/telemetry';

// Mock dependencies
jest.mock('../../../../lib/import/countryInference');
jest.mock('../../../../lib/import/telemetry');
jest.mock('../../../components/ToastProvider', () => ({
  useToast: () => ({
    showError: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn()
  })
}));

const mockCountryInferrer = countryInferrer as jest.Mocked<typeof countryInferrer>;
const mockTelemetryService = telemetryService as jest.Mocked<typeof telemetryService>;

describe('PreviewModal State Management', () => {
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

  describe('Inference runs on modal open', () => {
    it('should call countryInferrer when modal opens', async () => {
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
        expect(mockCountryInferrer.inferCountry).toHaveBeenCalledWith(
          'germany_stores.xlsx',
          expect.any(Array),
          undefined
        );
      });
    });

    it('should emit telemetry event after inference', async () => {
      const inference = {
        country: 'DE',
        confidence: 'high' as const,
        method: 'format' as const,
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      };

      mockCountryInferrer.inferCountry.mockReturnValue(inference);

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
        expect(mockTelemetryService.emitCountryInferred).toHaveBeenCalledWith(inference);
      });
    });

    it('should not run inference when modal is closed', () => {
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
          isOpen={false}
          detectedHeaders={['name', 'address', 'city', 'postcode']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="germany_stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(mockCountryInferrer.inferCountry).not.toHaveBeenCalled();
    });
  });

  describe('Manual override updates state', () => {
    it('should update state when country is manually changed', async () => {
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
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const countrySelect = screen.getByRole('combobox');
      fireEvent.change(countrySelect, { target: { value: 'FR' } });

      await waitFor(() => {
        expect(screen.getByText(/Manual selection/)).toBeInTheDocument();
      });
    });

    it('should preserve manual override when reopening modal', async () => {
      mockCountryInferrer.inferCountry.mockReturnValue({
        country: 'DE',
        confidence: 'high',
        method: 'format',
        displayText: 'Detected: Germany 🇩🇪 (from postcodes)',
        countryCode: 'DE',
        flagEmoji: '🇩🇪'
      });

      const { rerender } = render(
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
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Manually change country
      const countrySelect = screen.getByRole('combobox');
      fireEvent.change(countrySelect, { target: { value: 'FR' } });

      // Close and reopen modal
      rerender(
        <PreviewModal
          isOpen={false}
          detectedHeaders={['name', 'address', 'city', 'postcode']}
          sampleRows={sampleRows}
          suggestedMapping={suggestedMapping}
          totalRows={1}
          filename="germany_stores.xlsx"
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      rerender(
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

      // Manual override should be reset on reopen
      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('DE'); // Back to inferred value
      });
    });
  });

  describe('Final country determination logic', () => {
    it('should use manual override as final country', async () => {
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
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Manually override to France
      const countrySelect = screen.getByRole('combobox');
      fireEvent.change(countrySelect, { target: { value: 'FR' } });

      const importButton = screen.getByText('Import & Geocode');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(
          expect.any(Object),
          'FR' // Manual override takes precedence
        );
      });
    });

    it('should use inferred country when no manual override', async () => {
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
          'DE' // Inferred country
        );
      });
    });

    it('should emit telemetry on successful import', async () => {
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
        expect(mockTelemetryService.emitCustomEvent).toHaveBeenCalledWith(
          'import_with_inferred_country',
          expect.objectContaining({
            country: 'DE',
            rowCount: 1,
            inferenceConfidence: 'high',
            wasManualOverride: false,
            filename: 'germany_stores.xlsx'
          })
        );
      });
    });
  });
});
