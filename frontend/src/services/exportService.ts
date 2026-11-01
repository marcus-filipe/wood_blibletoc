import * as XLSX from 'xlsx';

/**
 * Trigger download of UTF-8 CSV with BOM for full compatibility with MS Excel in Portuguese
 */
export function downloadCSV(filename: string, data: Record<string, unknown>[]): void {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(';')
    )
  ];

  // UTF-8 BOM: \uFEFF
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of real .xlsx workbook via SheetJS
 */
export function downloadXLSX(
  filename: string,
  sheetName: string,
  data: Record<string, unknown>[]
): void {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  const validFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, validFilename);
}
