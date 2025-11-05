import { GridService } from '../GridService';
import { GeoJSON } from 'geojson';
import { H3Cell } from '../../../types/geospatial';

describe('GridService', () => {
  let gridService: GridService;

  beforeEach(() => {
    gridService = new GridService();
  });

  describe('generateCountryGrid', () => {
    it('should generate H3 cells for a simple polygon', () => {
      // Simple square polygon around Berlin
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [13.0, 52.3], // SW
          [13.8, 52.3], // SE
          [13.8, 52.7], // NE
          [13.0, 52.7], // NW
          [13.0, 52.3]  // Close polygon
        ]]
      };

      const cells = gridService.generateCountryGrid(boundary, 8);

      expect(cells).toBeDefined();
      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0]).toHaveProperty('index');
      expect(cells[0]).toHaveProperty('lat');
      expect(cells[0]).toHaveProperty('lng');
      expect(cells[0]).toHaveProperty('resolution');
      expect(cells[0].resolution).toBe(8);
    });

    it('should generate more cells for higher resolution', () => {
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [13.0, 52.3],
          [13.2, 52.3],
          [13.2, 52.5],
          [13.0, 52.5],
          [13.0, 52.3]
        ]]
      };

      const cellsRes7 = gridService.generateCountryGrid(boundary, 7);
      const cellsRes8 = gridService.generateCountryGrid(boundary, 8);

      expect(cellsRes8.length).toBeGreaterThan(cellsRes7.length);
    });

    it('should handle empty polygon gracefully', () => {
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[]]
      };

      const cells = gridService.generateCountryGrid(boundary, 8);
      expect(cells).toEqual([]);
    });

    it('should generate cells with valid coordinates', () => {
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [13.0, 52.3],
          [13.2, 52.3],
          [13.2, 52.5],
          [13.0, 52.5],
          [13.0, 52.3]
        ]]
      };

      const cells = gridService.generateCountryGrid(boundary, 8);

      cells.forEach(cell => {
        expect(cell.lat).toBeGreaterThanOrEqual(-90);
        expect(cell.lat).toBeLessThanOrEqual(90);
        expect(cell.lng).toBeGreaterThanOrEqual(-180);
        expect(cell.lng).toBeLessThanOrEqual(180);
        expect(cell.index).toBeTruthy();
        expect(typeof cell.index).toBe('string');
      });
    });
  });

  describe('getNeighbors', () => {
    it('should find neighbors within specified radius', () => {
      const centerCell: H3Cell = {
        index: '881f1d4993fffff',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      const neighbors = gridService.getNeighbors(centerCell, 5); // 5km radius

      expect(neighbors).toBeDefined();
      expect(Array.isArray(neighbors)).toBe(true);
      
      // Should have some neighbors within 5km
      expect(neighbors.length).toBeGreaterThan(0);
      
      // All neighbors should be different from center cell
      neighbors.forEach(neighbor => {
        expect(neighbor.index).not.toBe(centerCell.index);
        expect(neighbor.resolution).toBe(centerCell.resolution);
      });
    });

    it('should return empty array for zero radius', () => {
      const centerCell: H3Cell = {
        index: '881f1d4993fffff',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      const neighbors = gridService.getNeighbors(centerCell, 0);
      expect(neighbors).toEqual([]);
    });

    it('should find more neighbors for larger radius', () => {
      const centerCell: H3Cell = {
        index: '881f1d4993fffff',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      const neighbors1km = gridService.getNeighbors(centerCell, 1);
      const neighbors5km = gridService.getNeighbors(centerCell, 5);

      expect(neighbors5km.length).toBeGreaterThan(neighbors1km.length);
    });
  });

  describe('createWindows', () => {
    it('should create processing windows from cells', () => {
      // Create a grid of test cells
      const cells: H3Cell[] = [];
      for (let lat = 52.3; lat <= 52.7; lat += 0.1) {
        for (let lng = 13.0; lng <= 13.8; lng += 0.1) {
          cells.push({
            index: `test_${lat}_${lng}`,
            lat,
            lng,
            resolution: 8
          });
        }
      }

      const windows = gridService.createWindows(cells, 25, 5); // 25km windows, 5km buffer

      expect(windows).toBeDefined();
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.length).toBeGreaterThan(0);

      windows.forEach(window => {
        expect(window).toHaveProperty('id');
        expect(window).toHaveProperty('boundary');
        expect(window).toHaveProperty('bufferKm');
        expect(window).toHaveProperty('cells');
        expect(window.bufferKm).toBe(5);
        expect(Array.isArray(window.cells)).toBe(true);
      });
    });

    it('should return empty array for empty cells', () => {
      const windows = gridService.createWindows([], 25, 5);
      expect(windows).toEqual([]);
    });

    it('should include buffer in window boundaries', () => {
      // Create multiple cells to ensure window creation
      const cells: H3Cell[] = [
        { index: 'test1', lat: 52.5, lng: 13.4, resolution: 8 },
        { index: 'test2', lat: 52.51, lng: 13.41, resolution: 8 },
        { index: 'test3', lat: 52.52, lng: 13.42, resolution: 8 }
      ];

      const windows = gridService.createWindows(cells, 25, 5);
      expect(windows.length).toBeGreaterThan(0);

      const window = windows[0];
      // Buffer should extend beyond the cell boundaries
      expect(window.boundary.minLat).toBeLessThan(52.5);
      expect(window.boundary.maxLat).toBeGreaterThanOrEqual(52.52);
      expect(window.boundary.minLng).toBeLessThan(13.4);
      expect(window.boundary.maxLng).toBeGreaterThanOrEqual(13.42);
      expect(window.bufferKm).toBe(5);
    });
  });

  describe('validateGrid', () => {
    it('should validate grid coverage', () => {
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [13.0, 52.3],
          [13.2, 52.3],
          [13.2, 52.5],
          [13.0, 52.5],
          [13.0, 52.3]
        ]]
      };

      const cells = gridService.generateCountryGrid(boundary, 8);
      const validation = gridService.validateGrid(cells, boundary);

      expect(validation).toHaveProperty('coverage');
      expect(validation).toHaveProperty('gaps');
      expect(validation).toHaveProperty('overlaps');
      expect(validation.coverage).toBeGreaterThan(0);
      expect(validation.coverage).toBeLessThanOrEqual(1);
      expect(Array.isArray(validation.gaps)).toBe(true);
      expect(Array.isArray(validation.overlaps)).toBe(true);
    });

    it('should handle empty cells array', () => {
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [13.0, 52.3],
          [13.2, 52.3],
          [13.2, 52.5],
          [13.0, 52.5],
          [13.0, 52.3]
        ]]
      };

      const validation = gridService.validateGrid([], boundary);
      expect(validation.coverage).toBe(0);
    });
  });

  describe('h3ToLatLng and latLngToH3', () => {
    it('should convert between H3 index and coordinates', () => {
      const lat = 52.5;
      const lng = 13.4;
      const resolution = 8;

      const h3Index = gridService.latLngToH3(lat, lng, resolution);
      expect(typeof h3Index).toBe('string');
      expect(h3Index.length).toBeGreaterThan(0);

      const coords = gridService.h3ToLatLng(h3Index);
      expect(coords).toHaveProperty('lat');
      expect(coords).toHaveProperty('lng');
      
      // Should be close to original coordinates (within H3 cell precision)
      expect(Math.abs(coords.lat - lat)).toBeLessThan(0.01);
      expect(Math.abs(coords.lng - lng)).toBeLessThan(0.01);
    });

    it('should handle edge cases for coordinates', () => {
      // Test equator
      const equatorIndex = gridService.latLngToH3(0, 0, 8);
      const equatorCoords = gridService.h3ToLatLng(equatorIndex);
      expect(Math.abs(equatorCoords.lat)).toBeLessThan(1);
      expect(Math.abs(equatorCoords.lng)).toBeLessThan(1);

      // Test valid extreme coordinates
      const northIndex = gridService.latLngToH3(80, 0, 8);
      const northCoords = gridService.h3ToLatLng(northIndex);
      expect(northCoords.lat).toBeGreaterThan(75);
    });
  });

  describe('getCellsInBoundary', () => {
    it('should return same result as generateCountryGrid', () => {
      const boundary: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [13.0, 52.3],
          [13.2, 52.3],
          [13.2, 52.5],
          [13.0, 52.5],
          [13.0, 52.3]
        ]]
      };

      const cells1 = gridService.generateCountryGrid(boundary, 8);
      const cells2 = gridService.getCellsInBoundary(boundary, 8);

      expect(cells1).toEqual(cells2);
    });
  });

  describe('spatial indexing methods', () => {
    it('should find cells within radius', () => {
      const cells: H3Cell[] = [
        { index: 'cell1', lat: 52.5, lng: 13.4, resolution: 8 },
        { index: 'cell2', lat: 52.51, lng: 13.41, resolution: 8 }, // ~1.5km away
        { index: 'cell3', lat: 52.6, lng: 13.5, resolution: 8 },   // ~15km away
      ];

      const nearCells = gridService.findCellsWithinRadius(52.5, 13.4, 5, cells);
      
      expect(nearCells.length).toBe(2); // cell1 and cell2
      expect(nearCells.map(c => c.index)).toContain('cell1');
      expect(nearCells.map(c => c.index)).toContain('cell2');
      expect(nearCells.map(c => c.index)).not.toContain('cell3');
    });

    it('should calculate distance between cells', () => {
      const cell1: H3Cell = { index: 'cell1', lat: 52.5, lng: 13.4, resolution: 8 };
      const cell2: H3Cell = { index: 'cell2', lat: 52.51, lng: 13.41, resolution: 8 };

      const distance = gridService.calculateCellDistance(cell1, cell2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(5); // Should be a few km
    });

    it('should get H3 distance between cells', () => {
      const cell1: H3Cell = { index: 'cell1', lat: 52.5, lng: 13.4, resolution: 8 };
      const cell2: H3Cell = { index: 'cell2', lat: 52.51, lng: 13.41, resolution: 8 };

      const h3Distance = gridService.getH3Distance(cell1, cell2);
      
      expect(h3Distance).toBeGreaterThanOrEqual(0);
      expect(typeof h3Distance).toBe('number');
    });
  });
});