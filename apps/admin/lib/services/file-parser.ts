import * as XLSX from 'xlsx';
import { FileParsingError, ERROR_CODES } from '../errors/upload-errors';
import { ParseResult, HEADER_SYNONYMS, HeaderSynonym } from '../types/store-upload';

export class FileParserService {
  /**
   * Parse Excel file (.xlsx, .xls)
   */
  async parseExcel(buffer: Buffer): Promise<ParseResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new FileParsingError('No worksheets found in Excel file');
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      }) as any[][];
      
      if (rawData.length === 0) {
        throw new FileParsingError('Excel file is empty');
      }
      
      // Extract headers and data rows
      const headers = this.extractHeaders(rawData[0]);
      const rows = rawData.slice(1).filter(row => 
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );
      
      return {
        headers,
        rows,
        totalRows: rows.length
      };
    } catch (error) {
      if (error instanceof FileParsingError) {
        throw error;
      }
      throw new FileParsingError(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Parse CSV file
   */
  async parseCSV(buffer: Buffer): Promise<ParseResult> {
    try {
      // Try different encodings
      let csvText: string;
      try {
        csvText = buffer.toString('utf8');
      } catch {
        try {
          csvText = buffer.toString('latin1');
        } catch {
          csvText = buffer.toString('ascii');
        }
      }
      
      if (!csvText.trim()) {
        throw new FileParsingError('CSV file is empty');
      }
      
      // Parse CSV manually to handle various formats
      const lines = this.parseCSVLines(csvText);
      
      if (lines.length === 0) {
        throw new FileParsingError('No valid data found in CSV file');
      }
      
      // Extract headers and data rows
      const headers = this.extractHeaders(lines[0]);
      const rows = lines.slice(1).filter(row => 
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );
      
      return {
        headers,
        rows,
        totalRows: rows.length
      };
    } catch (error) {
      if (error instanceof FileParsingError) {
        throw error;
      }
      throw new FileParsingError(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Parse CSV lines handling various delimiters and quoted fields
   */
  private parseCSVLines(csvText: string): string[][] {
    const lines: string[][] = [];
    const rows = csvText.split(/\r?\n/);
    
    for (const row of rows) {
      if (!row.trim()) continue;
      
      // Try different delimiters
      let fields: string[];
      if (row.includes(',')) {
        fields = this.parseCSVRow(row, ',');
      } else if (row.includes(';')) {
        fields = this.parseCSVRow(row, ';');
      } else if (row.includes('\t')) {
        fields = this.parseCSVRow(row, '\t');
      } else {
        // Single column
        fields = [row.trim()];
      }
      
      lines.push(fields);
    }
    
    return lines;
  }

  /**
   * Parse a single CSV row with proper quote handling
   */
  private parseCSVRow(row: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < row.length) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    fields.push(current.trim());
    
    return fields;
  }

  /**
   * Extract and clean headers
   */
  private extractHeaders(headerRow: any[]): string[] {
    return headerRow.map(header => {
      if (header === null || header === undefined) return '';
      return String(header).trim();
    }).filter(header => header !== '');
  }

  /**
   * Detect headers from the first row
   */
  detectHeaders(rows: any[][]): string[] {
    if (rows.length === 0) return [];
    return this.extractHeaders(rows[0]);
  }

  /**
   * Suggest column mapping based on header names
   */
  suggestMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    for (const header of headers) {
      const normalizedHeader = this.normalizeHeaderName(header);
      const suggestion = this.findBestMatch(normalizedHeader);
      
      if (suggestion) {
        mapping[suggestion] = header;
      }
    }
    
    return mapping;
  }

  /**
   * Normalize header name for matching
   */
  private normalizeHeaderName(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/[_\s-]+/g, '_')
      .replace(/[^\w]/g, '');
  }

  /**
   * Find the best matching field for a header
   */
  private findBestMatch(normalizedHeader: string): HeaderSynonym | null {
    // Direct match first
    for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      const normalizedSynonyms = synonyms.map(s => this.normalizeHeaderName(s));
      if (normalizedSynonyms.includes(normalizedHeader)) {
        return field as HeaderSynonym;
      }
    }
    
    // Partial match
    for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      const normalizedSynonyms = synonyms.map(s => this.normalizeHeaderName(s));
      for (const synonym of normalizedSynonyms) {
        if (normalizedHeader.includes(synonym) || synonym.includes(normalizedHeader)) {
          return field as HeaderSynonym;
        }
      }
    }
    
    return null;
  }

  /**
   * Validate file format and size
   */
  validateFile(file: File, maxSizeMB: number): void {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new FileParsingError(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum limit of ${maxSizeMB}MB`,
        ERROR_CODES.FILE_TOO_LARGE
      );
    }
    
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidType && !hasValidExtension) {
      throw new FileParsingError(
        'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only.',
        ERROR_CODES.INVALID_FILE_TYPE
      );
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get sample rows for preview
   */
  getSampleRows(rows: any[][], maxRows: number = 10): any[][] {
    return rows.slice(0, maxRows);
  }
}