import * as XLSX from 'xlsx';
import { SchoolRow } from './gemini';

export function rowsToExcelBase64(rows: SchoolRow[]): string {
  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 8 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 30 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 30 },
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 8 },
    { wch: 8 },
    { wch: 50 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Schools');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return buffer.toString('base64');
}
