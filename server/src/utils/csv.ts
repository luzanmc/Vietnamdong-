export interface CsvColumn {
  key: string;
  label: string;
}

export function toCsv(
  rows: Array<Record<string, any>>,
  columns: (string | CsvColumn)[],
  truncated = false
): string {
  const colKeys = columns.map((c) => (typeof c === 'string' ? c : c.key));
  const colHeaders = columns.map((c) => (typeof c === 'string' ? c : c.label));

  const escapeCell = (value: unknown): string => {
    let str = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = colHeaders.map(escapeCell).join(',');
  const dataLines = rows.map((row) =>
    colKeys.map((key) => escapeCell(row[key])).join(',')
  );

  const lines = [headerLine, ...dataLines];
  if (truncated) {
    lines.push(escapeCell('CANH BAO: Du lieu dat gioi han toi da 100.000 dong va da bi cat bot'));
  }

  return '\uFEFF' + lines.join('\r\n');
}
