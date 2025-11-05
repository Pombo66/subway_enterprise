'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadStoreDataProps, ImportSummary, ParsedRow } from '../../../lib/types/store-upload';
import { validateClientAccess, isValidFileType, formatFileSize } from '../../../lib/upload';
import { useToast } from '../../components/ToastProvider';
import { emitStoresImported } from '../../../lib/events/store-events';
import PreviewModal from './PreviewModal';
import PerformanceDashboard from './PerformanceDashboard';

export default function UploadStoreData({ onUploadSuccess, onRefreshData }: UploadStoreDataProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    sampleRows: ParsedRow[];
    suggestedMapping: Record<string, string>;
    totalRows: number;
    uploadId: string;
    filename: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showInfo } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    if (isUploading) return;

    try {
      // Validate client access
      validateClientAccess();
      
      // Additional file validations
      if (!file) {
        showError('No file selected.');
        return;
      }
      
      if (file.size === 0) {
        showError('The selected file is empty.');
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        showError('File is too large. Please select a file smaller than 50MB.');
        return;
      }
      
      // Validate file type
      if (!isValidFileType(file)) {
        showError('Please upload a valid Excel (.xlsx) or CSV file.');
        return;
      }

      setIsUploading(true);
      showInfo(`Uploading ${file.name} (${formatFileSize(file.size)})...`);

      // Upload file to parse API with timeout
      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      let uploadResponse: Response;
      try {
        uploadResponse = await fetch('/api/stores/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Upload timeout - please try with a smaller file or check your connection.');
        }
        throw fetchError;
      }

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorMessage = `Upload failed (${uploadResponse.status})`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }
        
        throw new Error(errorMessage);
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Store preview data and show modal
      setPreviewData({
        headers: uploadResult.data.headers,
        sampleRows: uploadResult.data.sampleRows,
        suggestedMapping: uploadResult.data.suggestedMapping,
        totalRows: uploadResult.data.totalRows,
        uploadId: uploadResult.data.uploadId, // Store uploadId to reference full dataset
        filename: uploadResult.data.filename || file.name
      });
      setShowPreview(true);

      showSuccess(`File uploaded successfully! Found ${uploadResult.data.totalRows} rows.`);
      
      // Show performance metrics if available
      if (uploadResult.data.metrics) {
        setPerformanceMetrics(uploadResult.data.metrics);
        setShowPerformanceDashboard(true);
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Provide user-friendly error messages for common issues
      if (errorMessage.includes('timeout')) {
        errorMessage = 'Upload timeout - please try with a smaller file or check your connection.';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'Network error - please check your connection and try again.';
      } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
        errorMessage = 'File is too large. Please try with a smaller file.';
      } else if (errorMessage.includes('403') || errorMessage.includes('disabled')) {
        errorMessage = 'Upload feature is currently disabled. Please contact your administrator.';
      }
      
      showError(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isUploading, onUploadSuccess, showSuccess, showError, showInfo]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleButtonClick = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async (mapping: Record<string, string>, country: string) => {
    console.log('🚀 handleImport called with:', { mapping, country, hasPreviewData: !!previewData });
    
    if (!previewData) {
      console.error('❌ No preview data available for import');
      return;
    }

    console.log('📊 Preview data:', {
      uploadId: previewData.uploadId,
      totalRows: previewData.totalRows,
      sampleRowCount: previewData.sampleRows.length,
      filename: previewData.filename
    });

    try {
      showInfo('Starting import and geocoding process...');
      console.log('✅ Starting import process...');

      // Call the ingest API with timeout (30 minutes for large uploads)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30 minute timeout for import

      let ingestResponse: Response;
      try {
        ingestResponse = await fetch('/api/stores/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mapping,
            uploadId: previewData.uploadId, // Send uploadId to process all rows
            country
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Import timeout - the process is taking too long. Please try with fewer rows.');
        }
        throw fetchError;
      }

      if (!ingestResponse.ok) {
        const errorText = await ingestResponse.text();
        let errorMessage = `Import failed (${ingestResponse.status})`;
        
        console.error('❌ Server returned error status:', ingestResponse.status);
        console.error('❌ Response headers:', Object.fromEntries(ingestResponse.headers.entries()));
        
        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ Server error response (JSON):', errorData);
          errorMessage = errorData.error || errorMessage;
          
          // If there's a detailed error structure, log it
          if (errorData.details) {
            console.error('❌ Error details:', errorData.details);
          }
        } catch (parseError) {
          console.error('❌ Server error (raw text):', errorText);
          console.error('❌ Failed to parse error as JSON:', parseError);
          // Use default error message if JSON parsing fails
        }
        
        throw new Error(errorMessage);
      }

      const ingestResult = await ingestResponse.json();
      console.log('✅ Ingest result received:', {
        success: ingestResult.success,
        hasData: !!ingestResult.data,
        data: ingestResult.data
      });

      if (!ingestResult.success) {
        console.error('❌ Ingest result indicates failure');
        throw new Error(ingestResult.error || 'Import failed');
      }

      console.log('✅ Import successful, closing modal and triggering callbacks');
      
      // Close modal and trigger success callback
      setShowPreview(false);
      setPreviewData(null);
      
      console.log('✅ Calling onUploadSuccess with:', ingestResult.data);
      onUploadSuccess(ingestResult.data);
      
      console.log('✅ Calling onRefreshData');
      onRefreshData();
      
      // Show performance metrics if available
      if (ingestResult.data.metrics) {
        setPerformanceMetrics(ingestResult.data.metrics);
        setShowPerformanceDashboard(true);
      }
      
      // Emit event to notify other components (like map)
      emitStoresImported(ingestResult.data);

    } catch (error) {
      console.error('❌ Import error in UploadStoreData:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      console.error('❌ Request details:', {
        mapping,
        country,
        uploadId: previewData.uploadId,
        totalRows: previewData.totalRows,
        sampleRowCount: previewData.sampleRows.length,
        firstRow: previewData.sampleRows[0]
      });
      
      // Show error immediately here as well
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      showError(errorMessage);
      
      throw error; // Re-throw to be handled by PreviewModal
    }
  }, [previewData, onUploadSuccess, onRefreshData, showInfo]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewData(null);
  }, []);

  const handleClosePerformanceDashboard = useCallback(() => {
    setShowPerformanceDashboard(false);
    setPerformanceMetrics(null);
  }, []);

  // Check if upload feature is enabled
  const isUploadEnabled = process.env.NEXT_PUBLIC_ALLOW_UPLOAD === 'true';

  // Don't render if feature is disabled
  if (!isUploadEnabled) {
    return null;
  }

  return (
    <div className="upload-store-data">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.csv"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={isUploading}
      />

      {/* Upload button */}
      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className="s-btn s-btn--primary"
        title="Upload store data from Excel or CSV file"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        {isUploading ? 'Uploading...' : 'Upload Store Data'}
      </button>

      {/* Drag and drop area (optional enhancement) */}
      <div
        className={`drag-drop-area ${dragActive ? 'active' : ''} ${isUploading ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ display: 'none' }} // Hidden by default, can be shown with CSS
      >
        <div className="drag-drop-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          <p>Drop your Excel or CSV file here</p>
          <p className="file-types">Supports .xlsx and .csv files</p>
        </div>
      </div>

      {/* Preview Modal */}
      {previewData && (
        <PreviewModal
          isOpen={showPreview}
          detectedHeaders={previewData.headers}
          sampleRows={previewData.sampleRows}
          suggestedMapping={previewData.suggestedMapping}
          totalRows={previewData.totalRows}
          filename={previewData.filename}
          onClose={handleClosePreview}
          onImport={handleImport}
        />
      )}

      {/* Performance Dashboard */}
      <PerformanceDashboard
        metrics={performanceMetrics}
        isVisible={showPerformanceDashboard}
        onClose={handleClosePerformanceDashboard}
      />

      <style jsx>{`
        .upload-store-data {
          position: relative;
        }

        .drag-drop-area {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 2px dashed var(--s-border);
          border-radius: 8px;
          background: var(--s-bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .drag-drop-area.active {
          opacity: 1;
          pointer-events: all;
          border-color: var(--s-primary);
          background: var(--s-primary-light, rgba(0, 123, 255, 0.1));
        }

        .drag-drop-area.disabled {
          opacity: 0.5;
          pointer-events: none;
        }

        .drag-drop-content {
          text-align: center;
          color: var(--s-muted);
        }

        .drag-drop-content svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .drag-drop-content p {
          margin: 8px 0;
          font-size: 16px;
          font-weight: 500;
        }

        .file-types {
          font-size: 14px !important;
          font-weight: normal !important;
          opacity: 0.7;
        }

        /* Show drag area on drag events */
        .upload-store-data:global(.drag-active) .drag-drop-area {
          display: flex !important;
        }

        @media (max-width: 768px) {
          .upload-button {
            padding: 6px 12px;
            font-size: 13px;
          }

          .upload-button svg {
            width: 14px;
            height: 14px;
          }
        }
      `}</style>
    </div>
  );
}