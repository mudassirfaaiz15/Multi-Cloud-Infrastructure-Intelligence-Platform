/**
 * CSV export utility
 * Converts any array of objects into a downloadable CSV file.
 */

type Row = Record<string, string | number | boolean | null | undefined>;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(rows: Row[], filename: string, title?: string): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [];

  // Optional title row
  if (title) {
    csvLines.push(escapeCell(title));
    csvLines.push(`Exported: ${new Date().toLocaleString()}`);
    csvLines.push('');
  }

  // Header row
  csvLines.push(headers.map(escapeCell).join(','));

  // Data rows
  for (const row of rows) {
    csvLines.push(headers.map(h => escapeCell(row[h])).join(','));
  }

  const csv = csvLines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9-_]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Format a number as currency for CSV cells */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Export button component */
import { Download } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ExportButtonProps {
  data: Row[];
  filename: string;
  title?: string;
  label?: string;
  size?: 'sm' | 'default';
}

export function ExportButton({ data, filename, title, label = 'Export CSV', size = 'sm' }: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => exportToCSV(data, filename, title)}
      className="gap-2"
      id={`export-${filename}`}
    >
      <Download className="w-4 h-4" />
      {label}
    </Button>
  );
}
