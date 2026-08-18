// Module dùng chung: parse dữ liệu dạng bảng (copy từ Excel/Google Sheets = TSV, hoặc CSV) sang JSON.
// Được dùng bởi cả tool độc lập "Table → JSON" lẫn chế độ nhập inline trong Batch API Runner.

export type TableParseOptions = {
  hasHeader?: boolean;              // Dòng đầu là tiêu đề cột? (mặc định true)
  delimiter?: string | 'auto';     // Ký tự phân tách; 'auto' tự nhận diện (mặc định 'auto')
  inferTypes?: boolean;            // Tự suy luận number/boolean/null (mặc định true)
  trimValues?: boolean;           // Cắt khoảng trắng thừa (mặc định true)
};

export type TableParseResult = {
  headers: string[];
  rows: Record<string, any>[];
  delimiter: string;
};

// Tự nhận diện ký tự phân tách dựa trên dòng đầu tiên
const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes(',')) return ',';
  return '\t';
};

// Parse text thành ma trận 2 chiều, có xử lý ô được bao trong dấu nháy kép
// (Excel bao ô chứa xuống dòng / dấu phân tách bằng "..."; "" là escape của ")
const parseMatrix = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const n = text.length;

  for (let i = 0; i < n; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === delimiter) { row.push(field); field = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++; // gộp CRLF
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }

  row.push(field);
  rows.push(row);

  // Bỏ dòng rỗng ở cuối (do text kết thúc bằng ký tự xuống dòng)
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  return rows;
};

// Suy luận kiểu dữ liệu cho một ô
const inferValue = (raw: string): any => {
  if (raw === '') return null;
  const lower = raw.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;

  // Số nguyên: giữ nguyên chuỗi nếu có số 0 đứng đầu (vd mã "007", SĐT) hoặc vượt quá số nguyên an toàn
  if (/^-?\d+$/.test(raw)) {
    if (raw.length > 1 && (raw.startsWith('0') || raw.startsWith('-0'))) return raw;
    const num = Number(raw);
    return Number.isSafeInteger(num) ? num : raw;
  }
  // Số thập phân
  if (/^-?\d*\.\d+$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return raw;
};

// Đảm bảo tên cột không rỗng và không trùng nhau
const normalizeHeaders = (rawHeaders: string[], trimValues: boolean): string[] => {
  const seen = new Map<string, number>();
  return rawHeaders.map((h, idx) => {
    let key = trimValues ? h.trim() : h;
    if (!key) key = `col${idx + 1}`;
    if (seen.has(key)) {
      const count = (seen.get(key) || 0) + 1;
      seen.set(key, count);
      return `${key}_${count}`;
    }
    seen.set(key, 0);
    return key;
  });
};

// Hàm chính: chuyển text dạng bảng -> danh sách object
export function parseTableToJson(text: string, options: TableParseOptions = {}): TableParseResult {
  const { hasHeader = true, inferTypes = true, trimValues = true } = options;

  if (!text || !text.trim()) return { headers: [], rows: [], delimiter: '\t' };

  const delimiter =
    !options.delimiter || options.delimiter === 'auto' ? detectDelimiter(text) : options.delimiter;

  const matrix = parseMatrix(text, delimiter);
  if (matrix.length === 0) return { headers: [], rows: [], delimiter };

  let headers: string[];
  let dataRows: string[][];

  if (hasHeader) {
    headers = normalizeHeaders(matrix[0], trimValues);
    dataRows = matrix.slice(1);
  } else {
    const colCount = Math.max(...matrix.map((r) => r.length));
    headers = Array.from({ length: colCount }, (_, idx) => `col${idx + 1}`);
    dataRows = matrix;
  }

  const rows = dataRows.map((cols) => {
    const obj: Record<string, any> = {};
    headers.forEach((key, idx) => {
      let cell = cols[idx] ?? '';
      if (trimValues) cell = cell.trim();
      obj[key] = inferTypes ? inferValue(cell) : cell;
    });
    return obj;
  });

  return { headers, rows, delimiter };
}
