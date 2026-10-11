export function toCsv(rows: Array<Record<string, any>>, columns: string[]): string {
  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escape((row as Record<string, any>)[col])).join(','));
  return [header, ...lines].join('\n');
}
