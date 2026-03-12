export type ExportColumn<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function normalizeCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function escapeCsvCell(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) =>
      escapeCsvCell(normalizeCellValue(column.value(row)))
    ).join(",")
  ).join("\n");
  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8",
  });

  triggerDownload(filename, blob);
}

export function downloadJson<T>(filename: string, rows: T[]) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  triggerDownload(filename, blob);
}

function buildTabularHtml<T>(
  title: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const tableHead = columns.map((column) =>
    `<th>${escapeHtml(column.label)}</th>`
  ).join("");
  const tableBody = rows.map((row) =>
    `<tr>${
      columns.map((column) =>
        `<td>${escapeHtml(normalizeCellValue(column.value(row)))}</td>`
      ).join("")
    }</tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 24px;
        color: #111827;
      }
      h1 {
        font-size: 20px;
        margin-bottom: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 8px 10px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        background: #f3f4f6;
        font-weight: 700;
      }
      @media print {
        body {
          margin: 12px;
        }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <table>
      <thead>
        <tr>${tableHead}</tr>
      </thead>
      <tbody>
        ${tableBody}
      </tbody>
    </table>
  </body>
</html>`;
}

export function downloadExcelHtml<T>(
  filename: string,
  title: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const blob = new Blob([buildTabularHtml(title, rows, columns)], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  triggerDownload(filename, blob);
}

export function openPrintTable<T>(
  title: string,
  rows: T[],
  columns: ExportColumn<T>[],
) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(buildTabularHtml(title, rows, columns));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
