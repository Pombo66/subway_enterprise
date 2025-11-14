import { NextRequest, NextResponse } from 'next/server';
import { validateServerAccess, getUploadConfig } from '../../../../lib/config/upload-config';
import { ErrorResponseBuilder, DatabaseError, ValidationError, ERROR_CODES } from '../../../../lib/errors/upload-errors';
import { ValidationService } from '../../../../lib/services/validation';
import { GeocodingService } from '../../../../lib/services/geocoding';
import { IngestRequestSchema, GeocodeRequest } from '../../../../lib/validation/store-upload';
import { ImportSummary, NormalizedStore } from '../../../../lib/types/store-upload';
import { startUploadTracking, trackPhase, endUploadTracking, uploadMetrics } from '../../../../lib/monitoring/upload-metrics';
import { emitStoresImported } from '../../../../lib/events/store-events';
import { invalidateStoreCache } from '../../../../lib/events/cache-events';
import prisma from '../../../../lib/db';
import crypto from 'crypto';

const DEBUG_LOGGING = process.env.DEBUG_INGEST_LOGGING === 'true';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let ingestId: string | undefined;

  try {
    // Generate ingest ID for tracking
    ingestId = `ingest-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    console.log(`🔄 Starting ingest process [${ingestId}]`);

    // Start performance tracking
    startUploadTracking(ingestId, 'ingest-data', 0);

    // Validate feature flags
    validateServerAccess();

    const config = getUploadConfig();
    const validationService = new ValidationService();
    const geocodingService = new GeocodingService();

    // Parse and validate request body
    const body = await request.json();
    const { mapping, uploadId, country: inferredCountry } = body;

    // Retrieve all rows from upload cache
    const uploadCache = (global as any).uploadCache || {};
    const uploadData = uploadCache[uploadId];

    if (!uploadData) {
      throw new ValidationError(
        'Upload session expired or not found. Please upload the file again.'
      );
    }

    // Convert array rows to objects with column names
    const headers = uploadData.headers;
    const rows = uploadData.rows.map((row: any[]) => {
      const rowObj: Record<string, any> = {};
      headers.forEach((header: string, index: number) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    });

    if (DEBUG_LOGGING) {
      console.log(`📊 [${ingestId}] Converted ${rows.length} array rows to objects`);
      console.log(`📊 [${ingestId}] Headers:`, headers);
      console.log(`📊 [${ingestId}] First row sample:`, rows[0]);
    }

    // Validate row count
    if (rows.length > config.maxRowsPerUpload) {
      throw new ValidationError(
        `Too many rows: ${rows.length}. Maximum allowed: ${config.maxRowsPerUpload}`
      );
    }

    console.log(`📊 [${ingestId}] Retrieved ${rows.length} rows from upload cache`);
    if (DEBUG_LOGGING) {
      console.log(`📊 [${ingestId}] Column mapping:`, JSON.stringify(mapping, null, 2));
      console.log(`📊 [${ingestId}] Inferred country: ${inferredCountry}`);
    }

    // Step 1: Validate and normalize all rows with performance tracking
    if (DEBUG_LOGGING) {
      console.log(`🔍 Starting validation with inferred country: ${inferredCountry}`);
      console.log(`🔍 Mapping:`, mapping);
      console.log(`🔍 First row sample:`, rows[0]);
    }

    const { validationResults, normalizedStores } = await trackPhase(ingestId, 'validate', async () => {
      const validationResults = validationService.validateBatch(rows, mapping, inferredCountry);
      const normalizedStores = validationService.normalizeBatch(rows, mapping, inferredCountry);
      return { validationResults, normalizedStores };
    }, rows.length);

    // Filter out invalid rows
    const validStores: NormalizedStore[] = [];
    const invalidCount = validationResults.filter((result, index) => {
      if (result.isValid) {
        validStores.push(normalizedStores[index]);
        return false;
      }
      console.warn(`❌ Invalid row ${index + 1}:`, result.errors);
      console.warn(`   Raw data:`, rows[index]);
      console.warn(`   Normalized:`, normalizedStores[index]);
      return true;
    }).length;

    if (validStores.length === 0) {
      // Log detailed error information
      console.error('❌ ALL ROWS FAILED VALIDATION');
      console.error('Total rows:', rows.length);
      console.error('Column mapping:', mapping);
      console.error('Inferred country:', inferredCountry);
      console.error('First 3 rows sample:', rows.slice(0, 3));
      console.error('Validation results:', validationResults.map((r, i) => ({
        row: i + 1,
        isValid: r.isValid,
        errors: r.errors,
        warnings: r.warnings
      })));

      // Provide more detailed error message
      const firstError = validationResults[0]?.errors[0] || 'Unknown';
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const errorMessage = `No valid rows found in the uploaded data. ${errorCount} row(s) failed validation. First error: ${firstError}`;

      throw new ValidationError(errorMessage);
    }

    // Step 1: Log validation summary (in debug mode only)
    if (DEBUG_LOGGING) {
      console.log(`✅ [${ingestId}] Validation complete: ${validStores.length} valid, ${invalidCount} invalid`);
      if (validStores.length > 0) {
        const sample = validStores[0];
        console.log(`📊 [${ingestId}] Sample valid store:`, {
          name: sample.name,
          address: sample.address,
          city: sample.city,
          postcode: sample.postcode,
          country: sample.country,
          hasCoordinates: Boolean(sample.latitude && sample.longitude),
        });
      } else {
        console.log(`📊 [${ingestId}] No valid stores found`);
      }
    }

    // Step 2: Detect duplicates
    const duplicates = validationService.detectDuplicates(validStores);
    if (DEBUG_LOGGING) {
      console.log(`🔍 [${ingestId}] Found ${duplicates.length} potential duplicates`);
    }

    // Step 3: Geocode addresses that need it
    const geocodeRequests: GeocodeRequest[] = [];
    const storeGeocodingMap = new Map<number, number>(); // store index -> geocode request index

    validStores.forEach((store, index) => {
      if (!store.latitude || !store.longitude) {
        const geocodeIndex = geocodeRequests.length;
        const request = {
          address: store.address,
          city: store.city,
          postcode: store.postcode,
          country: store.country
        };
        geocodeRequests.push(request);
        storeGeocodingMap.set(index, geocodeIndex);
        if (DEBUG_LOGGING) {
          console.log(`🌍 [${ingestId}] Queuing geocode for "${store.name}":`, request);
        }
      } else if (DEBUG_LOGGING) {
        console.log(`✓ [${ingestId}] Store "${store.name}" already has coordinates: (${store.latitude}, ${store.longitude})`);
      }
    });

    let geocodeResults: any[] = [];
    let pendingGeocodeCount = 0;

    if (geocodeRequests.length > 0) {
      console.log(`🌍 [${ingestId}] Starting geocoding for ${geocodeRequests.length} addresses`);
      geocodeResults = await trackPhase(ingestId, 'geocode', async () => {
        return await geocodingService.batchGeocode(geocodeRequests);
      }, geocodeRequests.length);

      if (DEBUG_LOGGING) {
        console.log(`📊 [${ingestId}] Geocoding results received: ${geocodeResults.length} results`);
      }

      // Apply geocoding results back to stores
      validStores.forEach((store, index) => {
        const geocodeIndex = storeGeocodingMap.get(index);
        if (geocodeIndex !== undefined) {
          const result = geocodeResults[geocodeIndex];
          if (result.status === 'success') {
            store.latitude = result.latitude;
            store.longitude = result.longitude;
            geocodedCount++;
            // Reduced logging to avoid rate limits - only log every 50th success
            if (DEBUG_LOGGING && geocodedCount % 50 === 0) {
              console.log(`✅ [${ingestId}] Geocoded ${geocodedCount} stores (latest: "${store.name}" via ${result.provider || 'unknown'})`);
            }
          } else {
            pendingGeocodeCount++;
            console.warn(`⚠️ [${ingestId}] Failed to geocode "${store.name}"`);
            console.warn(`   Address: ${store.address}, ${store.city}, ${store.postcode}, ${store.country}`);
            console.warn(`   Error: ${result.error || 'Unknown error'}`);
            console.warn(`   Provider: ${result.provider || 'unknown'}`);
          }
        }
      });

      const successCount = geocodeResults.filter(r => r.status === 'success').length;
      console.log(`✅ [${ingestId}] Geocoding summary: ${successCount}/${geocodeRequests.length} successful, ${pendingGeocodeCount} failed`);
    } else {
      console.log(`✓ [${ingestId}] No geocoding needed - all stores have coordinates`);
    }

    // Step 4: Database operations with performance tracking
    // Note: Stores are saved even if geocoding fails - they will have null coordinates
    // and can be geocoded later or manually updated
    const summary: ImportSummary = {
      inserted: 0,
      updated: 0,
      pendingGeocode: pendingGeocodeCount,
      failed: invalidCount
    };

    if (pendingGeocodeCount > 0) {
      console.log(`📝 [${ingestId}] ${pendingGeocodeCount} stores will be saved without coordinates (pending geocode)`);
    }

    // Use batched operations for better performance
    await trackPhase(ingestId, 'upsert', async () => {
      // Process in batches of 50 to avoid overwhelming the database
      const BATCH_SIZE = 50;
      for (let i = 0; i < validStores.length; i += BATCH_SIZE) {
        const batch = validStores.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx) => {
          for (const store of batch) {
            try {
              // Check if store exists
              const existingStore = await tx.store.findFirst({
                where: {
                  name: store.name,
                  city: store.city,
                  country: store.country
                }
              });

            // Validate coordinates before saving
            const hasValidCoordinates = validateCoordinates(store.latitude, store.longitude);

            if (!hasValidCoordinates && (store.latitude || store.longitude)) {
              console.warn(`⚠️ [${ingestId}] Invalid coordinates for "${store.name}": (${store.latitude}, ${store.longitude})`);
            }

            const storeData = {
              name: store.name,
              address: store.address,
              postcode: store.postcode,
              country: store.country,
              region: store.region,
              city: store.city,
              status: store.status,
              ownerName: store.ownerName,
              latitude: hasValidCoordinates ? store.latitude : null,
              longitude: hasValidCoordinates ? store.longitude : null
            };

            if (existingStore) {
              // Update existing store
              const updated = await tx.store.update({
                where: { id: existingStore.id },
                data: {
                  ...storeData,
                  updatedAt: new Date()
                }
              });
              summary.updated++;
              if (DEBUG_LOGGING) {
                console.log(`📝 [${ingestId}] Updated store "${store.name}" (ID: ${updated.id})`);
                console.log(`   Coordinates: (${updated.latitude}, ${updated.longitude})`);
              }
            } else {
              // Create new store
              const created = await tx.store.create({
                data: storeData
              });
              summary.inserted++;
              if (DEBUG_LOGGING) {
                console.log(`➕ [${ingestId}] Created store "${store.name}" (ID: ${created.id})`);
                console.log(`   Coordinates: (${created.latitude}, ${created.longitude})`);
              }
            }

          } catch (error) {
            console.error(`❌ Failed to process store "${store.name}":`, error);
            console.error(`❌ Error details:`, {
              message: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
              meta: (error as any)?.meta,
              storeData: {
                name: store.name,
                country: store.country,
                region: store.region,
                city: store.city,
                status: store.status,
                latitude: store.latitude,
                longitude: store.longitude
              }
            });
            summary.failed++;
          }
        }
      });
      }
    }, validStores.length);

    // Verify saved stores have coordinates (outside transaction)
    const savedStores = await prisma.store.findMany({
      where: {
        name: { in: validStores.map((s: NormalizedStore) => s.name) }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true
      }
    });

    console.log(`📊 [${ingestId}] Database verification: ${savedStores.length} stores found`);
    const storesWithCoords = savedStores.filter((s: any) => s.latitude !== null && s.longitude !== null);
    console.log(`📊 [${ingestId}] Stores with coordinates in DB: ${storesWithCoords.length}/${savedStores.length}`);

    if (storesWithCoords.length < savedStores.length) {
      const storesWithoutCoords = savedStores.filter((s: any) => s.latitude === null || s.longitude === null);
      console.warn(`⚠️ [${ingestId}] Stores missing coordinates in DB:`, storesWithoutCoords.map((s: any) => s.name));
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎉 [${ingestId}] Ingest completed in ${processingTime}ms`);

    const storesWithCoordsCount = validStores.filter(s => s.latitude && s.longitude).length;
    console.log(`📊 [${ingestId}] Final summary:`, {
      totalRows: rows.length,
      validRows: validStores.length,
      inserted: summary.inserted,
      updated: summary.updated,
      failed: summary.failed,
      pendingGeocode: summary.pendingGeocode,
      storesWithCoordinates: storesWithCoordsCount
    });

    if (summary.pendingGeocode > 0) {
      console.warn(`⚠️ [${ingestId}] ${summary.pendingGeocode} stores saved without coordinates - they will not appear on map until geocoded`);
      console.warn(`   These stores can be manually updated with coordinates or re-geocoded later`);
    }

    // Record geocoding and database stats
    if (geocodeResults.length > 0) {
      const successfulGeocode = geocodeResults.filter(r => r.status === 'success').length;
      const failedGeocode = geocodeResults.filter(r => r.status === 'failed').length;

      uploadMetrics.recordGeocodingStats(ingestId, {
        totalRequests: geocodeResults.length,
        successfulRequests: successfulGeocode,
        failedRequests: failedGeocode,
        providerUsage: geocodeResults.reduce((acc, result) => {
          if (result.provider) {
            acc[result.provider] = (acc[result.provider] || 0) + 1;
          }
          return acc;
        }, { mapbox: 0, google: 0, nominatim: 0 })
      });
    }

    uploadMetrics.recordDatabaseStats(ingestId, {
      totalOperations: summary.inserted + summary.updated,
      insertOperations: summary.inserted,
      updateOperations: summary.updated,
      averageQueryTime: processingTime / (summary.inserted + summary.updated) || 0
    });

    // End performance tracking
    const metrics = endUploadTracking(ingestId, validStores.length);

    // Clean up upload cache after successful import
    if (uploadId && (global as any).uploadCache) {
      delete (global as any).uploadCache[uploadId];
      console.log(`🧹 Cleaned up upload cache for ${uploadId}`);
    }

    // Emit stores-imported event to trigger map refresh
    console.log(`📢 [${ingestId}] Emitting stores-imported event to trigger map refresh`);
    
    // Invalidate store cache
    invalidateStoreCache('stores_imported');
    
    emitStoresImported({
      ingestId,
      summary: {
        inserted: summary.inserted,
        updated: summary.updated,
        pendingGeocode: summary.pendingGeocode,
        failed: summary.failed,
        storesWithCoordinates: storesWithCoordsCount
      },
      processingTime
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        ingestId,
        processingTime,
        metrics: metrics ? uploadMetrics.analyzePerformance(metrics) : undefined
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Ingest failed [${ingestId}] after ${processingTime}ms:`, error);

    // Record error in metrics
    if (ingestId) {
      uploadMetrics.recordError(ingestId, 'ingest', error as Error);
    }

    // Handle different error types
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      const errorResponse = ErrorResponseBuilder.buildErrorResponse(error);
      let statusCode = 400;

      if (error instanceof DatabaseError) {
        statusCode = 500;
      }

      return NextResponse.json(errorResponse, { status: statusCode });
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      let statusCode = 500;
      let errorMessage = `Database operation failed: ${prismaError.message}`;

      // Map specific Prisma error codes
      switch (prismaError.code) {
        case 'P2002':
          statusCode = 409;
          errorMessage = 'Duplicate entry - store already exists';
          break;
        case 'P2025':
          statusCode = 404;
          errorMessage = 'Record not found';
          break;
        case 'P1001':
          statusCode = 503;
          errorMessage = 'Database connection failed';
          break;
        default:
          statusCode = 500;
      }

      const errorResponse = ErrorResponseBuilder.buildErrorResponse(
        new DatabaseError(errorMessage, { code: prismaError.code })
      );
      return NextResponse.json(errorResponse, { status: statusCode });
    }

    // Handle unexpected errors
    const errorResponse = ErrorResponseBuilder.buildErrorResponse(
      new DatabaseError('An unexpected error occurred during data ingestion')
    );

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Validate coordinates are within valid ranges
 */
function validateCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Generate a unique key for store identification
 */
function generateStoreKey(store: NormalizedStore): string {
  const keyData = `${store.name}|${store.address}|${store.city}|${store.country}`;
  return crypto.createHash('md5').update(keyData.toLowerCase()).digest('hex');
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