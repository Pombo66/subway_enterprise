import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadStoreData from '../../app/stores/components/UploadStoreData';

// Mock the toast provider
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockShowInfo = jest.fn();

jest.mock('../../app/components/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: mockShowInfo
  })
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment variable
Object.defineProperty(process.env, 'NEXT_PUBLIC_ALLOW_UPLOAD', {
  value: 'true',
  writable: true
});

describe('UploadStoreData', () => {
  const mockOnUploadSuccess = jest.fn();
  const mockOnRefreshData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upload button when feature is enabled', () => {
    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    expect(screen.getByText('Upload Store Data')).toBeInTheDocument();
  });

  it('should not render when feature is disabled', () => {
    Object.defineProperty(process.env, 'NEXT_PUBLIC_ALLOW_UPLOAD', {
      value: 'false',
      writable: true
    });

    const { container } = render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle file selection and upload', async () => {
    const user = userEvent.setup();

    // Mock successful upload response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          headers: ['Name', 'Address', 'City', 'Country'],
          sampleRows: [
            {
              index: 0,
              data: { Name: 'Store 1', Address: '123 Main St', City: 'New York', Country: 'USA' },
              validationStatus: 'valid',
              validationErrors: [],
              isDuplicate: false
            }
          ],
          suggestedMapping: { name: 'Name', address: 'Address', city: 'City', country: 'Country' },
          totalRows: 1
        }
      })
    });

    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    const uploadButton = screen.getByText('Upload Store Data');
    await user.click(uploadButton);

    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Name,Address,City,Country\nStore 1,123 Main St,New York,USA'], 'test.csv', {
      type: 'text/csv'
    });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/stores/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });

    expect(mockShowInfo).toHaveBeenCalledWith(expect.stringContaining('Uploading'));
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('Found 1 rows'));
  });

  it('should show error for invalid file types', async () => {
    const user = userEvent.setup();

    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    const uploadButton = screen.getByText('Upload Store Data');
    await user.click(uploadButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });

    await user.upload(fileInput, file);

    expect(mockShowError).toHaveBeenCalledWith('Please upload a valid Excel (.xlsx) or CSV file.');
  });

  it('should show error for empty files', async () => {
    const user = userEvent.setup();

    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    const uploadButton = screen.getByText('Upload Store Data');
    await user.click(uploadButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([''], 'test.csv', { type: 'text/csv' });

    await user.upload(fileInput, file);

    expect(mockShowError).toHaveBeenCalledWith('The selected file is empty.');
  });

  it('should show error for files that are too large', async () => {
    const user = userEvent.setup();

    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    const uploadButton = screen.getByText('Upload Store Data');
    await user.click(uploadButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a file larger than 50MB
    const largeContent = 'x'.repeat(51 * 1024 * 1024);
    const file = new File([largeContent], 'test.csv', { type: 'text/csv' });

    await user.upload(fileInput, file);

    expect(mockShowError).toHaveBeenCalledWith('File is too large. Please select a file smaller than 50MB.');
  });

  it('should handle upload API errors', async () => {
    const user = userEvent.setup();

    // Mock failed upload response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: 'Invalid file format' }))
    });

    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    const uploadButton = screen.getByText('Upload Store Data');
    await user.click(uploadButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Name,Address\nStore 1,123 Main St'], 'test.csv', { type: 'text/csv' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Invalid file format');
    });
  });

  it('should disable button during upload', async () => {
    const user = userEvent.setup();

    // Mock a slow upload response
    (fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { headers: [], sampleRows: [], suggestedMapping: {}, totalRows: 0 }
        })
      }), 1000))
    );

    render(
      <UploadStoreData
        onUploadSuccess={mockOnUploadSuccess}
        onRefreshData={mockOnRefreshData}
      />
    );

    const uploadButton = screen.getByText('Upload Store Data');
    await user.click(uploadButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Name\nStore 1'], 'test.csv', { type: 'text/csv' });

    await user.upload(fileInput, file);

    // Button should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    // Button should be disabled
    const button = screen.getByText('Uploading...');
    expect(button).toBeDisabled();
  });
});