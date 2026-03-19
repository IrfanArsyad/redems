import { ipcMain, dialog } from 'electron'
import { writeFile } from 'fs/promises'

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:table-data',
    async (_e, content: string, defaultName: string, format: 'csv' | 'json') => {
      const filters =
        format === 'csv'
          ? [{ name: 'CSV', extensions: ['csv'] }]
          : [{ name: 'JSON', extensions: ['json'] }]

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Table Data',
        defaultPath: defaultName,
        filters
      })

      if (canceled || !filePath) return ''

      await writeFile(filePath, content, 'utf-8')
      return filePath
    }
  )
}
