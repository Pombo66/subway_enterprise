/**
 * Utility functions for calculating polygon areas and handling custom area drawing
 */

/**
 * Calculate the area of a GeoJSON polygon in square kilometers
 * Uses the spherical excess formula for accurate area calculation on Earth's surface
 */
export function calculatePolygonArea(polygon: GeoJSON.Polygon): number {
  if (!polygon || !polygon.coordinates || polygon.coordinates.length === 0) {
    return 0;
  }

  const coordinates = polygon.coordinates[0]; // Use outer ring
  if (coordinates.length < 4) {
    return 0; // Need at least 4 points to form a polygon (including closing point)
  }

  // Convert to radians and calculate area using spherical excess
  const EARTH_RADIUS_KM = 6371;
  let area = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const deltaLonRad = ((lon2 - lon1) * Math.PI) / 180;

    area += deltaLonRad * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
  }

  area = Math.abs(area * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2;
  return Math.round(area);
}

/**
 * Format area for display with appropriate units
 */
export function formatArea(area: number): string {
  if (area >= 1000000) {
    return `${(area / 1000000).toFixed(1)}M km²`;
  } else if (area >= 1000) {
    return `${(area / 1000).toFixed(0)}K km²`;
  } else {
    return `${area.toFixed(0)} km²`;
  }
}

/**
 * Generate a human-readable name for a custom area based on its centroid
 */
export function generateCustomAreaName(polygon: GeoJSON.Polygon): string {
  const coordinates = polygon.coordinates[0];
  if (coordinates.length === 0) {
    return 'Custom Area';
  }

  // Calculate centroid
  let latSum = 0;
  let lonSum = 0;
  const pointCount = coordinates.length - 1; // Exclude closing point

  for (let i = 0; i < pointCount; i++) {
    lonSum += coordinates[i][0];
    latSum += coordinates[i][1];
  }

  const centroidLat = latSum / pointCount;
  const centroidLon = lonSum / pointCount;

  // Generate name based on approximate location
  const latDirection = centroidLat >= 0 ? 'N' : 'S';
  const lonDirection = centroidLon >= 0 ? 'E' : 'W';
  
  return `Custom Area ${Math.abs(centroidLat).toFixed(1)}°${latDirection} ${Math.abs(centroidLon).toFixed(1)}°${lonDirection}`;
}

/**
 * Validate that a polygon is suitable for expansion analysis
 */
export function validateCustomArea(polygon: GeoJSON.Polygon): {
  isValid: boolean;
  error?: string;
} {
  if (!polygon || !polygon.coordinates || polygon.coordinates.length === 0) {
    return { isValid: false, error: 'Invalid polygon structure' };
  }

  const coordinates = polygon.coordinates[0];
  
  if (coordinates.length < 4) {
    return { isValid: false, error: 'Polygon must have at least 3 points' };
  }

  // Check if polygon is closed
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    return { isValid: false, error: 'Polygon must be closed' };
  }

  // Calculate area and check if it's reasonable
  const area = calculatePolygonArea(polygon);
  
  if (area < 1) {
    return { isValid: false, error: 'Area too small (minimum 1 km²)' };
  }

  if (area > 10000000) { // 10M km² (larger than USA)
    return { isValid: false, error: 'Area too large (maximum 10M km²)' };
  }

  return { isValid: true };
}

/**
 * Create MapboxDraw styles for custom area drawing with gold outline
 */
export const customAreaDrawStyles = [
  // Polygon fill
  {
    id: 'gl-draw-polygon-fill-inactive',
    type: 'fill' as const,
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': '#ffd700', // Gold
      'fill-opacity': 0.1
    }
  },
  {
    id: 'gl-draw-polygon-fill-active',
    type: 'fill' as const,
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'fill-color': '#ffd700', // Gold
      'fill-opacity': 0.15
    }
  },
  // Polygon outline
  {
    id: 'gl-draw-polygon-stroke-inactive',
    type: 'line' as const,
    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#ffd700', // Gold outline
      'line-width': 2
    }
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line' as const,
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#ffd700', // Gold outline
      'line-width': 3
    }
  },
  // Vertex points
  {
    id: 'gl-draw-polygon-and-line-vertex-halo-active',
    type: 'circle' as const,
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#FFF'
    }
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle' as const,
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 3,
      'circle-color': '#ffd700' // Gold
    }
  }
];

/**
 * Default MapboxDraw options for custom area drawing
 */
export const customAreaDrawOptions = {
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true
  },
  styles: customAreaDrawStyles
};