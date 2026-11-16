import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { dataLogger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CsvRow = Record<string, string>;
export type ExcelRow = Record<string, string | number | boolean | null>;

// ─── Path Helper ──────────────────────────────────────────────────────────────

/**
 * Resolve a file path relative to the project's test-data directory.
 * Accepts absolute paths too.
 */
function resolveDataPath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(process.cwd(), 'test-data', filePath);
}

// ─── CSV Reader ───────────────────────────────────────────────────────────────

/**
 * Read a CSV file and return an array of typed row objects.
 *
 * @param filePath - Relative to test-data/ or absolute path
 * @param options  - Optional csv-parse options
 *
 * @example
 * const users = readCsv<{ username: string; password: string }>('users.csv');
 * users.forEach(u => console.log(u.username));
 */
export function readCsv<T extends CsvRow = CsvRow>(
  filePath: string,
  options: {
    delimiter?: string;
    skipEmptyLines?: boolean;
    trimValues?: boolean;
  } = {}
): T[] {
  const resolved = resolveDataPath(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`CSV file not found: ${resolved}`);
  }

  const { delimiter = ',', skipEmptyLines = true, trimValues = true } = options;

  const content = fs.readFileSync(resolved, 'utf-8');

  const rows = parse(content, {
    columns: true,               // Use first row as header keys
    delimiter,
    skip_empty_lines: skipEmptyLines,
    trim: trimValues,
    cast: false,                 // Keep all values as strings
  }) as T[];

  dataLogger.info(`CSV loaded: ${path.basename(filePath)} (${rows.length} rows)`);
  return rows;
}

// ─── Excel Reader ─────────────────────────────────────────────────────────────

/**
 * Read an Excel (.xlsx / .xls) file and return rows from the specified sheet.
 * Returns first sheet if sheetName is omitted.
 *
 * @param filePath  - Relative to test-data/ or absolute path
 * @param sheetName - Sheet name or index (default: first sheet)
 *
 * @example
 * const employees = readExcel<{ firstName: string; lastName: string }>('employees.xlsx', 'Sheet1');
 */
export function readExcel<T extends ExcelRow = ExcelRow>(
  filePath: string,
  sheetName?: string | number
): T[] {
  const resolved = resolveDataPath(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Excel file not found: ${resolved}`);
  }

  const workbook = XLSX.readFile(resolved);

  // Resolve sheet
  const sheet = sheetName !== undefined
    ? typeof sheetName === 'number'
      ? workbook.Sheets[workbook.SheetNames[sheetName]]
      : workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]];

  const targetSheet = sheetName !== undefined
    ? (typeof sheetName === 'string' ? sheetName : workbook.SheetNames[sheetName])
    : workbook.SheetNames[0];

  if (!sheet) {
    throw new Error(
      `Sheet "${targetSheet}" not found in ${path.basename(filePath)}. ` +
      `Available sheets: ${workbook.SheetNames.join(', ')}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<T>(sheet, {
    defval: null,     // Return null for empty cells
    raw: false,       // Return formatted strings, not raw values
  });

  dataLogger.info(
    `Excel loaded: ${path.basename(filePath)} → sheet "${targetSheet}" (${rows.length} rows)`
  );

  return rows;
}

// ─── JSON Reader ──────────────────────────────────────────────────────────────

/**
 * Read a JSON file and return its parsed contents.
 *
 * @param filePath - Relative to test-data/ or absolute path
 *
 * @example
 * const users = readJson<{ username: string; password: string }[]>('users.json');
 */
export function readJson<T = unknown>(filePath: string): T {
  const resolved = resolveDataPath(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`JSON file not found: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');

  try {
    const data = JSON.parse(content) as T;
    dataLogger.info(`JSON loaded: ${path.basename(filePath)}`);
    return data;
  } catch (err) {
    throw new Error(`Invalid JSON in ${resolved}: ${String(err)}`);
  }
}

// ─── Sheet Inspector ──────────────────────────────────────────────────────────

/**
 * List all sheet names in an Excel file.
 */
export function getExcelSheetNames(filePath: string): string[] {
  const resolved = resolveDataPath(filePath);
  const workbook = XLSX.readFile(resolved);
  return workbook.SheetNames;
}
