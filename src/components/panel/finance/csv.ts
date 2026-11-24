import type { LedgerEntryItem } from './types';

/**
 * Celda CSV segura: escapa comillas y neutraliza fórmulas (=, +, -, @, tab) para que
 * una descripción maliciosa no se ejecute al abrir el archivo en Excel o Sheets.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildLedgerCsv(entries: LedgerEntryItem[]): string {
  const header = 'Fecha,Tipo,Categoria,Descripcion,MetodoPago,MontoCOP';
  const rows = entries.map((e) => {
    const signed = e.entryType === 'EXPENSE' ? -e.amountCop : e.amountCop;
    return [e.businessDate, e.entryType, e.categoryLabel, e.title, e.paymentMethod]
      .map(csvCell)
      .concat(String(signed))
      .join(',');
  });
  return [header, ...rows].join('\n');
}

export function downloadCsv(content: string, fileName: string) {
  // BOM para que Excel reconozca tildes y eñes en UTF-8
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
