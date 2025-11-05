import { NextResponse } from 'next/server';

// In API routes, NEXT_PUBLIC_ variables are available at build time
// For runtime, we need to use a server-side env var or default
const BFF_BASE_URL = process.env.BFF_BASE_URL || process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Pagination parameters (for future use, not sent to BFF yet)
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100');
        
        // Field selection (optional, for future use)
        const fields = searchParams.get('fields')?.split(',');
        
        // Build query parameters for BFF (only filters, no pagination yet)
        const params = new URLSearchParams();
        if (searchParams.get('region')) {
            params.append('region', searchParams.get('region')!);
        }
        if (searchParams.get('country')) {
            params.append('country', searchParams.get('country')!);
        }
        
        // Note: BFF doesn't support pagination yet, so we don't send page/limit
        
        const queryString = params.toString();
        const bffUrl = `${BFF_BASE_URL}/stores${queryString ? `?${queryString}` : ''}`;
        
        console.log('🔄 Proxying stores request to BFF:', bffUrl);
        
        // Fetch from BFF
        const response = await fetch(bffUrl, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
        }
        
        const bffData = await response.json();
        
        // BFF returns {success: true, data: [...]} format
        // Extract the data array for the frontend
        if (bffData.success && Array.isArray(bffData.data)) {
            const stores = bffData.data;
            const total = stores.length; // BFF doesn't provide total, use array length
            console.log('✅ Successfully fetched', stores.length, 'stores from BFF');
            
            // Log coordinate statistics
            const storesWithCoords = stores.filter((s: any) => 
                s.latitude !== null && 
                s.latitude !== undefined && 
                s.longitude !== null && 
                s.longitude !== undefined &&
                !isNaN(s.latitude) &&
                !isNaN(s.longitude)
            );
            console.log(`📊 Stores with valid coordinates: ${storesWithCoords.length}/${stores.length}`);
            
            if (storesWithCoords.length < stores.length) {
                const storesWithoutCoords = stores.filter((s: any) => 
                    s.latitude === null || 
                    s.latitude === undefined || 
                    s.longitude === null || 
                    s.longitude === undefined ||
                    isNaN(s.latitude) ||
                    isNaN(s.longitude)
                );
                console.log(`⚠️ Stores without coordinates: ${storesWithoutCoords.length}`, 
                    storesWithoutCoords.slice(0, 5).map((s: any) => ({ name: s.name, lat: s.latitude, lng: s.longitude }))
                );
            }
            
            // Log sample stores
            if (stores.length > 0) {
                console.log(`📊 Sample stores:`, stores.slice(0, 3).map((s: any) => ({
                    name: s.name,
                    city: s.city,
                    country: s.country,
                    status: s.status,
                    lat: s.latitude,
                    lng: s.longitude
                })));
            }
            
            // Backward compatibility: Return just stores array if no pagination requested
            const requestedPagination = searchParams.has('page') || searchParams.has('limit');
            
            if (!requestedPagination) {
                // Original format for backward compatibility
                return NextResponse.json(stores);
            }
            
            // Client-side pagination (since BFF returns all stores)
            const skip = (page - 1) * limit;
            const paginatedStores = stores.slice(skip, skip + limit);
            const totalPages = Math.ceil(stores.length / limit);
            const hasMore = page < totalPages;
            
            // Return with pagination metadata
            return NextResponse.json({
                stores: paginatedStores,
                pagination: {
                    page,
                    limit,
                    total: stores.length,
                    totalPages,
                    hasMore
                }
            });
        } else {
            throw new Error('Invalid BFF response format');
        }
        
    } catch (error) {
        console.error('❌ Error proxying to BFF:', error);
        
        // Return error response
        return NextResponse.json(
            { error: 'Failed to fetch stores from BFF' },
            { status: 500 }
        );
    }
}