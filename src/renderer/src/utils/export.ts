function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportAsCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

export function exportAsJSON(data: Record<string, unknown>[]): string {
  return JSON.stringify(data, null, 2)
}

export async function saveExport(
  content: string,
  defaultName: string,
  format: 'csv' | 'json'
): Promise<string> {
  return window.api.invoke('export:table-data', content, defaultName, format)
}
