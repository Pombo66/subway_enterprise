import { NextRequest, NextResponse } from 'next/server';
import { FileParserService } from '../../../../lib/services/file-parser';
import { validateServerAccess, getUploadConfig } from '../../../../lib/config/upload-config';
import { ErrorResponseBuilder, FileParsingError, UploadError, ERROR_CODES } from '../../../../lib/errors/upload-errors';
import { UPLOAD_CONSTANTS } from '../../../../lib/upload/index';
import { startUploadTracking, trackPhase, endUploadTracking, uploadMetrics } from '../../../../lib/monitoring/upload-metrics';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let uploadId: string | undefined;
  
  try {
    // Generate upload ID for tracking
    uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    console.log(`🚀 Starting upload process [${uploadId}]`);
    
    // Start performance tracking
    startUploadTracking(uploadId, 'unknown', 0);
    
    // Validate feature flags
    validateServerAccess();
    
    const config = getUploadConfig();
    const fileParser = new FileParserService();
    
    // Parse multipart form data with timeout
    const formDataPromise = request.formData();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 30000)
    );
    
    const formData = await Promise.race([formDataPromise, timeoutPromise]) as FormData;
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new UploadError('No file provided', ERROR_CODES.INVALID_FILE_TYPE);
    }
    
    console.log(`📁 Processing file [${uploadId}]: ${file.name} (${file.size} bytes)`);
    
    // Update tracking with file info
    startUploadTracking(uploadId, file.name, file.size);
    
    // Additional file validation
    if (file.size === 0) {
      throw new UploadError('File is empty', ERROR_CODES.FILE_CORRUPTED);
    }
    
    if (!file.name || file.name.trim() === '') {
      throw new UploadError('File name is missing', ERROR_CODES.INVALID_FILE_TYPE);
    }
    
    // Validate file
    fileParser.validateFile(file, config.maxFileSizeMB);
    
    // Convert file to buffer with error handling
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      
      if (buffer.length === 0) {
        throw new UploadError('File buffer is empty', ERROR_CODES.FILE_CORRUPTED);
      }
    } catch (error) {
      throw new FileParsingError(
        'Failed to read file contents',
        { originalError: error, fileName: file.name }
      );
    }
    
    // Parse file based on type with performance tracking
    const parseResult = await trackPhase(uploadId, 'parse', async () => {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        return await fileParser.parseCSV(buffer);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return await fileParser.parseExcel(buffer);
      } else {
        throw new FileParsingError('Unsupported file format', ERROR_CODES.INVALID_FILE_TYPE);
      }
    });
    
    // Validate row count
    if (parseResult.totalRows > config.maxRowsPerUpload) {
      throw new UploadError(
        `File contains ${parseResult.totalRows} rows, which exceeds the maximum limit of ${config.maxRowsPerUpload} rows`,
        ERROR_CODES.TOO_MANY_ROWS
      );
    }
    
    // Get sample rows for preview
    const sampleRows = fileParser.getSampleRows(parseResult.rows, UPLOAD_CONSTANTS.MAX_PREVIEW_ROWS);
    
    // Suggest column mapping
    const suggestedMapping = fileParser.suggestMapping(parseResult.headers);
    
    // Format sample rows with metadata
    const formattedSampleRows = sampleRows.map((row, index) => ({
      index,
      data: parseResult.headers.reduce((obj, header, headerIndex) => {
        obj[header] = row[headerIndex] || '';
        return obj;
      }, {} as Record<string, any>),
      validationStatus: 'valid' as const, // Will be validated in the ingest step
      validationErrors: [],
      isDuplicate: false
    }));
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Upload completed successfully [${uploadId}] in ${processingTime}ms`);
    
    // End performance tracking
    const metrics = endUploadTracking(uploadId, parseResult.totalRows);
    
    // Store all rows in memory for the import step (temporary solution)
    // In production, you'd want to store this in Redis or a temp file
    (global as any).uploadCache = (global as any).uploadCache || {};
    (global as any).uploadCache[uploadId] = {
      headers: parseResult.headers,
      rows: parseResult.rows,
      timestamp: Date.now()
    };
    
    // Clean up old uploads (older than 1 hour)
    Object.keys((global as any).uploadCache).forEach((key: string) => {
      if (Date.now() - (global as any).uploadCache[key].timestamp > 3600000) {
        delete (global as any).uploadCache[key];
      }
    });
    
    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        headers: parseResult.headers,
        sampleRows: formattedSampleRows,
        suggestedMapping,
        totalRows: parseResult.totalRows,
        uploadId, // Important: frontend will use this to reference the full dataset
        processingTime,
        metrics: metrics ? uploadMetrics.analyzePerformance(metrics) : undefined
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Upload failed [${uploadId}] after ${processingTime}ms:`, error);
    
    // Record error in metrics
    if (uploadId) {
      uploadMetrics.recordError(uploadId, 'upload', error as Error);
    }
    
    // Handle timeout errors
    if (error instanceof Error && error.message === 'Request timeout') {
      const errorResponse = ErrorResponseBuilder.buildErrorResponse(
        new UploadError('Request timeout - file too large or connection too slow', ERROR_CODES.FILE_TOO_LARGE)
      );
      return NextResponse.json(errorResponse, { status: 408 });
    }
    
    // Handle different error types
    if (error instanceof UploadError || error instanceof FileParsingError) {
      const errorResponse = ErrorResponseBuilder.buildErrorResponse(error);
      let statusCode = 400;
      
      // Map specific error codes to HTTP status codes
      switch (error.code) {
        case ERROR_CODES.FILE_TOO_LARGE:
          statusCode = 413;
          break;
        case ERROR_CODES.UPLOAD_DISABLED:
        case ERROR_CODES.INSUFFICIENT_PERMISSIONS:
          statusCode = 403;
          break;
        case ERROR_CODES.TOO_MANY_ROWS:
          statusCode = 422;
          break;
        default:
          statusCode = 400;
      }
      
      return NextResponse.json(errorResponse, { status: statusCode });
    }
    
    // Handle unexpected errors
    const errorResponse = ErrorResponseBuilder.buildErrorResponse(
      new UploadError(
        'An unexpected error occurred while processing the file',
        ERROR_CODES.INTERNAL_SERVER_ERROR
      )
    );
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}