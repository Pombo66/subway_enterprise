// Batch processing system for Smart Store Importer v1
import { 
  GeocodeResult, 
  GeocodeErrorDetails, 
  GeocodeProvider as GeocodeProviderType,
  ImportRow,
  GeocodeProgress,
  GeocodeError
} from './types';
import { geocodeProviderManager } from './providers';
import { ExponentialBackoff, ErrorAggregator, ErrorHandler } from './errors';
import smartImportConfig from './config';

/**
 * Batch processor for geocoding operations
 */
export class BatchGeocodeProcessor {
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly concurrencyLimit: number;
  private abortController: AbortController | null = null;

  constructor(
    batchSize?: number,
    maxRetries?: number,
    concurrencyLimit: number = 3
  ) {
    this.batchSize = batchSize || smartImportConfig.geocoding.batchSize;
    this.maxRetries = maxRetries || smartImportConfig.geocoding.maxRetries;
    this.concurrencyLimit = concurrencyLimit;
  }

  /**
   * Process multiple rows with geocoding
   */
  async processRows(
    rows: ImportRow[],
    preferredProvider?: GeocodeProviderType,
    onProgress?: (progress: GeocodeProgress) => void,
    onBatchComplete?: (batchIndex: number, results: Array<GeocodeResult | GeocodeErrorDetails>) => void
  ): Promise<{
    results: Array<{ row: ImportRow; result: GeocodeResult | GeocodeErrorDetails }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      skipped: number;
    };
  }> {
    // Create abort controller for cancellation
    this.abortController = new AbortController();
    
    // Filter rows that need geocoding
    const rowsToGeocode = rows.filter(row => 
      !row.latitude || !row.longitude || 
      isNaN(row.latitude) || isNaN(row.longitude)
    );

    const skippedCount = rows.length - rowsToGeocode.length;
    
    // Initialize progress
    const progress: GeocodeProgress = {
      total: rowsToGeocode.length,
      completed: 0,
      failed: 0,
      inProgress: true,
      errors: [],
      currentBatch: 0,
      totalBatches: Math.ceil(rowsToGeocode.length / this.batchSize)
    };

    // Report initial progress
    if (onProgress) {
      onProgress({ ...progress });
    }

    // Split into batches
    const batches = this.createBatches(rowsToGeocode);
    const allResults: Array<{ row: ImportRow; result: GeocodeResult | GeocodeErrorDetails }> = [];
    
    try {
      // Process batches with limited concurrency
      for (let i = 0; i < batches.length; i++) {
        // Check for cancellation
        if (this.abortController.signal.aborted) {
          break;
        }

        const batch = batches[i];
        progress.currentBatch = i + 1;

        // Process batch
        const batchResults = await this.processBatch(
          batch,
          preferredProvider,
          i + 1,
          batches.length
        );

        // Update results
        allResults.push(...batchResults);

        // Update progress
        progress.completed += batchResults.filter(r => 'lat' in r.result).length;
        progress.failed += batchResults.filter(r => 'error' in r.result).length;
        
        // Collect errors
        for (const { row, result } of batchResults) {
          if ('error' in result) {
            progress.errors.push({
              rowId: row.id,
              address: this.buildAddressString(row),
              reason: result.error,
              retryable: result.retryable || false,
              provider: result.provider
            });
          }
        }

        // Report progress
        if (onProgress) {
          onProgress({ ...progress });
        }

        // Report batch completion
        if (onBatchComplete) {
          onBatchComplete(i + 1, batchResults.map(r => r.result));
        }

        // Add delay between batches to respect rate limits
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Add skipped rows to results
      const skippedRows = rows.filter(row => 
        row.latitude && row.longitude && 
        !isNaN(row.latitude) && !isNaN(row.longitude)
      );

      for (const row of skippedRows) {
        allResults.push({
          row,
          result: {
            lat: row.latitude!,
            lng: row.longitude!,
            precision: 'existing',
            provider: 'none' as any
          }
        });
      }

    } catch (error: any) {
      ErrorHandler.logError(error, { context: 'BatchGeocodeProcessor.processRows' });
      throw error;
    } finally {
      progress.inProgress = false;
      if (onProgress) {
        onProgress({ ...progress });
      }
    }

    return {
      results: allResults,
      summary: {
        total: rows.length,
        successful: allResults.filter(r => 'lat' in r.result).length,
        failed: progress.failed,
        skipped: skippedCount
      }
    };
  }

  /**
   * Process a single batch of rows
   */
  private async processBatch(
    rows: ImportRow[],
    preferredProvider?: GeocodeProviderType,
    batchIndex?: number,
    totalBatches?: number
  ): Promise<Array<{ row: ImportRow; result: GeocodeResult | GeocodeErrorDetails }>> {
    const results: Array<{ row: ImportRow; result: GeocodeResult | GeocodeErrorDetails }> = [];
    const errorAggregator = new ErrorAggregator();

    // Process rows with limited concurrency
    const semaphore = new Semaphore(this.concurrencyLimit);
    
    const promises = rows.map(async (row) => {
      await semaphore.acquire();
      
      try {
        const result = await this.processRowWithRetry(row, preferredProvider);
        results.push({ row, result });
      } catch (error: any) {
        errorAggregator.add(error, { rowId: row.id });
        results.push({
          row,
          result: {
            error: `Processing failed: ${error.message}`,
            retryable: ErrorHandler.isRetryable(error)
          }
        });
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);

    // Log batch completion
    if (process.env.NODE_ENV === 'development') {
      console.log(`Batch ${batchIndex}/${totalBatches} completed: ${results.length} rows processed`);
    }

    return results;
  }

  /**
   * Process a single row with retry logic
   */
  private async processRowWithRetry(
    row: ImportRow,
    preferredProvider?: GeocodeProviderType
  ): Promise<GeocodeResult | GeocodeErrorDetails> {
    const address = this.buildAddressString(row);
    
    if (!address.trim()) {
      return {
        error: 'Insufficient address information',
        retryable: false
      };
    }

    const backoff = new ExponentialBackoff(this.maxRetries);
    let lastResult: GeocodeErrorDetails | null = null;

    do {
      try {
        // Check for cancellation
        if (this.abortController?.signal.aborted) {
          return {
            error: 'Operation cancelled',
            retryable: false
          };
        }

        const result = await geocodeProviderManager.geocode(address, preferredProvider);
        
        // If successful, return result
        if ('lat' in result) {
          return result;
        }

        // If not retryable, return error immediately
        if (!result.retryable) {
          return result;
        }

        // Store retryable error
        lastResult = result;

        // Wait before retry
        if (backoff.shouldRetry()) {
          await backoff.wait();
        }

      } catch (error: any) {
        ErrorHandler.logError(error, { 
          context: 'processRowWithRetry', 
          rowId: row.id,
          address,
          attempt: backoff.getCurrentAttempt() + 1
        });

        lastResult = {
          error: `Geocoding failed: ${error.message}`,
          retryable: ErrorHandler.isRetryable(error)
        };

        if (lastResult.retryable && backoff.shouldRetry()) {
          await backoff.wait();
        } else {
          break;
        }
      }
    } while (backoff.shouldRetry());

    return lastResult || {
      error: 'Geocoding failed after retries',
      retryable: false
    };
  }

  /**
   * Build address string from row data
   */
  private buildAddressString(row: ImportRow): string {
    const parts = [
      row.address,
      row.city,
      row.postcode,
      row.country
    ].filter(part => part && part.trim());

    return parts.join(', ');
  }

  /**
   * Create batches from rows
   */
  private createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    
    return batches;
  }

  /**
   * Cancel ongoing processing
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Check if processing is cancelled
   */
  isCancelled(): boolean {
    return this.abortController?.signal.aborted || false;
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }

  getAvailablePermits(): number {
    return this.permits;
  }

  getQueueLength(): number {
    return this.waitQueue.length;
  }
}

/**
 * Utility functions for batch processing
 */
export class BatchProcessingUtils {
  /**
   * Estimate processing time based on row count and rate limits
   */
  static estimateProcessingTime(
    rowCount: number,
    batchSize: number = smartImportConfig.geocoding.batchSize,
    rateLimit: number = smartImportConfig.geocoding.rateLimit
  ): {
    estimatedMinutes: number;
    estimatedSeconds: number;
    batchCount: number;
  } {
    const batchCount = Math.ceil(rowCount / batchSize);
    const requestsPerSecond = rateLimit;
    const totalSeconds = Math.ceil(rowCount / requestsPerSecond);
    
    return {
      estimatedMinutes: Math.floor(totalSeconds / 60),
      estimatedSeconds: totalSeconds % 60,
      batchCount
    };
  }

  /**
   * Calculate optimal batch size based on rate limits and row count
   */
  static calculateOptimalBatchSize(
    rowCount: number,
    rateLimit: number,
    maxBatchSize: number = 50
  ): number {
    // For small datasets, use smaller batches
    if (rowCount <= 20) return Math.min(5, rowCount);
    
    // For medium datasets, balance between progress updates and efficiency
    if (rowCount <= 100) return Math.min(10, maxBatchSize);
    
    // For large datasets, use larger batches but respect rate limits
    const optimalSize = Math.min(
      Math.ceil(rateLimit * 2), // 2 seconds worth of requests
      maxBatchSize,
      Math.ceil(rowCount / 10) // At most 10 batches
    );
    
    return Math.max(optimalSize, 5); // Minimum batch size of 5
  }

  /**
   * Validate rows before processing
   */
  static validateRowsForGeocoding(rows: ImportRow[]): {
    valid: ImportRow[];
    invalid: Array<{ row: ImportRow; reason: string }>;
  } {
    const valid: ImportRow[] = [];
    const invalid: Array<{ row: ImportRow; reason: string }> = [];

    for (const row of rows) {
      // Skip rows that already have coordinates
      if (row.latitude && row.longitude && 
          !isNaN(row.latitude) && !isNaN(row.longitude)) {
        valid.push(row);
        continue;
      }

      // Check if row has sufficient address information
      const hasAddress = row.address && row.address.trim();
      const hasCity = row.city && row.city.trim();
      const hasCountry = row.country && row.country.trim();

      if (!hasCountry) {
        invalid.push({ row, reason: 'Missing country information' });
        continue;
      }

      if (!hasAddress && !hasCity) {
        invalid.push({ row, reason: 'Missing both address and city information' });
        continue;
      }

      valid.push(row);
    }

    return { valid, invalid };
  }
}

// Export default processor instance
export const batchGeocodeProcessor = new BatchGeocodeProcessor();